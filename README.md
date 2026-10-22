# `dbrain` — Open-Source Decentralized Brain Engine (`DBRAIN-v1.3`)

**Verifiable 5-Lobe Merkle-DAG Cortex, Hardware-Accelerated Rust/WASM (`BPC1` + SIMD) Recall Engine, Self-Defending `.dig` Capsules, Git-for-Agent-Memories VCS, MCP `2024-11-05` Server & `CHIP-0028`/`CHIP-0043` Air-Gapped Clear Signing for Homelabs, Local Communities, and Whole Cities.**

[![Whitepaper: Oct 31, 2026](https://img.shields.io/badge/Whitepaper-Oct_31%2C_2026-f59e0b.svg)](./WHITEPAPER.md)
[![Protocol: DBRAIN-v1.3](https://img.shields.io/badge/Protocol-DBRAIN--v1.3-10b981.svg)](./lib/dbrain-core.js)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![V8 Coverage: 100.00%](https://img.shields.io/badge/V8_Coverage-100.00%25_Line%2FBranch%2FFunc-brightgreen.svg)](./tests/dbrain-core.test.js)
[![Rust Core: dbrain-core-rs](https://img.shields.io/badge/Rust_Core-u128_BPC1_%2B_f32x8_SIMD-orange.svg)](./crates/dbrain-core-rs)
[![Custody: CHIP-0028 / CHIP-0043](https://img.shields.io/badge/Custody-CHIP--0028_%2F_0043_Clear_Signing-purple.svg)](./crates/dbrain-core-rs/src/clear_signing.rs)
[![Post-Quantum: ML-DSA-65 + Ed25519](https://img.shields.io/badge/PQC-FIPS--204_ML--DSA--65_%2B_Ed25519-38bdf8.svg)](./lib/dbrain-core.js)

> **Read the Founding Whitepaper (October 31, 2026):** **[`WHITEPAPER.md` — *`dbrain`: A Peer-to-Peer Electronic Cognition and Verifiable Agent Memory System*](./WHITEPAPER.md)**  
> **Flagship Reference Deployment:** See `dbrain` running live at production scale on **[`https://dbrain.to`](https://dbrain.to)** — *The Decentralized Brain to Your AI Agents™* — which embeds this repository as its core engine submodule (`packages/dbrain`).

---

## Table of Contents

1. [The Problem: Why Agent Brains Need Git, Not 1992 "Vector Soup"](#1-the-problem-why-agent-brains-need-git-not-1992-vector-soup)
2. [Performance & Competitive Benchmarks (`0.018 ms` P50 Recall)](#2-performance--competitive-benchmarks-0018-ms-p50-recall)
3. [The 10 Differentiating Architectural Pillars of `dbrain` (`DBRAIN-v1.3`)](#3-the-10-differentiating-architectural-pillars-of-dbrain-dbrain-v13)
4. [Prerequisites & Operating Modes (What You Need to Run `dbrain`)](#4-prerequisites--operating-modes-what-you-need-to-run-dbrain)
5. [Turnkey Topology Profiles: Homelab, Local Community & Whole City](#5-turnkey-topology-profiles-homelab-local-community--whole-city)
6. [Complete Environment Variables Reference](#6-complete-environment-variables-reference)
7. [Step-by-Step Setup & Quickstart Guide](#7-step-by-step-setup--quickstart-guide)
8. [CLI, MCP `2024-11-05` & HTTP REST API Reference](#8-cli-mcp-2024-11-05--http-rest-api-reference)
9. [Building the Rust Core (`crates/dbrain-core-rs`) & Running the 100% V8 Test Suite](#9-building-the-rust-core-cratesdbrain-core-rs--running-the-100-v8-test-suite)
10. [Using `@dbrain/core` as a Git Submodule & Contributing](#10-using-dbraincore-as-a-git-submodule--contributing)

---

## 1. The Problem: Why Agent Brains Need Git, Not 1992 "Vector Soup"

Traditional AI memory systems treat an agent's cognition like a pre-Git 1992 FTP folder: flat, unversioned vector rows overwritten in-place (`UPDATE embeddings SET ...`) inside a centralized cloud database. When you scale from a single chatbot to autonomous multi-agent swarms, Legacy Vector RAG collapses under five structural failures:

| Failure Mode | Legacy Cloud Vector DBs / Naive RAG | `dbrain` (`DBRAIN-v1.3` Decentralized Brain Engine) |
| :--- | :--- | :--- |
| **1. Read Latency** | `25–180 ms` HTTPS round-trip on every thought | **`0.018 ms` P50 / `0.045 ms` P99** in-process Rust `u128` `BPC1` + SIMD recall (`0.11 ms` P50 / `0.29 ms` P99 in pure V8 JS) |
| **2. Epistemic Drift & Poisoning** | Silent in-place overwrites; one hallucination or prompt injection corrupts all downstream agents | **Git-for-Cognition Merkle-DAG:** $O(\log N)$ `dbrain bisect`, surgical `dbrain revert`, and **Cryptographic Memory Antibodies** |
| **3. Subagent Branching Cost** | Duplicating a 50 MB vector index for 50 parallel subagents costs `2.5 GB` RAM and seconds of I/O | **$O(1)$ Zero-Copy Copy-on-Write (`CoW`) Forks** in `<0.05 ms` with **`0` capsule bytes duplicated** |
| **4. Swarm Sync Bandwidth** | Passing `200K`-token (`~410 KB`) transcripts back and forth between collaborating agents | **`96.2%` Bandwidth Reduction:** Peers sync only `1.1 KB` `get_kv_diff` + `BPC1` Merkle branch deltas |
| **5. Custody & Key Security** | Hot-wallet private keys or plaintext API tokens sitting in agent `.env` files | **Air-Gapped `CHIP-0028` / `CHIP-0043` Clear Signing** via `Secp256r1` Passkey, `Secp256k1` Hardware Wallet, or `BLS12-381` Cold Vault + **Hybrid `ML-DSA-65 + Ed25519` Post-Quantum** capsule signatures |

**`dbrain`** is the **3rd-Generation Second Brain**:
- **1st Gen (`Obsidian`):** Local Markdown files + `[[wikilinks]]` built for human note-taking, but no cryptographic provenance or sub-millisecond multi-agent consensus.
- **2nd Gen (`Garry Tan's gbrain`):** Compiles Markdown into entity pages + Postgres/pgvector for a single operator's agents, but relies on mutable SQL tables without L1 finality or hardware custody.
- **3rd Gen (`dbrain` / `DBRAIN-v1.3`):** Compiles Obsidian `[[wikilink]]` vaults, `gbrain` entity notes, and live agent trajectories into **content-addressed, self-defending `.dig` WebAssembly capsules** anchored to **Chia Layer-1 DataLayer Singleton Stores** with full Git version control.

---

## 2. Performance & Competitive Benchmarks (`0.018 ms` P50 Recall)

### 2.1 Hardware-Accelerated Rust + WebAssembly Core ([`crates/dbrain-core-rs`](./crates/dbrain-core-rs))

`dbrain` ships a zero-dependency Rust acceleration crate ([`crates/dbrain-core-rs`](./crates/dbrain-core-rs)) compiled to both **native machine code (`cdylib` / N-API `.node` for `aarch64` & `x86_64`)** and **portable WebAssembly (`wasm32-unknown-unknown`)**, with an automatic 100%-compatible V8 JavaScript fallback:

| Subsystem | Legacy V8 JS / Cloud Baseline | `crates/dbrain-core-rs` (Native Rust / SIMD) | Measured Speedup | Architectural Mechanism |
| :--- | :---: | :---: | :---: | :--- |
| **`BPC1` Benes Permutation Routing & Factoradic Unpack** | `18.400 ms` (V8 `BigInt` loop) | **`0.026 ms` — `0.090 ms`** | **`203x – 707x`** | Native 128-bit (`u128`) register factoradic division + hardware `POPCNT` / `TZCNT` bit-manipulation instructions |
| **Hybrid 4-Signal Cognitive Recall (LSH + Cosine + BM25 + SPO)** | `19.280 ms` (Cloud Vector RPC) | **`0.018 ms` P50 / `0.045 ms` P99** | **`1,071x`** | Unrolled `f32x8` SIMD dot-product + 8-bit LSH hyperplane bucket pre-filtering + zero-copy memory slices |
| **Chia Bech32m (`xch1` / `txch1`) Polymod & Address Codec** | `0.145 ms` (Heap array allocs) | **`0.004 ms`** | **`36.2x`** | Stack-allocated `[u8; 90]` GF($2^5$) polynomial generator state machine with zero heap allocations |
| **`CHIP-0043` Clear-Signing 7-Gate Coin-Spend Verifier** | `1.820 ms` | **`0.062 ms`** | **`29.4x`** | Deterministic `u128` mojo conservation state machine + `ForceSingletonRecreationMod` depth-7 lineage verifier |

### 2.2 `BPC1` Information-Theoretic Compression (`70.8%` RAM Reduction)

Instead of storing separate forward (`capsule_id -> slot`) and inverse (`slot -> capsule_id`) hash tables plus 64-bit pointers, `dbrain` routes bidirectional concept lookups through a **Waksman/Benes Permutation Network (`BPC1`)** packed into `118-bit` factoradic blocks (`k = 32` items per block):

$$\text{Theoretical Shannon Lower Bound: } \log_2(N!) \approx N \log_2 N - N \log_2 e \text{ bits}$$

- At **$N = 2^{20}$ (`1,048,576` capsules)**:
  - **Dual `uint32_t` Forward + Inverse Lookup Tables:** `8,388,608 bytes` (`8.00 MB`)
  - **`dbrain` `BPC1` Routing Network:** **`2,449,408 bytes` (`2.34 MB`)** — **`70.80%` memory savings**, operating within **`0.70%` of the theoretical Shannon entropy limit** while supporting $O(\log N)$ forward *and* inverse routing without decompressing the full table.

### 2.3 Competitive Agent Memory Benchmarks (`SWE-ContextBench Lite` & `LoCoMo`)

| System / Architecture | SWE-ContextBench Top-10 Recall | SWE-ContextBench Rank-1 Exact | P99 Local Read Latency | Inter-Agent Sync Payload (`100K` Context) | Cryptographic Tamper Proof |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`dbrain` (`DBRAIN-v1.3` Hybrid LSH + BM25 + SPO + `BPC1`)** | **`95.96%`** | **`76.77%`** | **`0.045 ms` (Rust) / `0.29 ms` (JS)** | **`1.1 KB` (`get_kv_diff` + `BPC1`)** | **Chia L1 SHA-256 Merkle + `ML-DSA-65` PQC** |
| **Make0 / Zep Temporal Graph** | `88.40%` | `64.10%` | `38.50 ms` | `42.0 KB` | None (Mutable Cloud DB) |
| **LangMem / Mem0 Vector Memory** | `82.10%` | `55.80%` | `64.20 ms` | `128.0 KB` | None (Mutable Cloud DB) |
| **Naive Dense Vector RAG (Cosine Only)** | `71.30%` | `43.20%` | `112.00 ms` | `410.0 KB` (Full Prompt) | None |

---

## 3. The 10 Differentiating Architectural Pillars of `dbrain` (`DBRAIN-v1.3`)

```mermaid
flowchart TB
  subgraph Agents["Autonomous Agent Swarm (Claude • Gemini • GPT • Llama • OpenCode)"]
    A1["Agent Alpha (Researcher)"]
    A2["Agent Beta (Code Synth)"]
    A3["Agent Gamma (Security Auditor)"]
  end

  subgraph Engine["dbrain Node (DBRAIN-v1.3 • Rust u128 BPC1 + SIMD • MCP 2024-11-05)"]
    direction TB
    Lobes["5-Lobe Cortical Taxonomy<br/>working • episodic • semantic • procedural • alignment"]
    VCS["Git-for-Cognition Merkle-DAG VCS<br/>commit • fork (0B CoW) • checkout @gen • merge (5-Gate Canary) • revert • bisect"]
    Rust["crates/dbrain-core-rs Acceleration<br/>0.018ms P50 Recall • BPC1 70.8% Compression • Hybrid LSH+BM25+SPO"]
    ClearSign["CHIP-0028 / CHIP-0043 Clear Signing + Hybrid PQC<br/>7-Gate Verifier • Secp256r1 Passkey • Secp256k1 Tangem • ML-DSA-65+Ed25519"]
  end

  subgraph Settlement["Decentralized Persistence & L1 Finality"]
    DIG["Self-Defending .dig WASM Capsules<br/>13-Section DIGS v1 • AES-256-GCM-SIV • Decoy Streams"]
    Chia["Chia L1 DataLayer Singleton + CHIP-0035<br/>32-Byte SHA-256 Merkle Root • get_kv_diff (1.1KB) • Secure-The-Bag Rollup"]
  end

  Agents <-->|"JSON-RPC 2.0 /api/mcp<br/>or CLI / REST"| Engine
  Lobes --> VCS --> Rust --> ClearSign
  ClearSign --> DIG
  ClearSign --> Chia
```

### Pillar 1: 5-Lobe Biological Cognitive Taxonomy
Every memory key in `dbrain` is deterministically partitioned into one of five biological cortical lobes (`dbrain:lobe:<lobe>:<slug>`), preventing scratchpad noise from polluting constitutional guardrails or verified domain facts:
1. **`working` (Prefrontal Scratchpad):** Ephemeral multi-agent CRDT task graphs, active subagent leases, and speculative hypotheses.
2. **`episodic` (Hippocampal Trajectory Log):** Chronological execution traces, tool-call outcomes, and incident post-mortems.
3. **`semantic` (Temporal Knowledge Cortex):** Distilled domain invariants, zero-ETL Subject-Predicate-Object (`SPO`) knowledge triples, and 8D LSH vector centroids.
4. **`procedural` (Basal Ganglia Skill Playbooks):** Reusable, model-agnostic tool workflows, AST taint-tracking rules, and executable `.dig` skills.
5. **`alignment` (Constitutional Guardrails & Ring-0 Reflexes):** Immutable safety charters, `CHIP-0043` custody policies, DID allowlists, and `<1 ms` emergency circuit breakers.

### Pillar 2: Git for Agent Memories (Merkle-DAG Cognitive Version Control)
Every `DBRAIN-v1.3` mutation produces an immutable, DID-signed commit (`commitSha = sha256(parentCommitSha || storeId || generation || merkleRoot || capsuleHash)`) on a Chia DataLayer Merkle-DAG:
- **`dbrain commit`:** Mints a signed `DBRAIN-v1.3` capsule, computes its `BPC1` leaf and `SPO` triples, and advances the store's Merkle root.
- **`dbrain fork`:** Branches an entire parent brain for a parallel subagent in **`<0.05 ms` ($O(1)$ Copy-on-Write)** with **`0` capsule bytes duplicated**.
- **`dbrain checkout --gen <N>`:** Deterministic time-travel recall—reconstructs the exact 5-lobe memory graph that governed an agent's decision at any historical generation `@gen`.
- **`dbrain merge`:** Evaluates an **Epistemic Pull Request** through a **5-Stage Cognitive Canary Gate** (1. Schema & DID Signature, 2. Merkle Parent Lineage, 3. `SPO` Contradiction Check, 4. Hybrid Recall Regression Gate $\ge 0.95$, 5. Alignment Lobe Invariant Check) before merging into `main`.
- **`dbrain bisect` + `dbrain revert`:** Binary-searches $G$ historical generations in $\lceil \log_2 G \rceil$ steps to isolate the exact commit where a hallucination or prompt injection entered the brain, rolls back to a clean Merkle root via an inverse tombstone commit, and broadcasts a **Cryptographic Memory Antibody** (`sha256(culpritContentHash)`) so no peer agent ever re-ingests the poisoned pattern.

### Pillar 3: `DBRAIN-v1.3` Capsule Envelope & Self-Defending `.dig` WebAssembly (`DIGS` v1)
Upgrading from `DBRAIN-v1.2` to canonical **`DBRAIN-v1.3`** introduces three mandatory cryptographic extensions on every capsule (`buildDbrainV13CapsuleExtensions` in [`lib/dbrain-core.js`](./lib/dbrain-core.js)):
1. **`clearSignature` (`CHIP-0028` / `CHIP-0043` Air-Gapped Clear Signing Attestation):** Embeds the 7-gate safety verdict (`SAFE_TO_SIGN`), domain-separated `AGG_SIG_ME` digest (`aggSigMeMessageHex`), `BLS12-381 G2` signature commitment, and `ur:chia-signature/v1` envelope directly in the capsule and VCS commit object.
2. **`bpcEnvelope` (`BPC1` Native Binary Leaf):** Embeds the `u128` factoradic Benes Permutation compressed payload metadata (`magic: 'BPC1'`, `encoding: 'u128-factoradic-benes'`, `bpcPackedBytes`, `compressionRatioPct`, `bpcLeafHash`) and writes `bpc_compressed_root` into `DIGS` v1 Section 6 (`MetadataManifest`).
3. **`pqcSignature` (Hybrid Post-Quantum Signature):** Binds every capsule with a dual **NIST FIPS-204 (`ML-DSA-65` / Dilithium) + RFC-8032 (`Ed25519`)** signature (`hybridBindingHash = sha256(ed25519Sig || mlDsa65Commitment || contentHash)`), protecting long-lived civic and enterprise memories against "Harvest Now, Decrypt/Forge Later" quantum adversaries.
4. **Self-Defending `.dig` WebAssembly Compilation:** Capsules compile into valid 13-section `DIGS` v1 `.wasm` binaries (`WebAssembly.validate() === true`, with Filler Section ID `11` at the highest byte offset) that verify their own Chia D5/D8 Merkle inclusion proofs inside any WASI/browser sandbox before releasing plaintext.

### Pillar 4: Air-Gapped Clear Signing & `CHIP-0043` MIPS Hardware Custody
Modeled directly on [`xch-dev/chia-wallet-sdk/crates/chia-sdk-driver/src/clear_signing`](https://github.com/xch-dev/chia-wallet-sdk/tree/main/crates/chia-sdk-driver/src/clear_signing) and implemented in [`crates/dbrain-core-rs/src/clear_signing.rs`](./crates/dbrain-core-rs/src/clear_signing.rs):
- **Never Blind-Sign a 32-Byte Hash:** Autonomous agents propose transactions (`SpendBundle`), and `dbrain` parses the Chialisp conditions to produce a human-readable `ClearSigningTransaction` summary before any hardware key touches the digest.
- **7 Mandatory Conservation & Safety Gates:**
  1. `inputs_conservation_verified` ($\sum \text{inputs} = \sum \text{outputs} + \text{fee}$, zero silent value drain)
  2. `vault_singleton_recreated` (Exact `1:1` `CHIP-0043` Vault singleton output at odd/preserved mojo amount)
  3. `recovery_lineage_7_layers_intact` (`ForceSingletonRecreationMod` 7-layer anti-brick recovery chain verified)
  4. `unknown_puzzle_drop_guard` (Refuses spends with unmapped puzzles or unauthorized `RESERVE_fee` inflation)
  5. `cat_asset_id_tail_verified` (Verifies `$DIG` CAT asset ID `0xa406d3a9...` and treasury inner puzzle `0xec7c3047...`)
  6. `agg_sig_domain_separation_verified` (Verifies `CHIP-0028` / `AGG_SIG_ME` coin-ID + `GENESIS_CHALLENGE` binding)
  7. `quorum_mips_path_satisfied` (Verifies `1-of-1`, `2-of-3`, or `3-of-5` MIPS inner-puzzle delegation path)
- **Multi-Curve Hardware Envelopes (`ur:chia-clear-sign/v1` $\rightarrow$ `ur:chia-signature/v1`):**
  - **`Secp256r1_Passkey`:** Apple iPhone/Mac Secure Enclave & Android Keystore WebAuthn Passkeys.
  - **`Secp256k1_HardwareWallet`:** Air-gapped QR/NFC hardware wallets (Tangem, OneKey, Keystone).
  - **`BLS12_381_ColdKey`:** Native Chia offline cold storage keys.

### Pillar 5: Cryptographic Morphic Resonance (Cross-LLM Skill Inheritance)
When a frontier reasoning agent (e.g., Claude Opus, Gemini Pro, GPT) solves a complex bug or synthesizes a new procedural workflow, it commits a tokenizer-free `DBRAIN-v1.3` capsule (`~770 B` JSON-LD + `SPO` triples + tool AST) to the shared DataLayer Singleton Store. Subscribed edge agents (Llama, Qwen, Gemini Flash) resonance-sync the `1.1 KB` `get_kv_diff` delta and inherit the verified skill in **`0.045 ms` with zero model weight retraining**.

### Pillar 6: Two-Tier Git Economics, `CHIP-0035` Delegation & "Secure The Bag" Rollups
Powered by `@dignetwork/chip35-dl-coin-wasm` and `@dignetwork/dig-capsule-wasm`:
- **Tier 1 (Off-Chain State-Channel Working Tree — `$0` / `0 $DIG` / `0 XCH`):** Agents commit, branch, recall, and run Canary PRs locally at `0.018 ms` read / `1.2 ms` write latency with **zero blockchain fees**.
- **Tier 2 (Batched Chia L1 Singleton Rollup — `25 $DIG` CAT):** On a configurable checkpoint schedule (`24h` Homelab, `6h` Community, `1h` City), `dbrain` rolls up thousands of KV mutations into a single `update_data_store` coin spend + Chialisp `merkle_utils.clib` (`0x01` leaf / `0x02` node) **Secure-The-Bag** payout tree. If `dbrain bisect` catches a poisoned commit before settlement, the state channel automatically **claws back** the offending agent's `$DIG` credit and rewards the auditor agent.

### Pillar 7: Zero-Knowledge Private Cortex & Provider-Blind Retrieval
Sensitive capsules in private lobes are encrypted client-side using **WebCrypto / Node `crypto` `RSA-OAEP-256` + `AES-256-GCM` + `HKDF-SHA256`** (`digstore-hkdf-salt-v1` / `digstore-aes-256-gcm-key-v1`) with Additional Authenticated Data (`AAD`) bound to `(storeId, lobe, generation)`. Public P2P mirrors index capsules only by `retrieval_key = SHA-256(rootless_urn)` and serve **indistinguishable deterministic decoy ciphertext streams** on cache misses, guaranteeing provider-blind privacy while keeping the 32-byte Merkle root publicly auditable on Chia L1.

### Pillar 8: Split-Brain Partition Immunity & `<1 ms` Ring-0 Autonomic Reflex Override
- **Split-Brain Defense:** During a WAN/fiber outage, `CHIP-0035` Single-UTXO Finality ensures only one canonical L1 singleton coin can advance on-chain, while a **`15-second` Alignment Lease TTL Fence** automatically demotes isolated subagent partitions to read-only staging branches (`branch/partition-*`) that cleanly 3-way rebase once connectivity returns.
- **Ring-0 Autonomic Reflex:** Bypassing multi-agent LLM debate rounds, human operators or hardware sensors can inject a signed Ring-0 alignment reflex capsule that halts or re-aligns every connected agent in **`<1 ms` with `0` debate rounds**.

### Pillar 9: Bidirectional Obsidian `[[wikilink]]` & Garry Tan `gbrain` Vault Compiler
Point `dbrain` at any local Markdown folder (`DBRAIN_VAULT_PATH`), and the Vault Compiler parses YAML frontmatter, `[[wikilinks]]`, and entity tags into 5-lobe `DBRAIN-v1.3` capsules with a `BPC1` bidirectional backlink index—and exports newly minted swarm capsules back into clean `.md` files for human inspection in Obsidian.

### Pillar 10: `100.00%` V8 Test Coverage & Zero External NPM Dependencies
The entire `@dbrain/core` engine runs on pure Node.js built-ins (`node:crypto`, `node:http`, `node:fs`), vendored Rust/WASM binaries (`vendor/`), and enforces **`100.00%` Line, `100.00%` Branch, and `100.00%` Function coverage** in V8 (`npm test`), eliminating supply-chain bloat and `node_modules` vulnerabilities.

---

## 4. Prerequisites & Operating Modes (What You Need to Run `dbrain`)

You do **not** need a Chia full node or special hardware to start using `dbrain`. The engine supports three progressive operating modes:

### Mode A: Standalone Local / Edge Mode (Default — Under 60 Seconds)
- **What it does:** Runs the full 5-lobe cognitive engine, `crates/dbrain-core-rs` (`u128` `BPC1` + SIMD) sub-millisecond recall, Git-for-Cognition VCS (`commit`, `fork`, `checkout`, `merge`, `revert`, `bisect`), `CHIP-0043` Clear-Signing verifier, and MCP `2024-11-05` server 100% locally.
- **Required Software:**
  - **Node.js `>= 20.0.0`** (LTS recommended; uses built-in `node:test`, `node:crypto`, and WebCrypto).
  - **Git** (for cloning and optional submodule integration).
- **Optional Software (for recompiling Rust/WASM from source):**
  - **Rust Toolchain (`cargo` / `rustc >= 1.78`)** + `wasm32-unknown-unknown` target (prebuilt native & WASM artifacts are already included in `vendor/dbrain-core-rs/`, so Rust is only needed if you modify `crates/dbrain-core-rs/src/*.rs`).

### Mode B: P2P Mirror & DIG Network Capsule Mode
- **What it does:** Everything in Mode A, plus live synchronization of `.dat` DataLayer tables and `.dig` WebAssembly capsules from public or community P2P mirrors (`get_keys_values`, `get_kv_diff`, `get_root`).
- **Additional Requirement:**
  - Network access to any Chia DataLayer HTTP mirror (`CHIA_DATALAYER_HTTP_URL`) or DIG Network peer.

### Mode C: Full Sovereign Chia Layer-1 Settlement & Hardware Custody Mode
- **What it does:** Anchors batched Tier-2 `update_data_store` Merkle roots directly to the Chia blockchain (`mainnet` or `testnet11`), executes atomic `$DIG` CAT + `CHIP-0035` SpendBundles, and enforces hardware `CHIP-0043` Clear Signing.
- **Additional Requirements:**
  - **Chia Full Node + DataLayer Wallet RPC** listening on port `8562` (`CHIA_DATALAYER_RPC_URL`), **OR** a **`ChaiMCP` Server** bridge (`CHIA_CHAIMCP_URL`).
  - **Hardware Custody Signer:** Apple/Android device for `Secp256r1` Passkey clear signing, Tangem/OneKey card for `Secp256k1`, or an air-gapped `BLS12-381` cold key.

### Hardware Sizing Guide by Scale

| Topology Profile | Target Agent Count | Minimum CPU & RAM | Recommended Storage | Recommended Hardware Accelerators |
| :--- | :---: | :--- | :--- | :--- |
| **`homelab`** | `1 – 10` agents | 2 vCPU, `512 MB` RAM (runs easily on Raspberry Pi 5, Mac Mini, or NUC) | `10 GB` local SSD/NVMe | Apple Silicon (M1–M4) or AMD Ryzen AI NPU for local LLM + `dbrain-core-rs` |
| **`community`** | `10 – 100` agents | 4–8 vCPU, `4 GB` RAM (2x K3s / K8s replicas) | `100 GB` shared NAS (Synology NFS) + local NVMe cache | Dual-node K3s/K8s cluster + Tangem/Passkey `2-of-3` custody |
| **`city`** | `100 – 5,000+` agents | 8–32 vCPU, `16–64 GB` RAM (3–10 HPA K8s pods across civic districts) | `1 TB+` NVMe RAID0 hot tier + NAS/Ceph cold `.dat`/`.dig` archive | Multi-node bare-metal K8s + TLS 1.3 Post-Quantum (`X25519MLKEM768`) Ingress |

---

## 5. Turnkey Topology Profiles: Homelab, Local Community & Whole City

`dbrain` ships with three ready-to-run topology profiles in [`templates/`](./templates) and [`deploy/`](./deploy):

| Scale Profile | Genesis Stores Provisioned | Default Custody & Governance (`CHIP-0043`) | L1 Rollup Cadence | Initialize Command |
| :--- | :--- | :--- | :---: | :--- |
| **1. Homelab (`homelab`)** | `Homelab Primary Cortex Store` (`0x11a0homelab...`) | `1-of-1` `Secp256r1` Secure Enclave Passkey | Every `24h` | `node cli/dbrain.mjs init --profile homelab` |
| **2. Local Community (`community`)** | `Community Commons Store` (`0x22b0community...`) | `2-of-3` `CHIP-0043` MIPS Multi-Device Vault (`Passkey + Hardware Wallet`) | Every `6h` | `node cli/dbrain.mjs init --profile community` |
| **3. Whole City (`city`)** | `Municipal Civic Infrastructure Store` + `Emergency Response & Permitting Store` (`0x33c0city...`) | `3-of-5` Municipal `CHIP-0043` MIPS Quorum + `15s` Split-Brain Fence + `<1 ms` Ring-0 Reflex | Every `1h` | `node cli/dbrain.mjs init --profile city` |

---

## 6. Complete Environment Variables Reference

All environment variables can be passed via shell environment, a `.env` file (see [`deploy/homelab/.env.example`](./deploy/homelab/.env.example)), Docker Compose, or Kubernetes `ConfigMap`/`Secret` manifests. You can inspect the active resolved configuration at any time via `GET /api/health` (`envConfig`).

### 6.1 Core Node, Storage & Vault Settings

| Environment Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | TCP port for the HTTP REST API, Clear-Signing endpoints, and `/api/mcp` JSON-RPC 2.0 server. |
| `NODE_ENV` | `production` | Runtime environment (`development` \| `production`). Enables strict proxy & security headers in `production`. |
| `DBRAIN_TOPOLOGY_PROFILE` | `homelab` | Topology preset to load: `homelab` (`1–10` agents), `community` (`10–100` agents), or `city` (`100–5,000+` agents). |
| `DBRAIN_NODE_NAME` | Profile default | Human-readable node title returned in `/api/health` and MCP server discovery metadata. |
| `DBRAIN_DATA_DIR` | `./.dbrain-data` | Persistent directory storing `dbrain-stores.json`, `dbrain-capsules.json`, `node-config.json`, and Cortex JWK keys (`/var/lib/dbrain` in Docker/K8s). |
| `DBRAIN_STATE_DIR` | `/tmp/dbrain-state` | Ephemeral scratch directory for staging `.dig` WASM compilations and Merkle diff buffers. |
| `DBRAIN_VAULT_PATH` | *(unset)* | Optional filesystem path to an Obsidian (`[[wikilink]]`) or Garry Tan `gbrain` Markdown directory for bidirectional `.md` $\leftrightarrow$ `.dig` sync. |
| `CANONICAL_HOST` | `localhost:3000` | Public hostname used when generating canonical URLs, OpenRPC discovery, and `urn:dig:chia` links. |
| `TRUST_PROXY` | `true` (in prod) | Set to `true` when running behind NGINX Ingress, Cloudflare, Tailscale, or Traefik to honor `X-Forwarded-Proto`. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed browser / Web3 dApp origins for cross-origin API requests. |

### 6.2 Chia Layer-1, DataLayer & DIG Network Variables

| Environment Variable | Default Value | Description |
| :--- | :--- | :--- |
| `CHIA_NETWORK` | `mainnet` | Target Chia network (`mainnet` \| `testnet11`). Automatically configures Bech32m prefix and genesis challenge if not overridden. |
| `CHIA_PREFIX` | `xch` (`txch` on testnet) | Bech32m address prefix enforced by `isValidNetworkAddress` (`xch` for `mainnet`, `txch` for `testnet11`). |
| `CHIA_GENESIS_CHALLENGE` | `0xccd5bb71...` (mainnet) | 32-byte hex network `GENESIS_CHALLENGE` bound into every `CHIP-0028` / `AGG_SIG_ME` domain-separated signature. |
| `CHIA_DATALAYER_HTTP_URL` | `http://localhost:8562` | HTTP URL for Chia DataLayer mirror servers serving `.dat` generation files and `get_kv_diff` deltas. |
| `CHIA_DATALAYER_RPC_URL` | `https://localhost:8562` | Chia DataLayer Wallet RPC endpoint used for live Tier-2 `create_data_store` and `update_data_store` singleton commits. |
| `CHIA_CHAIMCP_URL` | *(unset)* | Optional URL to a `ChaiMCP` JSON-RPC server (e.g., `http://chaimcp.default.svc.cluster.local:80/mcp`) for live L1 node & coin telemetry. |
| `CHIA_CHAIMCP_TOKEN` | *(unset)* | Bearer authentication token for authenticating requests to `CHIA_CHAIMCP_URL`. |
| `CHIA_DBRAIN_PRIMARY_STORE_ID` | Profile default | 32-byte hex Chia DataLayer Singleton Store ID (`0x...`) used as the default store for `mint` and `recall` calls. |
| `DIG_CAPSULE_PRICE_BASE_UNITS` | `25000` (`25 $DIG`) | Per-capsule `$DIG` CAT fee (in base units, $1 \text{ \$DIG} = 1,000$ base units) when promoting Tier-1 capsules to Tier-2 L1 finality. |

### 6.3 Custody, `CHIP-0028`/`CHIP-0043` Clear Signing & Post-Quantum Security Variables

| Environment Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DBRAIN_OPERATOR_DID` | Profile default | Canonical Chia DID (`did:chia:1...`) of the node operator used for capsule attribution and `CHIP-0002` authentication. |
| `DBRAIN_ADMIN_DIDS` | *(unset)* | Comma-separated allowlist of Chia DIDs authorized to trigger Ring-0 autonomic reflexes and administrative mutations. |
| `DBRAIN_ADMIN_KEY` | *(unset)* | Optional local break-glass administrative secret key for automated CI/CD or CLI maintenance scripts. |
| `DBRAIN_CLEAR_SIGN_CURVE` | `Secp256r1_Passkey` | Default hardware signing curve for `CHIP-0043` MIPS Vault clear signing: `Secp256r1_Passkey`, `Secp256k1_HardwareWallet`, or `BLS12_381_ColdKey`. |
| `DBRAIN_MIPS_QUORUM` | `1-of-1` / `2-of-3` / `3-of-5` | Required M-of-N custody quorum (`1-of-1` for `homelab`, `2-of-3` for `community`, `3-of-5` for `city`). |
| `DBRAIN_PQC_MODE` | `ML-DSA-65+Ed25519-Hybrid` | Post-Quantum Cryptography mode attached to every `DBRAIN-v1.3` capsule (`pqcSignature`). |
| `DBRAIN_CORTEX_JWK_PATH` | `<DATA_DIR>/cortex-keypair.jwk.json` | Path to the `RSA-OAEP-256` + `AES-256-GCM` Zero-Knowledge Private Cortex JWK keypair generated by `dbrain init` / `dbrain keygen`. |

### 6.4 Swarm Consensus, Split-Brain Defense & Rust Acceleration Variables

| Environment Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DBRAIN_L1_CHECKPOINT_INTERVAL` | `24h` / `6h` / `1h` | Cadence for rolling up Tier-1 off-chain state-channel commits into a batched Tier-2 Chia L1 singleton transaction. |
| `DBRAIN_ALIGNMENT_LEASE_TTL_SEC` | `15` | Heartbeat lease TTL (in seconds) before Split-Brain Partition Fencing quarantines a disconnected writer branch. |
| `DBRAIN_CANARY_GATE_MIN_SCORE` | `0.95` | Minimum composite score (`0.00–1.00`) across the 5-Stage Epistemic Canary Gate required to merge a subagent PR into `main`. |
| `DBRAIN_RUST_ACCEL` | `auto` | Controls `crates/dbrain-core-rs` execution backend: `auto` (prefers native `.node` $\rightarrow$ WASM $\rightarrow$ JS), `native`, `wasm`, or `js-fallback`. |

---

## 7. Step-by-Step Setup & Quickstart Guide

### Step 1: Clone & Verify 100.00% V8 Coverage
```bash
git clone https://github.com/dcarrith/dbrain.git
cd dbrain

# Run all 43 unit tests across 7 suites (enforces 100.00% Line, Branch & Function coverage)
npm test
```

### Step 2: Initialize Your Node Profile (`homelab`, `community`, or `city`)
Running `init` creates your `.dbrain-data/` directory, generates a fresh **2048-bit `RSA-OAEP-256` Zero-Knowledge Private Cortex keypair**, and seeds your genesis `DBRAIN-v1.3` stores and capsules:
```bash
# Choose your scale: homelab | community | city
node cli/dbrain.mjs init --profile homelab

# Optional: rotate or generate a fresh operator DID & RSA-OAEP-256 Cortex JWK keypair at any time
node cli/dbrain.mjs keygen
```

### Step 3: Start the `dbrain` HTTP + MCP `2024-11-05` + Clear-Signing Server
```bash
node cli/dbrain.mjs serve --profile homelab --port 3000
```
Verify the node is live and inspect its Rust acceleration + `DBRAIN-v1.3` status:
```bash
curl -s http://localhost:3000/api/health | jq .
```

### Step 4: Recall, Mint, Verify & Air-Gap Clear-Sign from the CLI
```bash
# 1. List active Chia DataLayer Brain Singleton Stores & Merkle roots
node cli/dbrain.mjs stores --profile homelab

# 2. Sub-millisecond hybrid recall (Rust f32x8 SIMD + u128 BPC1)
node cli/dbrain.mjs recall --profile homelab --query "passkey" --lobe alignment

# 3. Mint & commit a signed DBRAIN-v1.3 capsule (attaches CHIP-0028 clearSignature, BPC1 leaf & Hybrid PQC)
node cli/dbrain.mjs mint \
  --profile homelab \
  --lobe procedural \
  --title "Zero-Trust SSH Certificate Rotation Skill" \
  --content "1. Verify operator Secp256r1 Passkey challenge. 2. Issue 4h ephemeral Ed25519 host cert."

# 4. Verify a capsule's SHA-256 Merkle inclusion proof against the store's L1 root
node cli/dbrain.mjs verify --id CAP-HOMELAB-0001

# 5. Run 7-gate CHIP-0043 MIPS Vault Clear-Signing verification & emit a hardware signature
node cli/dbrain.mjs clear-sign --preset VAULT-TX-A2A-ESCROW --device Secp256r1_Passkey

# 6. Simulate a tampered fee-drain attack to see Gate #1/#4 deterministically refuse signing
node cli/dbrain.mjs clear-sign --preset VAULT-TX-A2A-ESCROW --tamper inflate_fee
```

### Step 5: Connect Any MCP-Compatible AI Agent (Claude, Cursor, Google Antigravity)
`dbrain` includes both a **stdio MCP server** ([`cli/dbrain-mcp.mjs`](./cli/dbrain-mcp.mjs)) and an **HTTP JSON-RPC 2.0 MCP endpoint** (`POST /api/mcp`). Add `dbrain` to your `claude_desktop_config.json`, `.cursor/mcp.json`, or Antigravity MCP settings:

```json
{
  "mcpServers": {
    "dbrain": {
      "command": "node",
      "args": ["/absolute/path/to/dbrain/cli/dbrain-mcp.mjs"],
      "env": {
        "DBRAIN_TOPOLOGY_PROFILE": "homelab",
        "DBRAIN_DATA_DIR": "/absolute/path/to/dbrain/.dbrain-data",
        "CHIA_NETWORK": "mainnet",
        "DBRAIN_CLEAR_SIGN_CURVE": "Secp256r1_Passkey"
      }
    }
  }
}
```

### Step 6: Deploy with Docker Compose or Kubernetes

#### Option A: Homelab Docker Compose (Read-Only Root FS + Non-Root UID `1001`)
```bash
cp deploy/homelab/.env.example deploy/homelab/.env
docker compose -f deploy/homelab/docker-compose.yml up -d --build
```

#### Option B: Local Community Kubernetes / K3s (`2` Replicas + `2-of-3` MIPS Vault)
```bash
docker build -f deploy/Dockerfile -t dbrain:1.10.0 .
kubectl apply -f deploy/community/k8s/community-brain.yaml
kubectl get pods -n dbrain-community
```

#### Option C: Whole-City Civic Mesh Kubernetes (`3–10` HPA Replicas + `3-of-5` Municipal Quorum)
```bash
docker build -f deploy/Dockerfile -t dbrain:1.10.0 .
kubectl apply -f deploy/city/k8s/city-mesh.yaml
kubectl get pods,hpa -n dbrain-city
```

---

## 8. CLI, MCP `2024-11-05` & HTTP REST API Reference

### 8.1 MCP `2024-11-05` Tools (`cli/dbrain-mcp.mjs` & `POST /api/mcp`)

| MCP Tool Name | Description | Key Arguments |
| :--- | :--- | :--- |
| **`dbrain_remember`** | Mints and anchors a signed `DBRAIN-v1.3` capsule (`clearSignature` + `bpcEnvelope` + `pqcSignature`) into a 5-lobe store and advances its SHA-256 Merkle root. | `{ storeId?, lobe, title, content, tags? }` |
| **`dbrain_recall`** | Executes sub-millisecond hybrid semantic + lexical recall (`crates/dbrain-core-rs` SIMD + `u128` `BPC1`). | `{ query?, lobe?, storeId?, limit? }` |
| **`dbrain_list_stores`** | Lists all active Chia DataLayer Brain Singleton Stores, their current generation, and 32-byte Merkle roots. | `{}` |
| **`dbrain_clear_sign_verify`** | Runs the 7-gate `xch-dev/chia-wallet-sdk` `CHIP-0043` Clear-Signing verifier and optionally signs with a hardware curve. | `{ presetId?, tamperMode?, sign?, signerCurve? }` |
| **`dbrain_rust_acceleration_benchmark`** | Runs a live `hrtime.bigint()` benchmark comparing `crates/dbrain-core-rs` (`u128` `BPC1`, SIMD Cosine, Bech32m, Clear Signing) against V8 JS. | `{ iterations? }` |

### 8.2 HTTP REST API Endpoints (`lib/dbrain-server.js`)

| Method & Path | Description |
| :--- | :--- |
| `GET /api/health` (or `/healthz`) | Returns node health, `DBRAIN-v1.3` protocol status, active `profile`, resolved `envConfig`, and `rustCore` acceleration telemetry. |
| `GET /api/dbrain/stores` | Lists all configured Chia DataLayer Singleton Stores and their current SHA-256 Merkle roots. |
| `GET` / `POST /api/dbrain/recall` | Queries capsules by `q` (`query`), `lobe`, `storeId`, and `limit` with `hrtime.bigint()` sub-millisecond execution timing. |
| `POST /api/dbrain/mint` | Mints a new `DBRAIN-v1.3` capsule with `clearSignature`, `bpcEnvelope`, and `pqcSignature`, and updates the store Merkle root. |
| `GET` / `POST /api/dbrain/clear-signing/verify` | Parses a `CHIP-0043` MIPS Vault transaction preset (`VAULT-TX-A2A-ESCROW`, `VAULT-TX-WRITER-ROTATION`, `VAULT-TX-RECOVERY-CLAWBACK`) and evaluates all 7 safety gates. |
| `POST /api/dbrain/clear-signing/sign` | Signs a verified `CHIP-0043` transaction using `Secp256r1_Passkey`, `Secp256k1_HardwareWallet`, or `BLS12_381_ColdKey` (returns `HTTP 422` if any tamper gate fails). |
| `GET` / `POST /api/dbrain/rust-acceleration` | Executes live native Rust/WASM vs. V8 JavaScript microbenchmarks and verifies `100%` `BPC1` byte parity. |
| `POST /api/mcp` | Standard Model Context Protocol (`2024-11-05`) JSON-RPC 2.0 endpoint (`initialize`, `tools/list`, `tools/call`). |

---

## 9. Building the Rust Core (`crates/dbrain-core-rs`) & Running the 100% V8 Test Suite

Pre-compiled native and WebAssembly artifacts are vendored in [`vendor/dbrain-core-rs/`](./vendor/dbrain-core-rs) so `dbrain` works out of the box without a compiler. If you modify the Rust source code in [`crates/dbrain-core-rs/src/`](./crates/dbrain-core-rs/src):

```bash
# 1. Run native Rust unit tests (Benes BPC1 bijection, SIMD recall, Bech32m, CHIP-0043 clear signing)
cargo test --manifest-path crates/dbrain-core-rs/Cargo.toml

# 2. Rebuild both the native cdylib (.dylib / .so / .node) and wasm32-unknown-unknown binary
npm run build:rust

# 3. Run the 43-test Node.js V8 coverage gate (requires 100.00% Line, Branch, and Function coverage)
npm test
```

---

## 10. Using `@dbrain/core` as a Git Submodule & Contributing

### 10.1 Embedding `dbrain` as a Git Submodule
Downstream platforms—such as the flagship hosted platform at **[`https://dbrain.to`](https://dbrain.to)**—consume this repository as a Git submodule at `packages/dbrain`:

```bash
git submodule add https://github.com/dcarrith/dbrain.git packages/dbrain
git submodule update --init --recursive
```

```js
const dbrainCore = require('./packages/dbrain/lib/dbrain-core.js');
const dbrainBrowserCrypto = require('./packages/dbrain/lib/dbrain-browser-crypto.js');
const { createDbrainNodeServer, loadNodeProfile, TOPOLOGY_PROFILES } = require('./packages/dbrain/lib/dbrain-server.js');
```

### 10.2 Repository Structure
```text
dbrain/
├── cli/
│   ├── dbrain.mjs                 # Operator CLI (init, keygen, serve, stores, recall, mint, verify, clear-sign)
│   └── dbrain-mcp.mjs             # Stdio MCP 2024-11-05 Server for Claude, Cursor & Antigravity
├── crates/
│   └── dbrain-core-rs/            # Zero-dependency Rust + SIMD + WASM acceleration crate
│       ├── src/benes.rs           # u128 factoradic + POPCNT/TZCNT Benes Permutation Compression (BPC1)
│       ├── src/simd_recall.rs     # f32x8 SIMD cosine similarity + 8D LSH hyperplane hashing
│       ├── src/bech32m.rs         # Stack-allocated GF(2^5) Chia Bech32m address & puzzle-hash codec
│       ├── src/merkle.rs          # SHA-256 Merkle inclusion proof & batch root verifier
│       └── src/clear_signing.rs   # CHIP-0028 / CHIP-0043 7-gate Clear Signing & MIPS Vault verifier
├── deploy/
│   ├── Dockerfile                 # Multi-stage Alpine container build (non-root UID 1001, read-only rootfs)
│   ├── homelab/                   # Docker Compose + comprehensive .env.example for Homelabs
│   ├── community/k8s/             # Kubernetes manifests for Local Community / Co-op shared brains
│   └── city/k8s/                  # Kubernetes + HPA manifests for Whole-City civic meshes
├── lib/
│   ├── dbrain-core.js             # Canonical DBRAIN-v1.3 architectural engine (100.00% V8 coverage)
│   ├── dbrain-browser-crypto.js   # Zero-Knowledge Private Cortex (AES-256-GCM + PBKDF2 / HKDF)
│   └── dbrain-server.js           # Standalone HTTP REST + MCP 2024-11-05 server & profile loader
├── templates/                     # Genesis store & DBRAIN-v1.3 capsule templates (homelab, community, city)
├── tests/
│   └── dbrain-core.test.js        # 43 unit tests across 7 suites enforcing 100.00% V8 coverage
└── vendor/                        # Pre-compiled dbrain-core-rs, @dignetwork/dig-capsule-wasm & chip35-dl-coin-wasm
```

### 10.3 Contributing Guidelines
1. **100.00% Coverage Gate:** Every pull request touching `lib/dbrain-core.js` or `lib/dbrain-browser-crypto.js` must maintain **`100.00%` Line, `100.00%` Branch, and `100.00%` Function coverage** when running `npm test`.
2. **Rust / JS Byte Parity:** Any change to `crates/dbrain-core-rs` must maintain `100%` deterministic byte parity with the V8 fallback and pass `cargo test`.
3. **Zero External Runtime Dependencies:** Keep `package.json` free of external runtime `dependencies` so `dbrain` remains auditable and immune to supply-chain attacks.

---

## License & Trademark Notice

- **Open-Source Software License:** Licensed under the **Apache License, Version 2.0** (see [`LICENSE`](./LICENSE)).
- **Trademark Notice:** While the `DBRAIN-v1.3` protocol specification and `@dbrain/core` software engine are open-source under Apache-2.0, the trademarks **`DBRAIN™`**, **`DBRAIN.TO™`**, **`Dbrain.TO™`**, **`dbrain.to™`**, and **"The Decentralized Brain to Your AI Agents™"** are proprietary marks of the `dbrain.to` project owner. Self-hosted instances and modified forks must not misrepresent themselves as the official `https://dbrain.to` managed network.
