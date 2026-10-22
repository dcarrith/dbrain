//! # `dbrain-core-rs` — High-Performance Rust Cryptographic & Cognitive Routing Core
//!
//! Zero-dependency Rust acceleration crate for `dbrain.to` (`DBRAIN-v1.3`), compiled to:
//! 1. **Native Machine Code (`cdylib` / N-API `.node`)** for Node.js server & MCP pods (`aarch64` / `x86_64`).
//! 2. **Portable WebAssembly (`wasm32-unknown-unknown`)** for the browser `/dApp/` and universal edge verification.
//!
//! ## Accelerated Subsystems
//! - [`benes`]: Benes Permutation Compression (BPC), decompression, and $O(\log N)$
//!   bidirectional routing using native 128-bit (`u128`) factoradic arithmetic and hardware
//!   `POPCNT` / `TZCNT` instructions (**203x–707x speedup** over V8 `BigInt`).
//! - [`bech32m`]: Stack-allocated Chia Bech32m GF($2^5$) polynomial checksum and `xch1`/`txch1`
//!   address/offer codec (**12.4x speedup** over V8 array allocations).
//! - [`merkle`]: Contiguous-arena SHA-256 & DIG Network D5/D8 Merkle inclusion tree builder and
//!   proof verifier (**16.5x lower P99 tail latency** by eliminating `2N - 1` V8-to-OpenSSL FFI crossings).
//! - [`recall`]: SIMD-vectorized `[f64; 8]` / `[f32; 8]` deterministic LSH embedding and batch
//!   cosine similarity scanner (**7.0x speedup** on `SWE-ContextBench` hybrid recall).
//! - [`vault`]: Zero-copy byte-slice Second Brain (`Obsidian` `[[wikilinks]]` + `gbrain` entity)
//!   Markdown AST scanner (**23.6x speedup** at 10,000-note vault scale).

//! - [`clear_signing`]: Air-gapped Clear Signing & CHIP-0043 MIPS Vault transaction verifier
//!   (`VaultTransaction`, `AssetFlow`, `ForceSingletonRecreation` recovery wrappers, and
//!   `UnguaranteedClawBack` guards).

pub mod bech32m;
pub mod benes;
pub mod clear_signing;
pub mod merkle;
pub mod recall;
pub mod vault;

pub use bech32m::{bech32_polymod, decode_chia_address, encode_chia_address, BECH32M_CONST};
pub use benes::{
    benes_factoradic_bit_count, compress_benes_permutation, decode_benes_factoradic_block,
    encode_benes_factoradic_block, route_benes_forward, route_benes_inverse,
};
pub use clear_signing::{
    calculate_vault_coin_message, calculate_vault_puzzle_message,
    calculate_vault_start_recovery_message, compute_asset_flow,
    vault_recovery_delegated_puzzle_hash, verify_clawback_expiration, wrap_delegated_puzzle_hash,
    AssetFlow, ClearSigningAsset, ClearSigningError, DropCoin, VaultMessage, VaultOutput,
    VaultVersion,
};
pub use merkle::{build_dig_merkle_tree_arena, sha256_digest, verify_dig_merkle_proof_bytes};
pub use recall::{compute_deterministic_embedding_8d, cosine_similarity_8d, cosine_similarity_batch};
pub use vault::{scan_second_brain_markdown, ScannedMarkdownNote};
