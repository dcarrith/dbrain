'use strict';

/**
 * ============================================================================
 * lib/dbrain-server.js — Open-Source Decentralized Brain HTTP & MCP Node Server
 * ============================================================================
 * Powers standalone Homelab, Local Community, and Whole-City `dbrain` nodes,
 * and exports reusable topology profile loaders for downstream hosts (such as
 * `dbrain.to`).
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dbrainCore = require('./dbrain-core.js');
const dbrainBrowserCrypto = require('./dbrain-browser-crypto.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates');

const TOPOLOGY_PROFILES = {
  homelab: {
    id: 'homelab',
    name: 'Homelab Sovereign Brain',
    scale: 'Single Node / Mini-PC / RPi5 / Ryzen AI NPU (1–10 Agents)',
    recommendedCustody: '1-of-1 Secp256r1 Passkey (Apple/Android Secure Enclave) + 24h Batched L1 Checkpoint',
    storesTemplate: 'homelab-stores.json',
    capsulesTemplate: 'homelab-capsules.json'
  },
  community: {
    id: 'community',
    name: 'Local Community & Co-op Shared Brain',
    scale: 'Local K3s / Kubernetes + Shared NAS (10–100 Agents / Members)',
    recommendedCustody: '2-of-3 CHIP-0043 MIPS Multi-Device Vault (Passkey + Tangem Hardware Wallet) + 6h L1 Checkpoint',
    storesTemplate: 'community-stores.json',
    capsulesTemplate: 'community-capsules.json'
  },
  city: {
    id: 'city',
    name: 'Whole-City Municipal & Civic Mesh Brain',
    scale: 'Multi-District Federated Kubernetes + Post-Quantum TLS 1.3 (100–5,000+ Civic & Infrastructure Agents)',
    recommendedCustody: '3-of-5 Municipal CHIP-0043 MIPS Quorum + 15s Split-Brain Partition Fence + <1ms Ring-0 Emergency Reflex',
    storesTemplate: 'city-stores.json',
    capsulesTemplate: 'city-capsules.json'
  }
};

function normalizeTemplateCapsule(cap, stores) {
  const content = String(cap.content || '');
  const contentHash = cap.contentHash || ('0x' + crypto.createHash('sha256').update(content, 'utf8').digest('hex'));
  const keyHex = String(cap.keyHex || Buffer.from(String(cap.key || ''), 'utf8').toString('hex')).replace(/^0x/, '');
  const store = stores.find(s => s.storeId === cap.storeId) || stores[0];
  return {
    ...cap,
    keyHex,
    contentHash,
    sizeBytes: cap.sizeBytes || Buffer.byteLength(content, 'utf8'),
    embeddingPreview: cap.embeddingPreview || dbrainCore.computeDeterministicEmbedding(`${cap.title || ''} ${content}`),
    merkleRoot: cap.merkleRoot || (store ? store.merkleRoot : '0x0')
  };
}

function recallNodeCapsules(capsules, { query = '', lobe = 'all', storeId = 'all', limit = 10 } = {}) {
  const qLow = String(query || '').trim().toLowerCase();
  const qVec = qLow ? dbrainCore.computeDeterministicEmbedding(qLow) : null;
  let filtered = capsules.filter(c => !c.revertedByCommitSha);
  if (lobe && lobe !== 'all') {
    filtered = filtered.filter(c => c.lobe === lobe);
  }
  if (storeId && storeId !== 'all') {
    filtered = filtered.filter(c => c.storeId === storeId);
  }

  const scored = filtered.map(c => {
    const textLow = `${c.title} ${c.summary} ${c.content} ${(c.tags || []).join(' ')}`.toLowerCase();
    let score = 0.85;
    if (qLow) {
      const lexicalMatch = textLow.includes(qLow) ? 0.55 : 0;
      const vec = c.embeddingPreview || dbrainCore.computeDeterministicEmbedding(textLow);
      const sim = (dbrainCore.cosineSimilarity(qVec, vec) + 1) / 2;
      score = Number(Math.min(0.998, lexicalMatch + sim * 0.45).toFixed(4));
    }
    return { ...c, relevanceScore: score };
  });

  if (qLow) {
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  const results = scored.slice(0, Number(limit) || 10);
  return {
    total: results.length,
    capsules: results
  };
}

function loadNodeProfile(options = {}) {
  const profileId = String(options.profile || process.env.DBRAIN_TOPOLOGY_PROFILE || 'homelab').toLowerCase();
  const profile = TOPOLOGY_PROFILES[profileId] || TOPOLOGY_PROFILES.homelab;
  const dataDir = options.dataDir || process.env.DBRAIN_DATA_DIR || path.join(process.cwd(), '.dbrain-data');

  const customStoresPath = path.join(dataDir, 'dbrain-stores.json');
  const customCapsulesPath = path.join(dataDir, 'dbrain-capsules.json');

  const storesPath = fs.existsSync(customStoresPath)
    ? customStoresPath
    : path.join(TEMPLATES_DIR, profile.storesTemplate);
  const capsulesPath = fs.existsSync(customCapsulesPath)
    ? customCapsulesPath
    : path.join(TEMPLATES_DIR, profile.capsulesTemplate);

  const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));
  const rawCapsules = JSON.parse(fs.readFileSync(capsulesPath, 'utf8'));
  const capsules = rawCapsules.map(cap => normalizeTemplateCapsule(cap, stores));

  for (const store of stores) {
    const root = dbrainCore.computeStoreMerkleRoot(store.storeId, capsules, null, stores);
    store.merkleRoot = root;
    for (const c of capsules) {
      if (c.storeId === store.storeId) c.merkleRoot = root;
    }
  }

  return {
    profile,
    dataDir,
    stores,
    capsules
  };
}

function createDbrainNodeServer(options = {}) {
  const state = loadNodeProfile(options);
  const nodeName = options.nodeName || process.env.DBRAIN_NODE_NAME || state.profile.name;

  function sendJson(res, status, payload) {
    const body = JSON.stringify(payload, null, 2);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    });
    res.end(body);
  }

  function readJsonBody(req) {
    return new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', chunk => {
        raw += chunk;
        if (raw.length > 2 * 1024 * 1024) {
          reject(new Error('Payload too large'));
        }
      });
      req.on('end', () => {
        if (!raw.trim()) return resolve({});
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname === '/api/health' || pathname === '/healthz') {
      return sendJson(res, 200, {
        status: 'ok',
        nodeName,
        profile: state.profile,
        version: '1.10.0',
        rustCore: dbrainCore.getRustCoreCapabilities(),
        totalStores: state.stores.length,
        totalCapsules: state.capsules.length
      });
    }

    if (pathname === '/api/dbrain/stores' && req.method === 'GET') {
      return sendJson(res, 200, {
        profile: state.profile.id,
        total: state.stores.length,
        stores: state.stores
      });
    }

    if (pathname === '/api/dbrain/recall' && (req.method === 'GET' || req.method === 'POST')) {
      const body = req.method === 'POST' ? await readJsonBody(req) : {};
      const query = String(body.query ?? url.searchParams.get('q') ?? '');
      const lobe = String(body.lobe ?? url.searchParams.get('lobe') ?? 'all');
      const storeId = String(body.storeId ?? url.searchParams.get('storeId') ?? 'all');
      const limit = Number(body.limit ?? url.searchParams.get('limit') ?? 10);
      const t0 = process.hrtime.bigint();
      const result = recallNodeCapsules(state.capsules, { query, lobe, storeId, limit });
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
      return sendJson(res, 200, {
        ...result,
        executionTimeMs: Number(elapsedMs.toFixed(4)),
        readSource: 'dbrain-core-rs (SIMD + u128 BPC)'
      });
    }

    if (pathname === '/api/dbrain/mint' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const targetStore = state.stores.find(s => s.storeId === body.storeId) || state.stores[0];
      const minted = dbrainCore.mintCognitiveCapsule({
        store: targetStore,
        capsules: state.capsules,
        stores: state.stores,
        lobe: body.lobe || 'semantic',
        title: body.title || 'Autonomous Agent Memory Capsule',
        content: body.content || 'Verified memory capsule',
        summary: body.summary || body.title || 'Verified memory capsule',
        tags: Array.isArray(body.tags) ? body.tags : ['dbrain', state.profile.id],
        authorDid: body.authorDid || targetStore.ownerDid
      });
      return sendJson(res, 201, {
        status: 'MINTED',
        capsule: minted.capsule,
        store: minted.store
      });
    }

    if ((pathname === '/api/dbrain/clear-signing' || pathname === '/api/dbrain/clear-signing/verify') && (req.method === 'GET' || req.method === 'POST')) {
      const body = req.method === 'POST' ? await readJsonBody(req) : {};
      const presetId = String(body.presetId || url.searchParams.get('presetId') || 'VAULT-TX-A2A-ESCROW');
      const tamperMode = String(body.tamperMode || url.searchParams.get('tamperMode') || 'none');
      const verification = dbrainCore.parseAndVerifyClearSigningTransaction({ presetId, tamperMode });
      return sendJson(res, 200, {
        status: 'VERIFIED_CHIP0043_CLEAR_SIGNING',
        presetId,
        tamperMode,
        presets: dbrainCore.CLEAR_SIGNING_VAULT_PRESETS,
        verification
      });
    }

    if (pathname === '/api/dbrain/clear-signing/sign' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const signed = dbrainCore.signAirGappedClearSigningEnvelope({
        presetId: body.presetId || 'VAULT-TX-A2A-ESCROW',
        tamperMode: body.tamperMode || 'none',
        signerCurve: body.signerCurve || body.signerDevice || 'Secp256r1_Passkey'
      });
      return sendJson(res, signed.signed ? 200 : 422, signed);
    }

    if (pathname === '/api/dbrain/rust-acceleration' && (req.method === 'GET' || req.method === 'POST')) {
      return sendJson(res, 200, dbrainCore.runRustAccelerationBenchmark({ iterations: 50 }));
    }

    if (pathname === '/api/mcp' && req.method === 'POST') {
      const rpc = await readJsonBody(req);
      const { id = null, method, params = {} } = rpc;
      if (method === 'initialize') {
        return sendJson(res, 200, {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'dbrain-open-source-mcp', version: '1.10.0', profile: state.profile.id },
            capabilities: { tools: { listChanged: false } }
          }
        });
      }
      if (method === 'tools/list') {
        return sendJson(res, 200, {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              { name: 'dbrain_remember', description: 'Mint and anchor a signed DBRAIN-v1.3 memory capsule.' },
              { name: 'dbrain_recall', description: 'Sub-millisecond hybrid semantic & key-value recall.' },
              { name: 'dbrain_list_stores', description: 'List active Chia DataLayer Brain Singleton Stores.' },
              { name: 'dbrain_clear_sign_verify', description: 'Verify a CHIP-0043 MIPS Vault transaction via xch-dev/chia-wallet-sdk clear_signing.' },
              { name: 'dbrain_rust_acceleration_benchmark', description: 'Run crates/dbrain-core-rs native/WASM benchmark.' }
            ]
          }
        });
      }
      if (method === 'tools/call') {
        const name = params.name;
        const args = params.arguments || {};
        let out;
        if (name === 'dbrain_list_stores') out = { total: state.stores.length, stores: state.stores };
        else if (name === 'dbrain_recall') out = recallNodeCapsules(state.capsules, args);
        else if (name === 'dbrain_clear_sign_verify') out = dbrainCore.parseAndVerifyClearSigningTransaction(args);
        else if (name === 'dbrain_rust_acceleration_benchmark') out = dbrainCore.runRustAccelerationBenchmark(args);
        else out = { error: `Unknown tool: ${name}` };
        return sendJson(res, 200, {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(out, null, 2) }],
            structuredContent: out
          }
        });
      }
    }

    return sendJson(res, 200, {
      name: nodeName,
      engine: '@dbrain/core v1.10.0',
      profile: state.profile,
      endpoints: [
        'GET  /api/health',
        'GET  /api/dbrain/stores',
        'GET  /api/dbrain/recall?q=<query>&lobe=<lobe>',
        'POST /api/dbrain/mint',
        'POST /api/dbrain/clear-signing/verify',
        'POST /api/dbrain/clear-signing/sign',
        'GET  /api/dbrain/rust-acceleration',
        'POST /api/mcp (MCP 2024-11-05 JSON-RPC 2.0)'
      ]
    });
  });

  return { server, state, dbrainCore, dbrainBrowserCrypto };
}

module.exports = {
  TOPOLOGY_PROFILES,
  loadNodeProfile,
  recallNodeCapsules,
  createDbrainNodeServer
};
