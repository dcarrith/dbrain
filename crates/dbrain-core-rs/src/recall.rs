//! SIMD-Vectorized 8D Deterministic LSH Embedding & Cosine Similarity Scanner
//!
//! Computes deterministic SHA-256 8D unit embeddings and evaluates batch cosine
//! similarity with auto-vectorized 8-lane SIMD loops (`fmla` on ARM NEON / AVX2).

use crate::merkle::sha256_digest;

/// Computes the exact 8D deterministic unit embedding (`[f64; 8]`, rounded to 4 decimals)
/// matching `computeDeterministicEmbedding` in `lib/dbrain-core.js`.
pub fn compute_deterministic_embedding_8d(text: &str) -> [f64; 8] {
    let lower = text.to_ascii_lowercase();
    let hash = sha256_digest(lower.as_bytes());
    let mut raw = [0.0f64; 8];
    let mut norm_sq = 0.0f64;
    for i in 0..8 {
        let word = ((hash[i * 2] as u16) << 8) | (hash[i * 2 + 1] as u16);
        let val = (word as f64) / 32768.0 - 1.0;
        raw[i] = val;
        norm_sq += val * val;
    }
    let norm = norm_sq.sqrt();
    let mut out = [0.0f64; 8];
    if norm > 0.0 {
        for i in 0..8 {
            out[i] = ((raw[i] / norm) * 10000.0).round() / 10000.0;
        }
    }
    out
}

/// Evaluates cosine similarity between two 8D embedding vectors using an unrolled SIMD-friendly loop.
#[inline]
pub fn cosine_similarity_8d(a: &[f64; 8], b: &[f64; 8]) -> f64 {
    let mut dot = 0.0f64;
    let mut norm_a = 0.0f64;
    let mut norm_b = 0.0f64;
    for i in 0..8 {
        dot += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }
    let denom = norm_a.sqrt() * norm_b.sqrt();
    if denom > 0.0 {
        dot / denom
    } else {
        0.0
    }
}

/// Evaluates cosine similarity between `query[0..8]` and a contiguous matrix of $K$ 8D capsule
/// vectors (`corpus[0 .. K * 8]`), writing scores to `out_scores[0..K]`.
pub fn cosine_similarity_batch(query: &[f64; 8], corpus_flat: &[f64], out_scores: &mut [f64]) {
    let mut q_norm_sq = 0.0f64;
    for i in 0..8 {
        q_norm_sq += query[i] * query[i];
    }
    let q_norm = q_norm_sq.sqrt();
    if q_norm == 0.0 {
        for s in out_scores.iter_mut() {
            *s = 0.0;
        }
        return;
    }
    let count = (corpus_flat.len() / 8).min(out_scores.len());
    for c in 0..count {
        let base = c * 8;
        let doc = &corpus_flat[base..(base + 8)];
        let mut dot = 0.0f64;
        let mut d_norm_sq = 0.0f64;
        for i in 0..8 {
            dot += query[i] * doc[i];
            d_norm_sq += doc[i] * doc[i];
        }
        let denom = q_norm * d_norm_sq.sqrt();
        out_scores[c] = if denom > 0.0 { dot / denom } else { 0.0 };
    }
}
