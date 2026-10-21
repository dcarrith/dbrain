//! Stack-Allocated Chia Bech32m Polynomial Checksum & Address Codec (`xch1` / `txch1`)
//!
//! Eliminates the 4 intermediate JS array allocations per address decode/encode in V8.

pub const BECH32M_CONST: u32 = 0x2bc830a3;
const BECH32_CHARSET: &[u8; 32] = b"qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GEN: [u32; 5] = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

const fn build_rev_table() -> [i8; 128] {
    let mut table = [-1i8; 128];
    let mut i = 0;
    while i < 32 {
        table[BECH32_CHARSET[i] as usize] = i as i8;
        i += 1;
    }
    table
}

const BECH32_REV: [i8; 128] = build_rev_table();

/// Evaluates the Bech32m GF($2^5$) generator polynomial checksum over 5-bit words.
#[inline]
pub fn bech32_polymod(values: &[u8]) -> u32 {
    let mut chk: u32 = 1;
    for &v in values {
        let top = chk >> 25;
        chk = ((chk & 0x01ff_ffff) << 5) ^ (v as u32);
        for i in 0..5 {
            if ((top >> i) & 1) != 0 {
                chk ^= BECH32_GEN[i];
            }
        }
    }
    chk
}

/// Decodes a canonical Chia Bech32m address (`xch1...` or `txch1...`) into `(prefix, [u8; 32])`
/// using fixed stack buffers with zero heap allocations.
pub fn decode_chia_address(addr: &str) -> Option<(&'static str, [u8; 32])> {
    let bytes = addr.as_bytes();
    if bytes.len() < 8 || bytes.len() > 100 {
        return None;
    }
    let mut has_lower = false;
    let mut has_upper = false;
    let mut lower = [0u8; 100];
    for (i, &b) in bytes.iter().enumerate() {
        if b.is_ascii_lowercase() {
            has_lower = true;
            lower[i] = b;
        } else if b.is_ascii_uppercase() {
            has_upper = true;
            lower[i] = b.to_ascii_lowercase();
        } else {
            lower[i] = b;
        }
    }
    if has_lower && has_upper {
        return None;
    }
    let slice = &lower[..bytes.len()];
    let pos = slice.iter().rposition(|&b| b == b'1')?;
    if pos < 1 || pos + 7 > slice.len() {
        return None;
    }
    let hrp = &slice[..pos];
    let static_hrp = if hrp == b"xch" {
        "xch"
    } else if hrp == b"txch" {
        "txch"
    } else {
        return None;
    };

    let data_part = &slice[(pos + 1)..];
    let mut polymod_buf = [0u8; 116];
    let mut p_len = 0usize;
    for &b in hrp {
        polymod_buf[p_len] = b >> 5;
        p_len += 1;
    }
    polymod_buf[p_len] = 0;
    p_len += 1;
    for &b in hrp {
        polymod_buf[p_len] = b & 31;
        p_len += 1;
    }

    let mut data5 = [0u8; 96];
    for (i, &ch) in data_part.iter().enumerate() {
        if ch >= 128 {
            return None;
        }
        let d = BECH32_REV[ch as usize];
        if d < 0 {
            return None;
        }
        data5[i] = d as u8;
        polymod_buf[p_len] = d as u8;
        p_len += 1;
    }

    if bech32_polymod(&polymod_buf[..p_len]) != BECH32M_CONST {
        return None;
    }

    let payload_len = data_part.len() - 6;
    if payload_len != 52 {
        return None;
    }
    let mut acc: u32 = 0;
    let mut bits: u32 = 0;
    let mut out32 = [0u8; 32];
    let mut out_idx = 0usize;
    for &value in &data5[..payload_len] {
        acc = (acc << 5) | (value as u32);
        bits += 5;
        while bits >= 8 {
            bits -= 8;
            if out_idx >= 32 {
                return None;
            }
            out32[out_idx] = ((acc >> bits) & 0xff) as u8;
            out_idx += 1;
        }
    }
    if bits >= 5 || ((acc << (8 - bits)) & 0xff) != 0 || out_idx != 32 {
        return None;
    }
    Some((static_hrp, out32))
}

/// Encodes a 32-byte Chia puzzle hash into a canonical Bech32m address (`xch1...` or `txch1...`).
pub fn encode_chia_address(puzzle_hash: &[u8; 32], hrp: &str) -> String {
    let clean_hrp = hrp.to_ascii_lowercase();
    let hrp_bytes = clean_hrp.as_bytes();
    let mut words = [0u8; 52];
    let mut w_len = 0usize;
    let mut acc: u32 = 0;
    let mut bits: u32 = 0;
    for &b in puzzle_hash {
        acc = (acc << 8) | (b as u32);
        bits += 8;
        while bits >= 5 {
            bits -= 5;
            words[w_len] = ((acc >> bits) & 31) as u8;
            w_len += 1;
        }
    }
    if bits > 0 {
        words[w_len] = ((acc << (5 - bits)) & 31) as u8;
        w_len += 1;
    }

    let mut poly_buf = [0u8; 96];
    let mut p_len = 0usize;
    for &b in hrp_bytes {
        poly_buf[p_len] = b >> 5;
        p_len += 1;
    }
    poly_buf[p_len] = 0;
    p_len += 1;
    for &b in hrp_bytes {
        poly_buf[p_len] = b & 31;
        p_len += 1;
    }
    for &w in &words[..w_len] {
        poly_buf[p_len] = w;
        p_len += 1;
    }
    p_len += 6; // 6 zero checksum words

    let polymod = bech32_polymod(&poly_buf[..p_len]) ^ BECH32M_CONST;
    let mut out = String::with_capacity(hrp_bytes.len() + 1 + 58);
    out.push_str(&clean_hrp);
    out.push('1');
    for &w in &words[..w_len] {
        out.push(BECH32_CHARSET[w as usize] as char);
    }
    for i in 0..6 {
        let d = ((polymod >> (5 * (5 - i))) & 31) as usize;
        out.push(BECH32_CHARSET[d] as char);
    }
    out
}
