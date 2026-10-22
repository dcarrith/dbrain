#!/usr/bin/env node
/**
 * ============================================================================
 * cli/dbrain.mjs — Open-Source Decentralized Brain CLI
 * ============================================================================
 * Turnkey command-line interface for Homelabs, Local Communities, and Cities:
 *   node cli/dbrain.mjs init --profile homelab|community|city
 *   node cli/dbrain.mjs keygen
 *   node cli/dbrain.mjs serve --profile homelab --port 3000
 *   node cli/dbrain.mjs stores
 *   node cli/dbrain.mjs recall --query "zoning" --lobe semantic
 *   node cli/dbrain.mjs mint --lobe procedural --title "SOP" --content "..."
 *   node cli/dbrain.mjs verify --id CAP-HOMELAB-0001
 *   node cli/dbrain.mjs clear-sign --preset VAULT-TX-A2A-ESCROW --device secp256r1_passkey
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const dbrainCore = require('../lib/dbrain-core.js');
const {
  TOPOLOGY_PROFILES,
  loadNodeProfile,
  recallNodeCapsules,
  createDbrainNodeServer
} = require('../lib/dbrain-server.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const cmd = args[0] || 'help';

function getFlag(name, fallback = '') {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

async function run() {
  if (cmd === 'init') {
    const profileId = getFlag('profile', 'homelab').toLowerCase();
    const profile = TOPOLOGY_PROFILES[profileId] || TOPOLOGY_PROFILES.homelab;
    const outDir = path.resolve(getFlag('dir', path.join(process.cwd(), '.dbrain-data')));
    fs.mkdirSync(outDir, { recursive: true });

    const storesSrc = path.join(ROOT, 'templates', profile.storesTemplate);
    const capsulesSrc = path.join(ROOT, 'templates', profile.capsulesTemplate);
    fs.copyFileSync(storesSrc, path.join(outDir, 'dbrain-stores.json'));
    fs.copyFileSync(capsulesSrc, path.join(outDir, 'dbrain-capsules.json'));

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'jwk' },
      privateKeyEncoding: { type: 'pkcs8', format: 'jwk' }
    });
    const kid = `dbrain-${profile.id}-${crypto.randomBytes(4).toString('hex')}`;
    const pubJwk = { ...publicKey, alg: 'RSA-OAEP-256', use: 'enc', kid };
    const privJwk = { ...privateKey, alg: 'RSA-OAEP-256', use: 'enc', kid };

    fs.writeFileSync(path.join(outDir, 'cortex-public-key.jwk.json'), JSON.stringify(pubJwk, null, 2));
    fs.writeFileSync(path.join(outDir, 'cortex-private-key.offline.jwk.json'), JSON.stringify(privJwk, null, 2), { mode: 0o600 });

    const operatorDid = `did:chia:1${profile.id}${crypto.randomBytes(16).toString('hex')}`;
    const config = {
      nodeName: profile.name,
      profile: profile.id,
      scale: profile.scale,
      recommendedCustody: profile.recommendedCustody,
      operatorDid,
      dataDir: outDir,
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(outDir, 'dbrain.config.json'), JSON.stringify(config, null, 2));

    console.log(`\n✅ Initialized Decentralized Brain (${profile.name})`);
    console.log(`  Profile        : ${profile.id} (${profile.scale})`);
    console.log(`  Custody Model  : ${profile.recommendedCustody}`);
    console.log(`  Operator DID   : ${operatorDid}`);
    console.log(`  Data Directory : ${outDir}`);
    console.log(`  Public JWK     : ${path.join(outDir, 'cortex-public-key.jwk.json')}`);
    console.log(`  Offline Key    : ${path.join(outDir, 'cortex-private-key.offline.jwk.json')} (move to cold storage)`);
    console.log(`\nNext step: node cli/dbrain.mjs serve --profile ${profile.id}\n`);
    return;
  }

  if (cmd === 'keygen') {
    const { publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'jwk' },
      privateKeyEncoding: { type: 'pkcs8', format: 'jwk' }
    });
    const kid = `dbrain-cortex-${crypto.randomBytes(4).toString('hex')}`;
    const did = `did:chia:1operator${crypto.randomBytes(16).toString('hex')}`;
    console.log(JSON.stringify({
      operatorDid: did,
      publicJwk: { ...publicKey, alg: 'RSA-OAEP-256', use: 'enc', kid }
    }, null, 2));
    return;
  }

  if (cmd === 'serve') {
    const profile = getFlag('profile', process.env.DBRAIN_TOPOLOGY_PROFILE || 'homelab');
    const port = Number(getFlag('port', process.env.PORT || 3000));
    const { server, state } = createDbrainNodeServer({ profile });
    server.listen(port, () => {
      console.log(`🧠 dbrain (${state.profile.name}) listening on http://localhost:${port}`);
      console.log(`   Scale   : ${state.profile.scale}`);
      console.log(`   Custody : ${state.profile.recommendedCustody}`);
      console.log(`   Stores  : ${state.stores.length} | Capsules: ${state.capsules.length}`);
    });
    return;
  }

  const profile = getFlag('profile', process.env.DBRAIN_TOPOLOGY_PROFILE || 'homelab');
  const state = loadNodeProfile({ profile });

  if (cmd === 'stores') {
    console.log(`\n🧠 dbrain (${state.profile.name}) — Active Chia DataLayer Singleton Stores (${state.stores.length})\n`);
    for (const s of state.stores) {
      console.log(`• ${s.name}`);
      console.log(`  Store ID   : ${s.storeId}`);
      console.log(`  DIG URI    : ${s.digUri}`);
      console.log(`  Merkle Root: ${s.merkleRoot} (Gen #${s.generation})`);
      console.log(`  Read P99   : ${s.readLatencyP99Ms}ms | Delta Compression: ${s.deltaSyncCompressionPct}%\n`);
    }
    return;
  }

  if (cmd === 'recall') {
    const query = getFlag('query', getFlag('q', ''));
    const lobe = getFlag('lobe', 'all');
    const storeId = getFlag('store', 'all');
    const t0 = process.hrtime.bigint();
    const res = recallNodeCapsules(state.capsules, { query, lobe, storeId, limit: 10 });
    const ms = (Number(process.hrtime.bigint() - t0) / 1e6).toFixed(4);
    console.log(`\n⚡ dbrain Recall (${ms}ms via crates/dbrain-core-rs) — ${res.total} capsules matched:\n`);
    for (const c of res.capsules) {
      console.log(`[${c.id}] (${c.lobe.toUpperCase()}) ${c.title} [Score: ${c.relevanceScore}]`);
      console.log(`  Key    : ${c.key}`);
      console.log(`  SHA256 : ${c.contentHash}`);
      console.log(`  Summary: ${c.summary}\n`);
    }
    return;
  }

  if (cmd === 'mint') {
    const lobe = getFlag('lobe', 'semantic');
    const title = getFlag('title', 'Autonomous Agent Memory Capsule');
    const content = getFlag('content', 'Verified reasoning trace committed via dbrain CLI.');
    const targetStore = state.stores[0];
    const minted = dbrainCore.mintCognitiveCapsule({
      store: targetStore,
      capsules: state.capsules,
      stores: state.stores,
      lobe,
      title,
      content,
      summary: title,
      tags: ['cli', state.profile.id],
      authorDid: targetStore.ownerDid
    });
    console.log(`\n✅ Minted DBRAIN-v1.3 Capsule: ${minted.capsule.id}`);
    console.log(`  Store ID      : ${minted.capsule.storeId}`);
    console.log(`  DataLayer Key : ${minted.capsule.key}`);
    console.log(`  Content SHA256: ${minted.capsule.contentHash}`);
    console.log(`  New Store Root: ${minted.store.merkleRoot}\n`);
    return;
  }

  if (cmd === 'verify') {
    const capId = getFlag('id', state.capsules[0]?.id || 'CAP-HOMELAB-0001');
    const cap = state.capsules.find(c => c.id === capId) || state.capsules[0];
    const proof = dbrainCore.computeMerkleInclusionProof(cap, state.capsules);
    console.log(`\n🔐 Chia DataLayer SHA-256 Merkle Inclusion Proof — ${cap.id}`);
    console.log(`  Store ID     : ${cap.storeId}`);
    console.log(`  Leaf Hash    : ${proof.leafHash}`);
    console.log(`  Computed Root: ${proof.computedMerkleRoot}`);
    console.log(`  Verified     : ${proof.verified ? '✅ VERIFIED' : '❌ MISMATCH'}\n`);
    return;
  }

  if (cmd === 'clear-sign') {
    const presetId = getFlag('preset', 'VAULT-TX-A2A-ESCROW');
    const signerCurve = getFlag('device', getFlag('curve', 'Secp256r1_Passkey'));
    const tamperMode = getFlag('tamper', 'none');
    const signed = dbrainCore.signAirGappedClearSigningEnvelope({
      presetId,
      signerCurve,
      tamperMode
    });
    console.log(`\n🛡️  CHIP-0043 MIPS Air-Gapped Clear Signing (${presetId})`);
    console.log(`  Status       : ${signed.status}`);
    console.log(`  Signer Curve : ${signed.signerCurve}`);
    if (signed.signed) {
      console.log(`  Digest (32B) : ${signed.secpPrehashedMessageHashHex}`);
      console.log(`  Signature UR : ${signed.urResponsePayload}\n`);
    } else {
      console.log(`  Refusal Error: ${signed.errorCode} — ${signed.failureReason}\n`);
    }
    return;
  }

  console.log(`
dbrain CLI — Open-Source Decentralized Brain Engine (Homelab • Community • City)

Commands:
  init --profile <homelab|community|city>       Initialize node config, genesis stores & RSA-OAEP-256 keys
  keygen                                        Generate fresh operator DID & RSA-OAEP-256 Cortex JWK
  serve [--profile <p>] [--port 3000]           Start HTTP + MCP 2024-11-05 + Clear-Signing server
  stores [--profile <p>]                        List active Chia DataLayer Singleton Stores
  recall --query "<text>" [--lobe <lobe>]       Sub-millisecond hybrid recall (Rust SIMD + u128 BPC)
  mint --lobe <lobe> --title "<t>" --content "<c>"  Mint & commit a signed DBRAIN-v1.3 capsule
  verify --id <capsuleId>                       Verify SHA-256 Merkle inclusion proof
  clear-sign [--preset <id>] [--device <dev>]   Run 7-step CHIP-0043 Clear Signing verification & sign
`);
}

run().catch(err => {
  console.error('CLI Error:', err.message);
  process.exit(1);
});
