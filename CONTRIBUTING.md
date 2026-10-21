# Contributing to `dbrain`

Thank you for contributing to **`dbrain`** — the open-source Decentralized Brain engine for Homelabs, Local Communities, and Whole Cities!

## Mandatory Verification Gates

Every pull request must maintain:
1. **`100.00%` V8 Line, Branch, and Function Coverage** across `lib/dbrain-core.js` and `lib/dbrain-browser-crypto.js`:
   ```bash
   npm test
   ```
2. **Rust Core (`crates/dbrain-core-rs`) Unit & Parity Tests** (when modifying `crates/dbrain-core-rs/*`):
   ```bash
   cargo test --manifest-path crates/dbrain-core-rs/Cargo.toml
   npm run build:rust
   ```

## Architecture & Terminology Conventions

- Refer to Benes network compression as **Benes Permutation Compression (`BPC`)** or **Benes**.
- Preserve zero external runtime npm dependencies in `lib/dbrain-core.js`, `lib/dbrain-browser-crypto.js`, and `lib/dbrain-server.js` so `dbrain` runs out-of-the-box on any Node.js `>= 20` runtime.
