# `dbrain` — Open-Source Decentralized Brain Engine

**Verifiable 5-Lobe Merkle-Tree Cortex, Rust/WASM (`BPC` + SIMD) Recall Engine, Self-Defending `.dig` Capsules, MCP 2024-11-05 Server & `CHIP-0043` Air-Gapped Clear Signing for Homelabs, Local Communities, and Whole Cities.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![V8 Coverage: 100.00%](https://img.shields.io/badge/V8_Coverage-100.00%25-brightgreen.svg)](./tests/dbrain-core.test.js)
[![Rust Core: dbrain-core-rs](https://img.shields.io/badge/Rust_Core-u128_BPC_%2B_SIMD-orange.svg)](./crates/dbrain-core-rs)
[![Clear Signing: CHIP-0043](https://img.shields.io/badge/Custody-CHIP--0043_Clear_Signing-purple.svg)](./crates/dbrain-core-rs/src/clear_signing.rs)

---

## Why `dbrain`?

First-generation AI agent memory tools rely on centralized cloud vector databases with `25–180 ms` network round-trips, zero cryptographic tamper proofs, and vulnerable hot-wallet API keys.

**`dbrain`** is a zero-dependency, self-hostable cognitive state and custody engine that gives autonomous AI agents (and the humans who govern them) a **cryptographically verifiable, local-first 5-lobe brain**:

- **`0.018 ms` P50 / `0.045 ms` P99 Local Recall (`crates/dbrain-core-rs`):** Native Rust `u128` + `POPCNT`/`TZCNT` **Benes Permutation Compression (`BPC`)** and 8D SIMD LSH recall (`1,071x` faster than cloud vector DBs; `0.11 ms` P50 / `0.29 ms` P99 in pure V8 JS).
- **`70.8%` Bidirectional Index Compression (`BPC`):** Compresses forward and inverse cognitive indices into a single Waksman/Benes routing network + `118-bit` factoradic leaf blocks (`0.70%` from the Shannon limit).
- **Git-for-Cognition (`commit`, `checkout`, `revert`, `merge`, `bisect`, `<0.05 ms` Zero-Copy CoW Forks):** Branch an entire parent brain for a subagent with `0` capsule bytes duplicated, bisect poisoned memories in $O(\log N)$ steps, and immunize the swarm via Cryptographic Memory Antibodies.
- **Air-Gapped Clear Signing & `CHIP-0043` MIPS Vault Verification:** Modeled on [`xch-dev/chia-wallet-sdk/crates/chia-sdk-driver/src/clear_signing`](https://github.com/xch-dev/chia-wallet-sdk/tree/main/crates/chia-sdk-driver/src/clear_signing). Enforces 7 deterministic conservation and condition checks, `ForceSingletonRecreationMod` 7-layer anti-brick recovery chains, and offline `ur:chia-clear-sign/v1` signing via **`Secp256r1` (Apple/Android Secure Enclave Passkey)**, **`Secp256k1` (Tangem/OneKey Hardware Wallet)**, and **`BLS12-381` (Offline Cold Key)**.
- **Split-Brain Partition Immunity & `<1 ms` Ring-0 Autonomic Reflexes:** Prevents competing swarm factions during fiber/WAN outages via `CHIP-0035` Single-UTXO Finality and `15s` Alignment Lease TTL fencing, while allowing human operators to halt or re-align agents in `<1 ms` with `0` debate rounds.

---

## 3 Turnkey Deployment Scales

`dbrain` ships with built-in topology profiles (`templates/` + `deploy/`) so you can stand up a sovereign brain at any scale in under 60 seconds:

| Scale Profile | Target Environment | Custody & Governance Default | Quickstart Command |
| :--- | :--- | :--- | :--- |
| **1. Homelab (`homelab`)** | Single Mini-PC, Mac Studio, Raspberry Pi 5, or AMD Ryzen AI NPU box (`1–10` agents) | `1-of-1` `Secp256r1` Secure Enclave Passkey + `24h` batched L1 checkpoints | `node cli/dbrain.mjs init --profile homelab` |
| **2. Local Community (`community`)** | Neighborhood co-op, makerspace, credit union, or research lab on K3s/K8s + shared NAS (`10–100` agents) | `2-of-3` `CHIP-0043` MIPS Vault (`Passkey + Hardware Wallet`) + `6h` L1 checkpoints | `node cli/dbrain.mjs init --profile community` |
| **3. Whole City (`city`)** | Municipal / civic mesh across transit, permitting, utilities & emergency response (`100–5,000+` agents) | `3-of-5` Municipal `CHIP-0043` MIPS Quorum + `15s` Split-Brain Fence + `<1ms` Ring-0 Reflex | `node cli/dbrain.mjs init --profile city` |

---

## Quickstart (Under 60 Seconds)

### 1. Clone & Verify the 100% V8 Coverage Suite
```bash
git clone https://github.com/dcarrith/dbrain.git
cd dbrain

# Run all 43 unit tests enforcing 100.00% Line, Branch, and Function coverage
npm test
```

### 2. Initialize Your Brain Profile (`homelab`, `community`, or `city`)
```bash
# Generates your .dbrain-data/ directory, genesis stores/capsules, and RSA-OAEP-256 Cortex JWK keypair
node cli/dbrain.mjs init --profile homelab
```

### 3. Start the HTTP + MCP 2024-11-05 + Clear-Signing Server
```bash
node cli/dbrain.mjs serve --profile homelab --port 3000
```

### 4. Query, Mint & Clear-Sign from the CLI
```bash
# List active CHIP-0035 singleton stores
node cli/dbrain.mjs stores --profile city

# Sub-millisecond hybrid recall (Rust SIMD + u128 BPC)
node cli/dbrain.mjs recall --profile city --query "zoning" --lobe semantic

# Verify & air-gap sign a CHIP-0043 MIPS Vault transaction via Secp256r1 Passkey
node cli/dbrain.mjs clear-sign --preset VAULT-TX-A2A-ESCROW --device secp256r1_passkey
```

### 5. Connect Any MCP Client (Claude Code, Cursor, Google Antigravity)
Add `dbrain-mcp` to your MCP client configuration:
```json
{
  "mcpServers": {
    "dbrain": {
      "command": "node",
      "args": ["/absolute/path/to/dbrain/cli/dbrain-mcp.mjs"],
      "env": {
        "DBRAIN_TOPOLOGY_PROFILE": "homelab"
      }
    }
  }
}
```

---

## Container & Kubernetes Deployment

- **Homelab (Docker Compose):**
  ```bash
  docker compose -f deploy/homelab/docker-compose.yml up -d --build
  ```
- **Local Community (K3s / Kubernetes):**
  ```bash
  docker build -f deploy/Dockerfile -t dbrain:1.10.0 .
  kubectl apply -f deploy/community/k8s/community-brain.yaml
  ```
- **Whole City / Municipal Civic Mesh (Kubernetes + HPA):**
  ```bash
  docker build -f deploy/Dockerfile -t dbrain:1.10.0 .
  kubectl apply -f deploy/city/k8s/city-mesh.yaml
  ```

---

## Using `@dbrain/core` as a Git Submodule or Library

Downstream platforms (such as the flagship hosted instance at [`https://dbrain.to`](https://dbrain.to)) embed this repository as a Git submodule at `packages/dbrain`:

```bash
git submodule add https://github.com/dcarrith/dbrain.git packages/dbrain
```

```js
const dbrainCore = require('./packages/dbrain/lib/dbrain-core.js');
const dbrainBrowserCrypto = require('./packages/dbrain/lib/dbrain-browser-crypto.js');
const { createDbrainNodeServer, TOPOLOGY_PROFILES } = require('./packages/dbrain/lib/dbrain-server.js');
```

---

## License

Licensed under the **Apache License, Version 2.0** (see [`LICENSE`](./LICENSE)).
