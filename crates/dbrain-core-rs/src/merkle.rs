//! Contiguous-Arena SHA-256 & DIG Network D5/D8 Merkle Tree Engine
//!
//! Computes all `2N - 1` interior SHA-256 digests (`0x01 || left32 || right32`) inside a
//! single flat byte arena without crossing the V8 <-> OpenSSL N-API boundary `2N - 1` times.

const K256: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

#[inline(always)]
fn sha256_transform(state: &mut [u32; 8], block: &[u8; 64]) {
    let mut w = [0u32; 64];
    for i in 0..16 {
        let j = i * 4;
        w[i] = ((block[j] as u32) << 24)
            | ((block[j + 1] as u32) << 16)
            | ((block[j + 2] as u32) << 8)
            | (block[j + 3] as u32);
    }
    for i in 16..64 {
        let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
        let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
        w[i] = w[i - 16]
            .wrapping_add(s0)
            .wrapping_add(w[i - 7])
            .wrapping_add(s1);
    }
    let mut a = state[0];
    let mut b = state[1];
    let mut c = state[2];
    let mut d = state[3];
    let mut e = state[4];
    let mut f = state[5];
    let mut g = state[6];
    let mut h = state[7];

    for i in 0..64 {
        let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
        let ch = (e & f) ^ ((!e) & g);
        let temp1 = h
            .wrapping_add(s1)
            .wrapping_add(ch)
            .wrapping_add(K256[i])
            .wrapping_add(w[i]);
        let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
        let maj = (a & b) ^ (a & c) ^ (b & c);
        let temp2 = s0.wrapping_add(maj);

        h = g;
        g = f;
        f = e;
        e = d.wrapping_add(temp1);
        d = c;
        c = b;
        b = a;
        a = temp1.wrapping_add(temp2);
    }

    state[0] = state[0].wrapping_add(a);
    state[1] = state[1].wrapping_add(b);
    state[2] = state[2].wrapping_add(c);
    state[3] = state[3].wrapping_add(d);
    state[4] = state[4].wrapping_add(e);
    state[5] = state[5].wrapping_add(f);
    state[6] = state[6].wrapping_add(g);
    state[7] = state[7].wrapping_add(h);
}

/// Computes the 32-byte SHA-256 digest of `data` with zero heap allocations.
pub fn sha256_digest(data: &[u8]) -> [u8; 32] {
    let mut state: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];
    let mut chunks = data.chunks_exact(64);
    for chunk in &mut chunks {
        let block: &[u8; 64] = chunk.try_into().unwrap();
        sha256_transform(&mut state, block);
    }
    let rem = chunks.remainder();
    let mut pad = [0u8; 128];
    pad[..rem.len()].copy_from_slice(rem);
    pad[rem.len()] = 0x80;
    let total_bits = (data.len() as u64) * 8;
    let blocks = if rem.len() < 56 { 1 } else { 2 };
    pad[(blocks * 64 - 8)..(blocks * 64)].copy_from_slice(&total_bits.to_be_bytes());
    for b in 0..blocks {
        let block: &[u8; 64] = pad[(b * 64)..((b + 1) * 64)].try_into().unwrap();
        sha256_transform(&mut state, block);
    }
    let mut out = [0u8; 32];
    for (i, &word) in state.iter().enumerate() {
        out[(i * 4)..((i + 1) * 4)].copy_from_slice(&word.to_be_bytes());
    }
    out
}

/// Computes `SHA-256(0x01 || left32 || right32)` per DIG Network D5 interior node specification.
#[inline]
pub fn dig_hash_pair(left32: &[u8; 32], right32: &[u8; 32]) -> [u8; 32] {
    let mut preimage = [0u8; 65];
    preimage[0] = 0x01;
    preimage[1..33].copy_from_slice(left32);
    preimage[33..65].copy_from_slice(right32);
    sha256_digest(&preimage)
}

/// Builds a complete DIG Network D5/D8 Merkle tree (with D8 odd-leaf carry-up) in a single
/// contiguous memory arena, returning the 32-byte Merkle root.
pub fn build_dig_merkle_tree_arena(leaves: &[[u8; 32]]) -> [u8; 32] {
    if leaves.is_empty() {
        return sha256_digest(&[]);
    }
    let mut current: Vec<[u8; 32]> = leaves.to_vec();
    let mut next: Vec<[u8; 32]> = Vec::with_capacity((leaves.len() + 1) / 2);
    while current.len() > 1 {
        next.clear();
        let mut i = 0;
        while i < current.len() {
            if i + 1 < current.len() {
                next.push(dig_hash_pair(&current[i], &current[i + 1]));
            } else {
                // D8 Odd Leaf Carry-Up
                next.push(current[i]);
            }
            i += 2;
        }
        core::mem::swap(&mut current, &mut next);
    }
    current[0]
}

/// Verifies a serialized DIG Network D5/D8 binary Merkle inclusion proof buffer.
pub fn verify_dig_merkle_proof_bytes(proof_buf: &[u8]) -> Option<([u8; 32], [u8; 32], bool)> {
    if proof_buf.len() < 68 {
        return None;
    }
    let mut leaf32 = [0u8; 32];
    leaf32.copy_from_slice(&proof_buf[0..32]);
    let path_count = u32::from_be_bytes(proof_buf[32..36].try_into().ok()?) as usize;
    let expected_len = 32 + 4 + path_count * 33 + 32;
    if proof_buf.len() != expected_len {
        return None;
    }
    let mut acc = leaf32;
    let mut offset = 36usize;
    for _ in 0..path_count {
        let mut sibling32 = [0u8; 32];
        sibling32.copy_from_slice(&proof_buf[offset..(offset + 32)]);
        let is_left_byte = proof_buf[offset + 32];
        if is_left_byte != 0 && is_left_byte != 1 {
            return None;
        }
        acc = if is_left_byte == 1 {
            dig_hash_pair(&sibling32, &acc)
        } else {
            dig_hash_pair(&acc, &sibling32)
        };
        offset += 33;
    }
    let mut root32 = [0u8; 32];
    root32.copy_from_slice(&proof_buf[offset..(offset + 32)]);
    let valid = acc == root32;
    Some((acc, root32, valid))
}
