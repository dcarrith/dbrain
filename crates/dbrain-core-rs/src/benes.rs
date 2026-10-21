//! `BENES01\0` Waksman / Beneš Network + 118-bit `u128` Factoradic Permutation Engine
//!
//! Implements the normative `Chia-Network/benes-perm` (`BENES01\0`) wire format using
//! native 128-bit `u128` register arithmetic and hardware bit manipulation (`count_ones`,
//! `trailing_zeros`) with zero heap allocations inside leaf blocks.

/// Exact bit-width required to represent $N! - 1$ for $0 \le N \le 32$.
#[inline]
pub fn benes_factoradic_bit_count(size: usize) -> usize {
    if size <= 1 {
        return 0;
    }
    let mut fact: u128 = 1;
    let mut i: u128 = 2;
    let cap = size.min(32) as u128;
    while i <= cap {
        fact = fact.saturating_mul(i);
        i += 1;
    }
    (128 - (fact - 1).leading_zeros()) as usize
}

/// Encodes a permutation of size $N \le 32$ into a 118-bit factoradic integer (`u128`)
/// matching the exact mixed-radix layout of `lib/dbrain-core.js` (`encodeBenesFactoradicBlock`).
#[inline]
pub fn encode_benes_factoradic_block(perm: &[u32]) -> u128 {
    let n = perm.len();
    if n <= 1 {
        return 0;
    }
    let mut seen_mask: u32 = 0;
    let mut rank: u128 = 0;
    for (j, &pj) in perm.iter().enumerate() {
        let lower_mask = if pj == 0 { 0u32 } else { (1u32 << pj) - 1 };
        let digit = (seen_mask & lower_mask).count_ones();
        seen_mask |= 1u32 << pj;
        rank = rank * ((j + 1) as u128) + (digit as u128);
    }
    rank
}

/// Decodes a 118-bit factoradic integer (`u128`) into a permutation of size $N \le 32$
/// into a caller-supplied stack slice `out[0..size]`.
#[inline]
pub fn decode_benes_factoradic_block(mut val: u128, size: usize, out: &mut [u32]) {
    let n = size.min(out.len()).min(32);
    let mut avail: u32 = if n >= 32 { u32::MAX } else { (1u32 << n) - 1 };
    for i in (0..n).rev() {
        let div = (i + 1) as u128;
        let d = (val % div) as u32;
        val /= div;
        let mut m = avail;
        for _ in 0..d {
            m &= m - 1;
        }
        let chosen = m.trailing_zeros();
        out[i] = chosen;
        avail &= !(1u32 << chosen);
    }
}

#[inline]
fn node_metrics(count: usize, leaf_size: usize) -> (usize, usize) {
    if count <= leaf_size {
        return (0, benes_factoradic_bit_count(count));
    }
    let top = (count + 1) / 2;
    let bot = count / 2;
    let (top_sw, top_mid) = node_metrics(top, leaf_size);
    let (bot_sw, bot_mid) = node_metrics(bot, leaf_size);
    (bot + top_sw + bot_sw, top_mid + bot_mid)
}

#[inline]
fn set_bit(buf: &mut [u8], bit_index: usize, val: u8) {
    if val != 0 {
        buf[bit_index >> 3] |= 1u8 << (bit_index & 7);
    }
}

#[inline]
fn read_bit(buf: &[u8], section_offset: usize, bit_index: usize) -> usize {
    ((buf[section_offset + (bit_index >> 3)] >> (bit_index & 7)) & 1) as usize
}

#[inline]
fn read_rank_u128(buf: &[u8], middle_offset: usize, bit_base: usize, bit_count: usize) -> u128 {
    let mut rank: u128 = 0;
    for b in 0..bit_count {
        if read_bit(buf, middle_offset, bit_base + b) != 0 {
            rank |= 1u128 << b;
        }
    }
    rank
}

/// Compresses an arbitrary bijection `permutation[0..N]` into the canonical 22-byte header
/// + packed switch/factoradic `BENES01\0` wire format.
pub fn compress_benes_permutation(permutation: &[u32], middle_group_log2: u8) -> Vec<u8> {
    let n = permutation.len();
    let leaf_size = 1usize << (middle_group_log2 as usize);
    let (switch_bits, middle_bits) = node_metrics(n, leaf_size);
    let input_switch_bytes = (switch_bits + 7) / 8;
    let output_switch_bytes = (switch_bits + 7) / 8;
    let middle_rank_bytes = (middle_bits + 7) / 8;

    let mut out = vec![0u8; 22 + input_switch_bytes + output_switch_bytes + middle_rank_bytes];
    out[0..8].copy_from_slice(b"BENES01\0");
    out[8..16].copy_from_slice(&(n as u64).to_le_bytes());
    out[16] = 1; // middlePlacement
    out[17] = middle_group_log2;
    out[18] = 1;
    out[19] = 1;
    let total_layers = ((n.max(2) as f64).log2().ceil() as i32 - (middle_group_log2 as i32)).max(1) as u8;
    out[20] = total_layers;
    out[21] = total_layers;

    let input_offset = 22;
    let output_offset = input_offset + input_switch_bytes;
    let middle_offset = output_offset + output_switch_bytes;

    let mut sw_cursor = 0usize;
    let mut mid_cursor = 0usize;

    fn encode_node(
        perm: &[u32],
        leaf_size: usize,
        out: &mut [u8],
        input_offset: usize,
        output_offset: usize,
        middle_offset: usize,
        sw_cursor: &mut usize,
        mid_cursor: &mut usize,
    ) {
        let n = perm.len();
        if n <= leaf_size {
            let bits = benes_factoradic_bit_count(n);
            let rank = encode_benes_factoradic_block(perm);
            for b in 0..bits {
                let bit = ((rank >> b) & 1) as u8;
                set_bit(&mut out[middle_offset..], *mid_cursor + b, bit);
            }
            *mid_cursor += bits;
            return;
        }
        let top_count = (n + 1) / 2;
        let bot_count = n / 2;
        let mut inv_perm = vec![0usize; n];
        for (i, &v) in perm.iter().enumerate() {
            inv_perm[v as usize] = i;
        }
        let mut in_color = vec![-1i8; n];
        let mut out_color = vec![-1i8; n];

        let mut color_component = |start_x: usize| {
            let mut curr_x = start_x;
            while in_color[curr_x] == -1 {
                in_color[curr_x] = 0;
                let y = perm[curr_x] as usize;
                out_color[y] = 0;
                if y >= 2 * bot_count {
                    break;
                }
                let y_sib = y ^ 1;
                out_color[y_sib] = 1;
                let next_x = inv_perm[y_sib];
                in_color[next_x] = 1;
                curr_x = next_x ^ 1;
            }
        };

        if n % 2 == 1 {
            color_component(2 * bot_count);
        }
        for x in (0..(2 * bot_count)).step_by(2) {
            if in_color[x] == -1 {
                color_component(x);
            }
        }

        for p in 0..bot_count {
            let ic = in_color[2 * p] as u8;
            let oc = out_color[2 * p] as u8;
            set_bit(&mut out[input_offset..], *sw_cursor + p, ic);
            set_bit(&mut out[output_offset..], *sw_cursor + p, oc);
        }
        *sw_cursor += bot_count;

        let mut top_perm = vec![0u32; top_count];
        let mut bot_perm = vec![0u32; bot_count];
        for x in 0..n {
            let y = (perm[x] as usize) >> 1;
            if in_color[x] == 0 {
                top_perm[x >> 1] = y as u32;
            } else {
                bot_perm[x >> 1] = y as u32;
            }
        }
        encode_node(
            &top_perm,
            leaf_size,
            out,
            input_offset,
            output_offset,
            middle_offset,
            sw_cursor,
            mid_cursor,
        );
        encode_node(
            &bot_perm,
            leaf_size,
            out,
            input_offset,
            output_offset,
            middle_offset,
            sw_cursor,
            mid_cursor,
        );
    }

    encode_node(
        permutation,
        leaf_size,
        &mut out,
        input_offset,
        output_offset,
        middle_offset,
        &mut sw_cursor,
        &mut mid_cursor,
    );
    out
}

/// Evaluates forward routing $\pi(x)$ directly over a compressed `BENES01\0` buffer in $O(\log N)$ steps.
pub fn route_benes_forward(blob: &[u8], x: usize) -> u32 {
    let size = u64::from_le_bytes(blob[8..16].try_into().unwrap_or([0; 8])) as usize;
    let middle_group_log2 = blob[17] as usize;
    let header_bytes = 20 + (blob[18] as usize) + (blob[19] as usize);
    let leaf_size = 1usize << middle_group_log2;
    let (switch_bits, _) = node_metrics(size, leaf_size);
    let sw_bytes = (switch_bits + 7) / 8;
    let input_offset = header_bytes;
    let output_offset = input_offset + sw_bytes;
    let middle_offset = output_offset + sw_bytes;

    fn fwd(
        blob: &[u8],
        n: usize,
        leaf_size: usize,
        input_offset: usize,
        output_offset: usize,
        middle_offset: usize,
        sw_base: usize,
        mid_base: usize,
        x: usize,
    ) -> usize {
        if n <= leaf_size {
            let bits = benes_factoradic_bit_count(n);
            let rank = read_rank_u128(blob, middle_offset, mid_base, bits);
            let mut leaf = [0u32; 32];
            decode_benes_factoradic_block(rank, n, &mut leaf);
            return leaf[x] as usize;
        }
        let top_count = (n + 1) / 2;
        let bot_count = n / 2;
        let (top_sw, top_mid) = node_metrics(top_count, leaf_size);
        let child = if x == 2 * bot_count {
            0
        } else {
            (x & 1) ^ read_bit(blob, input_offset, sw_base + (x >> 1))
        };
        let child_x = x >> 1;
        let child_y = if child == 0 {
            fwd(
                blob,
                top_count,
                leaf_size,
                input_offset,
                output_offset,
                middle_offset,
                sw_base + bot_count,
                mid_base,
                child_x,
            )
        } else {
            fwd(
                blob,
                bot_count,
                leaf_size,
                input_offset,
                output_offset,
                middle_offset,
                sw_base + bot_count + top_sw,
                mid_base + top_mid,
                child_x,
            )
        };
        if child == 0 && child_y == bot_count {
            return 2 * bot_count;
        }
        let sw_out = read_bit(blob, output_offset, sw_base + child_y);
        (child_y << 1) | (child ^ sw_out)
    }

    fwd(
        blob,
        size,
        leaf_size,
        input_offset,
        output_offset,
        middle_offset,
        0,
        0,
        x,
    ) as u32
}

/// Evaluates inverse routing $\pi^{-1}(y)$ directly over a compressed `BENES01\0` buffer in $O(\log N)$ steps.
pub fn route_benes_inverse(blob: &[u8], y: usize) -> u32 {
    let size = u64::from_le_bytes(blob[8..16].try_into().unwrap_or([0; 8])) as usize;
    let middle_group_log2 = blob[17] as usize;
    let header_bytes = 20 + (blob[18] as usize) + (blob[19] as usize);
    let leaf_size = 1usize << middle_group_log2;
    let (switch_bits, _) = node_metrics(size, leaf_size);
    let sw_bytes = (switch_bits + 7) / 8;
    let input_offset = header_bytes;
    let output_offset = input_offset + sw_bytes;
    let middle_offset = output_offset + sw_bytes;

    fn inv(
        blob: &[u8],
        n: usize,
        leaf_size: usize,
        input_offset: usize,
        output_offset: usize,
        middle_offset: usize,
        sw_base: usize,
        mid_base: usize,
        y: usize,
    ) -> usize {
        if n <= leaf_size {
            let bits = benes_factoradic_bit_count(n);
            let rank = read_rank_u128(blob, middle_offset, mid_base, bits);
            let mut leaf = [0u32; 32];
            decode_benes_factoradic_block(rank, n, &mut leaf);
            for i in 0..n {
                if leaf[i] as usize == y {
                    return i;
                }
            }
            return 0;
        }
        let top_count = (n + 1) / 2;
        let bot_count = n / 2;
        let (top_sw, top_mid) = node_metrics(top_count, leaf_size);
        let child = if y == 2 * bot_count {
            0
        } else {
            (y & 1) ^ read_bit(blob, output_offset, sw_base + (y >> 1))
        };
        let child_y = y >> 1;
        let child_x = if child == 0 {
            inv(
                blob,
                top_count,
                leaf_size,
                input_offset,
                output_offset,
                middle_offset,
                sw_base + bot_count,
                mid_base,
                child_y,
            )
        } else {
            inv(
                blob,
                bot_count,
                leaf_size,
                input_offset,
                output_offset,
                middle_offset,
                sw_base + bot_count + top_sw,
                mid_base + top_mid,
                child_y,
            )
        };
        if child == 0 && child_x == bot_count {
            return 2 * bot_count;
        }
        let sw_in = read_bit(blob, input_offset, sw_base + child_x);
        (child_x << 1) | (child ^ sw_in)
    }

    inv(
        blob,
        size,
        leaf_size,
        input_offset,
        output_offset,
        middle_offset,
        0,
        0,
        y,
    ) as u32
}
