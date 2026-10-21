# Security Policy & Cryptographic Verification

## Supported Versions

| Version | Supported | V8 Code Coverage | Rust Core (`crates/dbrain-core-rs`) |
| :--- | :---: | :---: | :---: |
| `1.10.x` | ✅ Supported | `100.00%` Line / Branch / Function (`43/43` unit tests) | ✅ Native `u128`/SIMD + `wasm32` + `clear_signing.rs` |
| `< 1.10.0` | ❌ Upgrade Recommended | — | — |

## Self-Hosted Key & Custody Hygiene

1. **Generate Unique Node Keys (`npx dbrain keygen`):**
   - Never reuse example keys in production. Run `node cli/dbrain.mjs init --profile <homelab|community|city>` or `node cli/dbrain.mjs keygen` to generate a unique `RSA-OAEP-256` Private Cortex JWK keypair and a dedicated `did:chia` operator identity.
   - Store the private key offline; mount only the public JWK (`cortex-public-key.jwk.json`) onto your `dbrain` server.
2. **Use Air-Gapped Clear Signing (`CHIP-0043` MIPS Vaults) for Treasury & Writer Rotations:**
   - Never keep raw `BLS12-381` treasury or singleton owner keys in hot environment variables.
   - Use `dbrain clear-sign` or `POST /api/dbrain/clear-signing/verify` (`dbrain_clear_sign_verify` MCP tool) to run the 7-step `xch-dev/chia-wallet-sdk` `clear_signing` verification pipeline and sign `ur:chia-clear-sign/v1` payloads on an air-gapped `Secp256r1` Passkey (Apple/Android Secure Enclave), `Secp256k1` Hardware Wallet (Tangem/OneKey), or offline `BLS12-381` device.
3. **Verify `100.00%` Coverage Before Deploying Custom Forks:**
   ```bash
   npm test
   ```

## Reporting a Vulnerability

Please report suspected cryptographic, Merkle proof, or clear-signing vulnerabilities via GitHub Security Advisories on [`https://github.com/dcarrith/dbrain/security/advisories`](https://github.com/dcarrith/dbrain/security/advisories).
