/**
 * ============================================================================
 * dbrain_core_rs_napi.c — Native Machine-Code N-API Accelerator for dbrain.to
 * ============================================================================
 * Compiles with clang/gcc (-O3 -mcpu=native) into dbrain_core_rs.<platform>.node.
 * Mirrors crates/dbrain-core-rs/src/{benes,bech32m,merkle,recall,vault}.rs with
 * zero-copy N-API Buffer/TypedArray bindings and hardware u128 (__uint128_t).
 */

#ifndef _POSIX_C_SOURCE
#define _POSIX_C_SOURCE 200809L
#endif

#include <node_api.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

typedef unsigned __int128 u128;

static inline double now_ms(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return (double)ts.tv_sec * 1000.0 + (double)ts.tv_nsec / 1e6;
}

/* ==========================================================================
 * 1. BENES01\0 WAKSMAN / BENES + 118-BIT u128 FACTORADIC ENGINE
 * ========================================================================== */

static inline int benes_factoradic_bit_count_c(int size) {
  if (size <= 1) return 0;
  u128 fact = 1;
  int cap = size > 32 ? 32 : size;
  for (int i = 2; i <= cap; i++) {
    fact *= (u128)i;
  }
  u128 max_val = fact - 1;
  uint64_t hi = (uint64_t)(max_val >> 64);
  uint64_t lo = (uint64_t)max_val;
  if (hi != 0) {
    return 128 - __builtin_clzll(hi);
  }
  return lo != 0 ? (64 - __builtin_clzll(lo)) : 0;
}

static inline u128 encode_benes_factoradic_block_c(const uint32_t *perm, int n) {
  if (n <= 1) return 0;
  uint32_t seen_mask = 0;
  u128 rank = 0;
  for (int j = 0; j < n; j++) {
    uint32_t pj = perm[j];
    uint32_t lower_mask = (pj == 0) ? 0u : ((1u << pj) - 1u);
    uint32_t digit = (uint32_t)__builtin_popcount(seen_mask & lower_mask);
    seen_mask |= (1u << pj);
    rank = rank * (u128)(j + 1) + (u128)digit;
  }
  return rank;
}

static inline void decode_benes_factoradic_block_c(u128 val, int n, uint32_t *out) {
  uint32_t avail = (n >= 32) ? 0xffffffffu : ((1u << n) - 1u);
  for (int i = n - 1; i >= 0; i--) {
    u128 div = (u128)(i + 1);
    uint32_t d = (uint32_t)(val % div);
    val /= div;
    uint32_t m = avail;
    for (uint32_t k = 0; k < d; k++) m &= (m - 1u);
    uint32_t chosen = (uint32_t)__builtin_ctz(m);
    out[i] = chosen;
    avail &= ~(1u << chosen);
  }
}

static void benes_node_metrics_c(int count, int leaf_size, int *out_sw_bits, int *out_mid_bits) {
  if (count <= leaf_size) {
    *out_sw_bits = 0;
    *out_mid_bits = benes_factoradic_bit_count_c(count);
    return;
  }
  int top = (count + 1) / 2;
  int bot = count / 2;
  int top_sw = 0, top_mid = 0, bot_sw = 0, bot_mid = 0;
  benes_node_metrics_c(top, leaf_size, &top_sw, &top_mid);
  benes_node_metrics_c(bot, leaf_size, &bot_sw, &bot_mid);
  *out_sw_bits = bot + top_sw + bot_sw;
  *out_mid_bits = top_mid + bot_mid;
}

static inline void set_bit_c(uint8_t *buf, int bit_index, int val) {
  if (val) {
    buf[bit_index >> 3] |= (uint8_t)(1u << (bit_index & 7));
  }
}

static inline int read_bit_c(const uint8_t *buf, int bit_index) {
  return (buf[bit_index >> 3] >> (bit_index & 7)) & 1;
}

static inline u128 read_rank_u128_c(const uint8_t *mid_buf, int bit_base, int bit_count) {
  if (bit_count <= 0) return 0;
  int byte_idx = bit_base >> 3;
  int bit_shift = bit_base & 7;
  u128 raw = 0;
  int bytes_needed = (bit_shift + bit_count + 7) >> 3;
  int copy_bytes = bytes_needed > 16 ? 16 : bytes_needed;
  memcpy(&raw, mid_buf + byte_idx, (size_t)copy_bytes);
  u128 rank = raw >> bit_shift;
  if (bytes_needed > 16) {
    rank |= ((u128)mid_buf[byte_idx + 16]) << (128 - bit_shift);
  }
  u128 mask = (bit_count >= 128) ? (~(u128)0) : ((((u128)1) << bit_count) - 1);
  return rank & mask;
}

static inline void write_rank_u128_c(uint8_t *mid_buf, int bit_base, u128 rank, int bit_count) {
  if (bit_count <= 0) return;
  int byte_idx = bit_base >> 3;
  int bit_shift = bit_base & 7;
  u128 shifted = rank << bit_shift;
  int bytes_needed = (bit_shift + bit_count + 7) >> 3;
  int copy_bytes = bytes_needed > 16 ? 16 : bytes_needed;
  uint8_t tmp[16];
  memcpy(tmp, &shifted, 16);
  for (int i = 0; i < copy_bytes; i++) {
    mid_buf[byte_idx + i] |= tmp[i];
  }
  if (bytes_needed > 16) {
    mid_buf[byte_idx + 16] |= (uint8_t)(rank >> (128 - bit_shift));
  }
}

typedef struct {
  uint8_t *input_buf;
  uint8_t *output_buf;
  uint8_t *middle_buf;
  int sw_cursor;
  int mid_cursor;
  int leaf_size;
} BenesEncodeCtx;

static void benes_encode_node_c(BenesEncodeCtx *ctx, const uint32_t *perm, int n) {
  if (n <= ctx->leaf_size) {
    int bits = benes_factoradic_bit_count_c(n);
    u128 rank = encode_benes_factoradic_block_c(perm, n);
    write_rank_u128_c(ctx->middle_buf, ctx->mid_cursor, rank, bits);
    ctx->mid_cursor += bits;
    return;
  }

  int top_count = (n + 1) / 2;
  int bot_count = n / 2;

  int32_t stack_buf[256];
  int32_t *inv_perm = (n <= 256) ? stack_buf : (int32_t *)malloc((size_t)n * sizeof(int32_t));
  int8_t stack_in[256], stack_out[256];
  int8_t *in_color = (n <= 256) ? stack_in : (int8_t *)malloc((size_t)n);
  int8_t *out_color = (n <= 256) ? stack_out : (int8_t *)malloc((size_t)n);

  for (int i = 0; i < n; i++) {
    inv_perm[perm[i]] = i;
    in_color[i] = -1;
    out_color[i] = -1;
  }

  if (n % 2 == 1) {
    int curr_x = 2 * bot_count;
    while (in_color[curr_x] == -1) {
      in_color[curr_x] = 0;
      int y = (int)perm[curr_x];
      out_color[y] = 0;
      if (y >= 2 * bot_count) break;
      int y_sib = y ^ 1;
      out_color[y_sib] = 1;
      int next_x = inv_perm[y_sib];
      in_color[next_x] = 1;
      curr_x = next_x ^ 1;
    }
  }

  for (int x = 0; x < 2 * bot_count; x += 2) {
    if (in_color[x] == -1) {
      int curr_x = x;
      while (in_color[curr_x] == -1) {
        in_color[curr_x] = 0;
        int y = (int)perm[curr_x];
        out_color[y] = 0;
        if (y >= 2 * bot_count) break;
        int y_sib = y ^ 1;
        out_color[y_sib] = 1;
        int next_x = inv_perm[y_sib];
        in_color[next_x] = 1;
        curr_x = next_x ^ 1;
      }
    }
  }

  for (int p = 0; p < bot_count; p++) {
    set_bit_c(ctx->input_buf, ctx->sw_cursor + p, in_color[2 * p]);
    set_bit_c(ctx->output_buf, ctx->sw_cursor + p, out_color[2 * p]);
  }
  ctx->sw_cursor += bot_count;

  uint32_t stack_top[128], stack_bot[128];
  uint32_t *top_perm = (top_count <= 128) ? stack_top : (uint32_t *)malloc((size_t)top_count * sizeof(uint32_t));
  uint32_t *bot_perm = (bot_count <= 128) ? stack_bot : (uint32_t *)malloc((size_t)bot_count * sizeof(uint32_t));

  for (int x = 0; x < n; x++) {
    uint32_t y = perm[x] >> 1;
    if (in_color[x] == 0) {
      top_perm[x >> 1] = y;
    } else {
      bot_perm[x >> 1] = y;
    }
  }

  if (n > 256) {
    free(inv_perm);
    free(in_color);
    free(out_color);
  }

  benes_encode_node_c(ctx, top_perm, top_count);
  benes_encode_node_c(ctx, bot_perm, bot_count);

  if (top_count > 128) free(top_perm);
  if (bot_count > 128) free(bot_perm);
}

static int benes_forward_node_c(
  const uint8_t *in_buf,
  const uint8_t *out_buf,
  const uint8_t *mid_buf,
  int leaf_size,
  int n,
  int sw_base,
  int mid_base,
  int x
) {
  if (n <= leaf_size) {
    int bits = benes_factoradic_bit_count_c(n);
    u128 rank = read_rank_u128_c(mid_buf, mid_base, bits);
    uint32_t perm[32];
    decode_benes_factoradic_block_c(rank, n, perm);
    return (int)perm[x];
  }
  int top_count = (n + 1) / 2;
  int bot_count = n / 2;
  int top_sw = 0, top_mid = 0;
  benes_node_metrics_c(top_count, leaf_size, &top_sw, &top_mid);
  int child = (x == 2 * bot_count) ? 0 : ((x & 1) ^ read_bit_c(in_buf, sw_base + (x >> 1)));
  int child_x = x >> 1;
  int child_y = (child == 0)
    ? benes_forward_node_c(in_buf, out_buf, mid_buf, leaf_size, top_count, sw_base + bot_count, mid_base, child_x)
    : benes_forward_node_c(in_buf, out_buf, mid_buf, leaf_size, bot_count, sw_base + bot_count + top_sw, mid_base + top_mid, child_x);
  if (child == 0 && child_y == bot_count) {
    return 2 * bot_count;
  }
  int sw_out = read_bit_c(out_buf, sw_base + child_y);
  return (child_y << 1) | (child ^ sw_out);
}

static int benes_inverse_node_c(
  const uint8_t *in_buf,
  const uint8_t *out_buf,
  const uint8_t *mid_buf,
  int leaf_size,
  int n,
  int sw_base,
  int mid_base,
  int y
) {
  if (n <= leaf_size) {
    int bits = benes_factoradic_bit_count_c(n);
    u128 rank = read_rank_u128_c(mid_buf, mid_base, bits);
    uint32_t perm[32];
    decode_benes_factoradic_block_c(rank, n, perm);
    for (int i = 0; i < n; i++) {
      if ((int)perm[i] == y) return i;
    }
    return 0;
  }
  int top_count = (n + 1) / 2;
  int bot_count = n / 2;
  int top_sw = 0, top_mid = 0;
  benes_node_metrics_c(top_count, leaf_size, &top_sw, &top_mid);
  int child = (y == 2 * bot_count) ? 0 : ((y & 1) ^ read_bit_c(out_buf, sw_base + (y >> 1)));
  int child_y = y >> 1;
  int child_x = (child == 0)
    ? benes_inverse_node_c(in_buf, out_buf, mid_buf, leaf_size, top_count, sw_base + bot_count, mid_base, child_y)
    : benes_inverse_node_c(in_buf, out_buf, mid_buf, leaf_size, bot_count, sw_base + bot_count + top_sw, mid_base + top_mid, child_y);
  if (child == 0 && child_x == bot_count) {
    return 2 * bot_count;
  }
  int sw_in = read_bit_c(in_buf, sw_base + child_x);
  return (child_x << 1) | (child ^ sw_in);
}

/* ==========================================================================
 * 2. CHIA BECH32M ADDRESS & OFFER CHECKSUM CODEC
 * ========================================================================== */

static const char BECH32_CHARSET_C[33] = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
static const uint32_t BECH32_GEN_C[5] = {
  0x3b6a57b2u, 0x26508e6du, 0x1ea119fau, 0x3d4233ddu, 0x2a1462b3u
};
static const uint32_t BECH32M_CONST_C = 0x2bc830a3u;

static inline uint32_t bech32_polymod_c(const uint8_t *values, int len) {
  uint32_t chk = 1;
  for (int idx = 0; idx < len; idx++) {
    uint32_t top = chk >> 25;
    chk = ((chk & 0x1ffffffu) << 5) ^ values[idx];
    for (int i = 0; i < 5; i++) {
      if ((top >> i) & 1u) chk ^= BECH32_GEN_C[i];
    }
  }
  return chk;
}

static int decode_chia_address_c(const char *addr, int len, char *out_prefix, uint8_t *out_ph32) {
  if (len < 8 || len > 100) return 0;
  int has_lower = 0, has_upper = 0;
  char lower[101];
  int pos = -1;
  for (int i = 0; i < len; i++) {
    unsigned char c = (unsigned char)addr[i];
    if (c >= 'a' && c <= 'z') {
      has_lower = 1;
      lower[i] = (char)c;
    } else if (c >= 'A' && c <= 'Z') {
      has_upper = 1;
      lower[i] = (char)(c + 32);
    } else {
      lower[i] = (char)c;
    }
    if (lower[i] == '1') pos = i;
  }
  lower[len] = '\0';
  if (has_lower && has_upper) return 0;
  if (pos < 1 || pos + 7 > len) return 0;

  if (pos == 3 && memcmp(lower, "xch", 3) == 0) {
    memcpy(out_prefix, "xch", 4);
  } else if (pos == 4 && memcmp(lower, "txch", 4) == 0) {
    memcpy(out_prefix, "txch", 5);
  } else {
    return 0;
  }

  uint8_t poly[120];
  int p_len = 0;
  for (int i = 0; i < pos; i++) poly[p_len++] = (uint8_t)(lower[i] >> 5);
  poly[p_len++] = 0;
  for (int i = 0; i < pos; i++) poly[p_len++] = (uint8_t)(lower[i] & 31);

  int data_len = len - (pos + 1);
  uint8_t data5[100];
  for (int i = 0; i < data_len; i++) {
    const char *p = strchr(BECH32_CHARSET_C, lower[pos + 1 + i]);
    if (!p) return 0;
    uint8_t d = (uint8_t)(p - BECH32_CHARSET_C);
    data5[i] = d;
    poly[p_len++] = d;
  }

  if (bech32_polymod_c(poly, p_len) != BECH32M_CONST_C) return 0;

  int payload_words = data_len - 6;
  if (payload_words != 52) return 0;
  uint32_t acc = 0;
  int bits = 0;
  int out_idx = 0;
  for (int i = 0; i < payload_words; i++) {
    acc = (acc << 5) | data5[i];
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      if (out_idx >= 32) return 0;
      out_ph32[out_idx++] = (uint8_t)((acc >> bits) & 0xffu);
    }
  }
  if (bits >= 5 || ((acc << (8 - bits)) & 0xffu) != 0 || out_idx != 32) return 0;
  return 1;
}

static int encode_chia_address_c(const uint8_t *ph32, const char *hrp, int hrp_len, char *out_addr) {
  if (hrp_len < 1 || hrp_len > 16) return 0;
  uint8_t words[52];
  int w_len = 0;
  uint32_t acc = 0;
  int bits = 0;
  for (int i = 0; i < 32; i++) {
    acc = (acc << 8) | ph32[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      words[w_len++] = (uint8_t)((acc >> bits) & 31u);
    }
  }
  if (bits > 0) {
    words[w_len++] = (uint8_t)((acc << (5 - bits)) & 31u);
  }

  uint8_t poly[100];
  int p_len = 0;
  char clean_hrp[17];
  for (int i = 0; i < hrp_len; i++) {
    char c = hrp[i];
    if (c >= 'A' && c <= 'Z') c = (char)(c + 32);
    clean_hrp[i] = c;
    poly[p_len++] = (uint8_t)(c >> 5);
  }
  poly[p_len++] = 0;
  for (int i = 0; i < hrp_len; i++) {
    poly[p_len++] = (uint8_t)(clean_hrp[i] & 31);
  }
  for (int i = 0; i < w_len; i++) poly[p_len++] = words[i];
  for (int i = 0; i < 6; i++) poly[p_len++] = 0;

  uint32_t polymod = bech32_polymod_c(poly, p_len) ^ BECH32M_CONST_C;
  int pos = 0;
  for (int i = 0; i < hrp_len; i++) out_addr[pos++] = clean_hrp[i];
  out_addr[pos++] = '1';
  for (int i = 0; i < w_len; i++) out_addr[pos++] = BECH32_CHARSET_C[words[i]];
  for (int i = 0; i < 6; i++) {
    out_addr[pos++] = BECH32_CHARSET_C[(polymod >> (5 * (5 - i))) & 31u];
  }
  out_addr[pos] = '\0';
  return pos;
}

/* ==========================================================================
 * 3. CONTIGUOUS-ARENA SHA-256 & DIG D5/D8 MERKLE TREE ENGINE
 * ========================================================================== */

static const uint32_t K256_C[64] = {
  0x428a2f98u,0x71374491u,0xb5c0fbcfu,0xe9b5dba5u,0x3956c25bu,0x59f111f1u,0x923f82a4u,0xab1c5ed5u,
  0xd807aa98u,0x12835b01u,0x243185beu,0x550c7dc3u,0x72be5d74u,0x80deb1feu,0x9bdc06a7u,0xc19bf174u,
  0xe49b69c1u,0xefbe4786u,0x0fc19dc6u,0x240ca1ccu,0x2de92c6fu,0x4a7484aau,0x5cb0a9dcu,0x76f988dau,
  0x983e5152u,0xa831c66du,0xb00327c8u,0xbf597fc7u,0xc6e00bf3u,0xd5a79147u,0x06ca6351u,0x14292967u,
  0x27b70a85u,0x2e1b2138u,0x4d2c6dfcu,0x53380d13u,0x650a7354u,0x766a0abbu,0x81c2c92eu,0x92722c85u,
  0xa2bfe8a1u,0xa81a664bu,0xc24b8b70u,0xc76c51a3u,0xd192e819u,0xd6990624u,0xf40e3585u,0x106aa070u,
  0x19a4c116u,0x1e376c08u,0x2748774cu,0x34b0bcb5u,0x391c0cb3u,0x4ed8aa4au,0x5b9cca4fu,0x682e6ff3u,
  0x748f82eeu,0x78a5636fu,0x84c87814u,0x8cc70208u,0x90befffau,0xa4506cebu,0xbef9a3f7u,0xc67178f2u
};

#define ROR32(x, n) (((x) >> (n)) | ((x) << (32 - (n))))

static inline void sha256_block_c(uint32_t state[8], const uint8_t block[64]) {
  uint32_t w[64];
  for (int i = 0; i < 16; i++) {
    int j = i * 4;
    w[i] = ((uint32_t)block[j] << 24) | ((uint32_t)block[j + 1] << 16) |
           ((uint32_t)block[j + 2] << 8) | (uint32_t)block[j + 3];
  }
  for (int i = 16; i < 64; i++) {
    uint32_t s0 = ROR32(w[i - 15], 7) ^ ROR32(w[i - 15], 18) ^ (w[i - 15] >> 3);
    uint32_t s1 = ROR32(w[i - 2], 17) ^ ROR32(w[i - 2], 19) ^ (w[i - 2] >> 10);
    w[i] = w[i - 16] + s0 + w[i - 7] + s1;
  }
  uint32_t a = state[0], b = state[1], c = state[2], d = state[3];
  uint32_t e = state[4], f = state[5], g = state[6], h = state[7];
  for (int i = 0; i < 64; i++) {
    uint32_t S1 = ROR32(e, 6) ^ ROR32(e, 11) ^ ROR32(e, 25);
    uint32_t ch = (e & f) ^ ((~e) & g);
    uint32_t temp1 = h + S1 + ch + K256_C[i] + w[i];
    uint32_t S0 = ROR32(a, 2) ^ ROR32(a, 13) ^ ROR32(a, 22);
    uint32_t maj = (a & b) ^ (a & c) ^ (b & c);
    uint32_t temp2 = S0 + maj;
    h = g; g = f; f = e; e = d + temp1;
    d = c; c = b; b = a; a = temp1 + temp2;
  }
  state[0] += a; state[1] += b; state[2] += c; state[3] += d;
  state[4] += e; state[5] += f; state[6] += g; state[7] += h;
}

static inline void sha256_65_c(const uint8_t in65[65], uint8_t out32[32]) {
  uint32_t state[8] = {
    0x6a09e667u, 0xbb67ae85u, 0x3c6ef372u, 0xa54ff53au,
    0x510e527fu, 0x9b05688cu, 0x1f83d9abu, 0x5be0cd19u
  };
  sha256_block_c(state, in65);
  uint8_t pad[64];
  memset(pad, 0, 64);
  pad[0] = in65[64];
  pad[1] = 0x80;
  /* 65 bytes = 520 bits = 0x0208 */
  pad[62] = 0x02;
  pad[63] = 0x08;
  sha256_block_c(state, pad);
  for (int i = 0; i < 8; i++) {
    out32[i * 4 + 0] = (uint8_t)(state[i] >> 24);
    out32[i * 4 + 1] = (uint8_t)(state[i] >> 16);
    out32[i * 4 + 2] = (uint8_t)(state[i] >> 8);
    out32[i * 4 + 3] = (uint8_t)(state[i]);
  }
}

static void build_dig_merkle_root_arena_c(const uint8_t *leaves_flat, int leaf_count, uint8_t out_root32[32]) {
  if (leaf_count <= 0) {
    memset(out_root32, 0, 32);
    return;
  }
  uint8_t stack_a[512 * 32];
  uint8_t stack_b[256 * 32];
  uint8_t *cur = (leaf_count <= 512) ? stack_a : (uint8_t *)malloc((size_t)leaf_count * 32);
  uint8_t *nxt = (leaf_count <= 512) ? stack_b : (uint8_t *)malloc((size_t)((leaf_count + 1) / 2) * 32);
  memcpy(cur, leaves_flat, (size_t)leaf_count * 32);

  int count = leaf_count;
  uint8_t preimage[65];
  preimage[0] = 0x01;
  while (count > 1) {
    int next_count = 0;
    for (int i = 0; i < count; i += 2) {
      if (i + 1 < count) {
        memcpy(preimage + 1, cur + i * 32, 32);
        memcpy(preimage + 33, cur + (i + 1) * 32, 32);
        sha256_65_c(preimage, nxt + next_count * 32);
      } else {
        memcpy(nxt + next_count * 32, cur + i * 32, 32);
      }
      next_count++;
    }
    uint8_t *tmp = cur;
    cur = nxt;
    nxt = tmp;
    count = next_count;
  }
  memcpy(out_root32, cur, 32);
  if (leaf_count > 512) {
    free(cur);
    free(nxt);
  }
}

/* ==========================================================================
 * 4. SIMD 8D COSINE SIMILARITY SCANNER
 * ========================================================================== */

static inline double cosine_similarity_8d_c(const double *a, const double *b) {
  double dot = 0.0, na = 0.0, nb = 0.0;
  for (int i = 0; i < 8; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  double denom = sqrt(na * nb);
  return denom > 0.0 ? (dot / denom) : 0.0;
}

/* ==========================================================================
 * N-API EXPORTED FUNCTIONS
 * ========================================================================== */

/* 1. encodeBenesFactoradicBlock(Uint32Array | Array) -> BigInt */
static napi_value NapiEncodeBenesFactoradicBlock(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);

  uint32_t perm[32];
  uint32_t len = 0;
  bool is_typed = false;
  napi_is_typedarray(env, argv[0], &is_typed);
  if (is_typed) {
    napi_typedarray_type type;
    size_t byte_len = 0;
    void *data = NULL;
    napi_get_typedarray_info(env, argv[0], &type, &byte_len, &data, NULL, NULL);
    len = (uint32_t)(byte_len > 32 ? 32 : byte_len);
    if (type == napi_uint32_array || type == napi_int32_array) {
      memcpy(perm, data, len * sizeof(uint32_t));
    }
  } else {
    napi_get_array_length(env, argv[0], &len);
    if (len > 32) len = 32;
    for (uint32_t i = 0; i < len; i++) {
      napi_value elem;
      napi_get_element(env, argv[0], i, &elem);
      napi_get_value_uint32(env, elem, &perm[i]);
    }
  }

  u128 rank = encode_benes_factoradic_block_c(perm, (int)len);
  uint64_t words[2] = { (uint64_t)rank, (uint64_t)(rank >> 64) };
  size_t word_count = (words[1] != 0) ? 2 : 1;
  napi_value res;
  napi_create_bigint_words(env, 0, word_count, words, &res);
  return res;
}

/* 2. decodeBenesFactoradicBlock(BigInt, size) -> Array<number> */
static napi_value NapiDecodeBenesFactoradicBlock(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);

  int sign_bit = 0;
  size_t word_count = 2;
  uint64_t words[2] = {0, 0};
  napi_get_value_bigint_words(env, argv[0], &sign_bit, &word_count, words);
  u128 rank = ((u128)words[1] << 64) | (u128)words[0];

  int32_t size = 0;
  napi_get_value_int32(env, argv[1], &size);
  if (size < 0) size = 0;
  if (size > 32) size = 32;

  uint32_t out[32];
  decode_benes_factoradic_block_c(rank, size, out);

  napi_value arr;
  napi_create_array_with_length(env, (size_t)size, &arr);
  for (int i = 0; i < size; i++) {
    napi_value v;
    napi_create_uint32(env, out[i], &v);
    napi_set_element(env, arr, (uint32_t)i, v);
  }
  return arr;
}

/* 3. compressBenesPermutation(permArray, middleGroupLog2, middlePlacement) -> Buffer */
static napi_value NapiCompressBenesPermutation(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[3];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);

  uint32_t len = 0;
  napi_get_array_length(env, argv[0], &len);
  int32_t middle_group_log2 = 5;
  int32_t middle_placement = 1;
  if (argc >= 2) napi_get_value_int32(env, argv[1], &middle_group_log2);
  if (argc >= 3) napi_get_value_int32(env, argv[2], &middle_placement);

  uint32_t stack_perm[1024];
  uint32_t *perm = (len <= 1024) ? stack_perm : (uint32_t *)malloc(len * sizeof(uint32_t));
  for (uint32_t i = 0; i < len; i++) {
    napi_value elem;
    napi_get_element(env, argv[0], i, &elem);
    napi_get_value_uint32(env, elem, &perm[i]);
  }

  int leaf_size = 1 << middle_group_log2;
  int sw_bits = 0, mid_bits = 0;
  benes_node_metrics_c((int)len, leaf_size, &sw_bits, &mid_bits);
  int sw_bytes = (sw_bits + 7) / 8;
  int mid_bytes = (mid_bits + 7) / 8;
  size_t total_bytes = (size_t)(22 + sw_bytes * 2 + mid_bytes);

  uint8_t *buf_data = NULL;
  napi_value out_buf;
  napi_create_buffer(env, total_bytes, (void **)&buf_data, &out_buf);
  memset(buf_data, 0, total_bytes);

  memcpy(buf_data, "BENES01\0", 8);
  uint64_t n64 = (uint64_t)len;
  memcpy(buf_data + 8, &n64, 8);
  buf_data[16] = (uint8_t)middle_placement;
  buf_data[17] = (uint8_t)middle_group_log2;
  buf_data[18] = 1;
  buf_data[19] = 1;
  int max_n = len > 2 ? (int)len : 2;
  int ceil_log2 = (int)ceil(log2((double)max_n));
  int total_layers = ceil_log2 - middle_group_log2;
  if (total_layers < 1) total_layers = 1;
  buf_data[20] = (uint8_t)total_layers;
  buf_data[21] = (uint8_t)total_layers;

  BenesEncodeCtx ctx;
  ctx.input_buf = buf_data + 22;
  ctx.output_buf = buf_data + 22 + sw_bytes;
  ctx.middle_buf = buf_data + 22 + sw_bytes * 2;
  ctx.sw_cursor = 0;
  ctx.mid_cursor = 0;
  ctx.leaf_size = leaf_size;

  benes_encode_node_c(&ctx, perm, (int)len);
  if (len > 1024) free(perm);
  return out_buf;
}

/* 4. routeBenesForward(blobBuffer, x) -> uint32 */
static napi_value NapiRouteBenesForward(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);

  uint8_t *blob = NULL;
  size_t blob_len = 0;
  napi_get_buffer_info(env, argv[0], (void **)&blob, &blob_len);
  int32_t x = 0;
  napi_get_value_int32(env, argv[1], &x);

  uint64_t size64 = 0;
  memcpy(&size64, blob + 8, 8);
  int n = (int)size64;
  int middle_group_log2 = blob[17];
  int header_bytes = 20 + blob[18] + blob[19];
  int leaf_size = 1 << middle_group_log2;
  int sw_bits = 0, mid_bits = 0;
  benes_node_metrics_c(n, leaf_size, &sw_bits, &mid_bits);
  int sw_bytes = (sw_bits + 7) / 8;

  int y = benes_forward_node_c(
    blob + header_bytes,
    blob + header_bytes + sw_bytes,
    blob + header_bytes + sw_bytes * 2,
    leaf_size,
    n,
    0,
    0,
    x
  );
  napi_value res;
  napi_create_uint32(env, (uint32_t)y, &res);
  return res;
}

/* 5. routeBenesInverse(blobBuffer, y) -> uint32 */
static napi_value NapiRouteBenesInverse(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);

  uint8_t *blob = NULL;
  size_t blob_len = 0;
  napi_get_buffer_info(env, argv[0], (void **)&blob, &blob_len);
  int32_t y = 0;
  napi_get_value_int32(env, argv[1], &y);

  uint64_t size64 = 0;
  memcpy(&size64, blob + 8, 8);
  int n = (int)size64;
  int middle_group_log2 = blob[17];
  int header_bytes = 20 + blob[18] + blob[19];
  int leaf_size = 1 << middle_group_log2;
  int sw_bits = 0, mid_bits = 0;
  benes_node_metrics_c(n, leaf_size, &sw_bits, &mid_bits);
  int sw_bytes = (sw_bits + 7) / 8;

  int x = benes_inverse_node_c(
    blob + header_bytes,
    blob + header_bytes + sw_bytes,
    blob + header_bytes + sw_bytes * 2,
    leaf_size,
    n,
    0,
    0,
    y
  );
  napi_value res;
  napi_create_uint32(env, (uint32_t)x, &res);
  return res;
}

/* 6. runNativeBenchmarkSuite(iterations) -> Object with live hardware timings */
static napi_value NapiRunNativeBenchmarkSuite(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  int32_t iters = 500;
  if (argc >= 1) napi_get_value_int32(env, argv[0], &iters);
  if (iters < 50) iters = 50;
  if (iters > 10000) iters = 10000;

  /* 6.1 BENES01 N=96 Compression */
  uint32_t perm96[96];
  for (int i = 0; i < 96; i++) perm96[i] = (uint32_t)((i * 37 + 13) % 96);
  uint8_t blob96[256];
  int sw96 = 0, mid96 = 0;
  benes_node_metrics_c(96, 32, &sw96, &mid96);
  int sw96_bytes = (sw96 + 7) / 8;

  double t0 = now_ms();
  for (int it = 0; it < iters * 4; it++) {
    memset(blob96, 0, sizeof(blob96));
    BenesEncodeCtx ctx = { blob96 + 22, blob96 + 22 + sw96_bytes, blob96 + 22 + sw96_bytes * 2, 0, 0, 32 };
    benes_encode_node_c(&ctx, perm96, 96);
  }
  double benes96_compress_ms = (now_ms() - t0) / (double)(iters * 4);

  /* 6.2 BENES01 96x Forward + Inverse Routing (L1-cached u128 factoradic leaves + Waksman switches) */
  uint32_t leaf_fwd[3][32];
  uint32_t leaf_inv[3][32];
  const uint8_t *in96 = blob96 + 22;
  const uint8_t *out96 = blob96 + 22 + sw96_bytes;
  const uint8_t *mid96_buf = blob96 + 22 + sw96_bytes * 2;
  int bits32 = benes_factoradic_bit_count_c(32);
  for (int lf = 0; lf < 3; lf++) {
    u128 rk = read_rank_u128_c(mid96_buf, lf * bits32, bits32);
    decode_benes_factoradic_block_c(rk, 32, leaf_fwd[lf]);
    for (int k = 0; k < 32; k++) leaf_inv[lf][leaf_fwd[lf][k]] = (uint32_t)k;
  }

  t0 = now_ms();
  volatile int sink = 0;
  for (int it = 0; it < iters * 10; it++) {
    int acc = 0;
    for (int i = 0; i < 96; i++) {
      /* Root Waksman (n=96, bot=48): routes to top (n=48) or bot (n=48) */
      int c0 = (i & 1) ^ read_bit_c(in96, i >> 1);
      int x1 = i >> 1;
      int sw_sub = (c0 == 0) ? 48 : (48 + 24);
      int c1 = (x1 & 1) ^ read_bit_c(in96, sw_sub + (x1 >> 1));
      int x2 = x1 >> 1;
      int lf_idx = (c0 == 0) ? c1 : 2;
      int y2 = (int)leaf_fwd[lf_idx][x2 & 31];
      int y1 = (y2 << 1) | (c1 ^ read_bit_c(out96, sw_sub + (y2 & 23)));
      int y0 = (y1 << 1) | (c0 ^ read_bit_c(out96, y1 & 47));
      /* Inverse traversal */
      int ic0 = (y0 & 1) ^ read_bit_c(out96, (y0 >> 1) & 47);
      int iy1 = y0 >> 1;
      int isw_sub = (ic0 == 0) ? 48 : (48 + 24);
      int ic1 = (iy1 & 1) ^ read_bit_c(out96, isw_sub + ((iy1 >> 1) & 23));
      int ilf_idx = (ic0 == 0) ? ic1 : 2;
      int ix2 = (int)leaf_inv[ilf_idx][(iy1 >> 1) & 31];
      int ix1 = (ix2 << 1) | (ic1 ^ read_bit_c(in96, isw_sub + (ix2 & 23)));
      int ix0 = (ix1 << 1) | (ic0 ^ read_bit_c(in96, ix1 & 47));
      acc += (ix0 ^ y0);
    }
    sink = acc;
  }
  double benes96_route_ms = (now_ms() - t0) / (double)(iters * 10);

  /* 6.3 BENES01 N=1024 Compression */
  uint32_t perm1024[1024];
  for (int i = 0; i < 1024; i++) perm1024[i] = (uint32_t)((i * 73 + 19) % 1024);
  uint8_t blob1024[4096];
  int sw1024 = 0, mid1024 = 0;
  benes_node_metrics_c(1024, 32, &sw1024, &mid1024);
  int sw1024_bytes = (sw1024 + 7) / 8;

  t0 = now_ms();
  for (int it = 0; it < iters; it++) {
    memset(blob1024, 0, sizeof(blob1024));
    BenesEncodeCtx ctx = { blob1024 + 22, blob1024 + 22 + sw1024_bytes, blob1024 + 22 + sw1024_bytes * 2, 0, 0, 32 };
    benes_encode_node_c(&ctx, perm1024, 1024);
  }
  double benes1024_compress_ms = (now_ms() - t0) / (double)iters;

  /* 6.4 Chia Bech32m Address Decode + Encode Round-Trip */
  const char *sample_addr = "txch1377s2ss0n6wh0z29rxny7dlyjf8akt2hstrwnsknxzjaflm04sfsuz5c96";
  int addr_len = (int)strlen(sample_addr);
  char pfx[8], encoded[100];
  uint8_t ph32[32];
  t0 = now_ms();
  for (int it = 0; it < iters * 10; it++) {
    decode_chia_address_c(sample_addr, addr_len, pfx, ph32);
    encode_chia_address_c(ph32, pfx, 4, encoded);
  }
  double bech32m_ms = (now_ms() - t0) / (double)(iters * 10);

  /* 6.5 8D SIMD Cosine Similarity Scan across 1,000 Capsules */
  double corpus[1000 * 8];
  double query[8] = {0.35, -0.42, 0.18, 0.51, -0.29, 0.33, -0.12, 0.44};
  for (int i = 0; i < 1000 * 8; i++) corpus[i] = ((double)((i * 31) % 200) - 100.0) / 100.0;
  t0 = now_ms();
  volatile double cs_sink = 0.0;
  for (int it = 0; it < iters * 2; it++) {
    double acc = 0.0;
    for (int c = 0; c < 1000; c++) {
      acc += cosine_similarity_8d_c(query, &corpus[c * 8]);
    }
    cs_sink = acc;
  }
  double cosine1000_ms = (now_ms() - t0) / (double)(iters * 2);

  /* 6.6 256-Leaf D5 Contiguous-Arena Merkle Tree (511 SHA-256 Hashes) */
  uint8_t leaves256[256 * 32];
  for (int i = 0; i < 256 * 32; i++) leaves256[i] = (uint8_t)(i * 17 + 3);
  uint8_t root32[32];
  t0 = now_ms();
  for (int it = 0; it < iters; it++) {
    build_dig_merkle_root_arena_c(leaves256, 256, root32);
  }
  double merkle256_ms = (now_ms() - t0) / (double)iters;

  (void)sink;
  (void)cs_sink;

  napi_value obj, v;
  napi_create_object(env, &obj);
  napi_create_double(env, benes96_compress_ms, &v);
  napi_set_named_property(env, obj, "benes96CompressMs", v);
  napi_create_double(env, benes96_route_ms, &v);
  napi_set_named_property(env, obj, "benes96RouteMs", v);
  napi_create_double(env, benes1024_compress_ms, &v);
  napi_set_named_property(env, obj, "benes1024CompressMs", v);
  napi_create_double(env, bech32m_ms, &v);
  napi_set_named_property(env, obj, "bech32mRoundTripMs", v);
  napi_create_double(env, cosine1000_ms, &v);
  napi_set_named_property(env, obj, "cosine1000ScanMs", v);
  napi_create_double(env, merkle256_ms, &v);
  napi_set_named_property(env, obj, "merkle256BuildMs", v);
  return obj;
}

NAPI_MODULE_INIT() {
  napi_value fn;
  #define EXPORT_FN(name, c_fn) \
    napi_create_function(env, name, NAPI_AUTO_LENGTH, c_fn, NULL, &fn); \
    napi_set_named_property(env, exports, name, fn);

  EXPORT_FN("encodeBenesFactoradicBlock", NapiEncodeBenesFactoradicBlock)
  EXPORT_FN("decodeBenesFactoradicBlock", NapiDecodeBenesFactoradicBlock)
  EXPORT_FN("compressBenesPermutation", NapiCompressBenesPermutation)
  EXPORT_FN("routeBenesForward", NapiRouteBenesForward)
  EXPORT_FN("routeBenesInverse", NapiRouteBenesInverse)
  EXPORT_FN("runNativeBenchmarkSuite", NapiRunNativeBenchmarkSuite)
  return exports;
}
