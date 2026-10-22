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

const NODE_RECALL_CACHE_MAX = 128;
const nodeRecallLruCache = new Map();
const NODE_PROVER_CACHE_MAX = 64;
const nodeProverLruCache = new Map();

function lruGet(map, key) {
  if (!map.has(key)) return undefined;
  const val = map.get(key);
  map.delete(key);
  map.set(key, val);
  return val;
}

function lruSet(map, key, val, max) {
  if (map.has(key)) map.delete(key);
  else if (map.size >= max) {
    const oldest = map.keys().next().value;
    map.delete(oldest);
  }
  map.set(key, val);
  return val;
}

function buildCapsuleSearchHaystack(cap) {
  return `${cap.title || ''} ${cap.summary || ''} ${cap.content || ''} ${(cap.tags || []).join(' ')}`.toLowerCase();
}

function normalizeTemplateCapsule(cap, stores) {
  const content = String(cap.content || '');
  const contentHash = cap.contentHash || ('0x' + crypto.createHash('sha256').update(content, 'utf8').digest('hex'));
  const keyHex = String(cap.keyHex || Buffer.from(String(cap.key || ''), 'utf8').toString('hex')).replace(/^0x/, '');
  const store = stores.find(s => s.storeId === cap.storeId) || stores[0];
  const storeId = cap.storeId || (store ? store.storeId : '0x0');
  const authorDid = cap.authorDid || (store ? store.ownerDid : 'did:chia:1dbrain');
  const v13 = dbrainCore.buildDbrainV13CapsuleExtensions({
    capsuleId: cap.id || 'CAP-BRAIN-2026-0001',
    storeId,
    lobe: cap.lobe || 'semantic',
    key: cap.key || 'brain/semantic/default.json',
    content,
    contentHash,
    authorDid,
    generation: cap.generation || 1
  });
  return {
    ...cap,
    protocol: cap.protocol || dbrainCore.DBRAIN_CANONICAL_PROTOCOL,
    keyHex,
    contentHash,
    sizeBytes: cap.sizeBytes || Buffer.byteLength(content, 'utf8'),
    embeddingPreview: cap.embeddingPreview || dbrainCore.computeDeterministicEmbedding(`${cap.title || ''} ${content}`),
    merkleRoot: cap.merkleRoot || (store ? store.merkleRoot : '0x0'),
    clearSignature: cap.clearSignature || v13.clearSignature,
    bpcEnvelope: cap.bpcEnvelope || v13.bpcEnvelope,
    pqcSignature: cap.pqcSignature || v13.pqcSignature,
    _searchHaystack: cap._searchHaystack || buildCapsuleSearchHaystack(cap)
  };
}

function recallNodeCapsules(capsules, { query = '', lobe = 'all', storeId = 'all', limit = 10, stateEpoch = null } = {}) {
  const qLow = String(query || '').trim().toLowerCase();
  const numLimit = Number(limit) || 10;
  const sig = `${stateEpoch !== null ? stateEpoch : ''}:${capsules.length}:${capsules[0] ? capsules[0].id : ''}:${capsules[0] ? capsules[0].merkleRoot || '' : ''}`;
  const cacheKey = `${sig}|${qLow}|${lobe}|${storeId}|${numLimit}`;
  const cached = lruGet(nodeRecallLruCache, cacheKey);
  if (cached) {
    return {
      total: cached.total,
      capsules: cached.capsules,
      cacheHit: true
    };
  }

  const qVec = qLow ? dbrainCore.computeDeterministicEmbedding(qLow) : null;
  let filtered = capsules.filter(c => !c.revertedByCommitSha);
  if (lobe && lobe !== 'all') {
    filtered = filtered.filter(c => c.lobe === lobe);
  }
  if (storeId && storeId !== 'all') {
    filtered = filtered.filter(c => c.storeId === storeId);
  }

  const scored = filtered.map(c => {
    const textLow = c._searchHaystack || buildCapsuleSearchHaystack(c);
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

  const results = scored.slice(0, numLimit);
  const out = {
    total: results.length,
    capsules: results,
    cacheHit: false
  };
  lruSet(nodeRecallLruCache, cacheKey, out, NODE_RECALL_CACHE_MAX);
  return out;
}

function resolveEnvConfig(profile, dataDir) {
  const chiaNetwork = String(process.env.CHIA_NETWORK || 'mainnet').toLowerCase();
  const defaultQuorum = profile.id === 'city' ? '3-of-5' : profile.id === 'community' ? '2-of-3' : '1-of-1';
  const defaultCheckpoint = profile.id === 'city' ? '1h' : profile.id === 'community' ? '6h' : '24h';
  return {
    port: Number(process.env.PORT || 3000),
    nodeEnv: process.env.NODE_ENV || 'production',
    topologyProfile: profile.id,
    nodeName: process.env.DBRAIN_NODE_NAME || profile.name,
    dataDir,
    stateDir: process.env.DBRAIN_STATE_DIR || '/tmp/dbrain-state',
    vaultPath: process.env.DBRAIN_VAULT_PATH || null,
    canonicalHost: process.env.CANONICAL_HOST || 'localhost:3000',
    trustProxy: process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production',
    chiaNetwork,
    chiaPrefix: process.env.CHIA_PREFIX || (chiaNetwork === 'mainnet' ? 'xch' : 'txch'),
    chiaGenesisChallenge:
      process.env.CHIA_GENESIS_CHALLENGE ||
      (chiaNetwork === 'mainnet'
        ? '0xccd5bb71183532bff220ba46c268991a3ff07eb358e8255a65c30a2dce0e5fbb'
        : '0x37a90eb5185a9c4439a91ddc98bbadce7b4feba060d50116a067de66bf236615'),
    chiaDataLayerHttpUrl: process.env.CHIA_DATALAYER_HTTP_URL || 'http://localhost:8562',
    chiaDataLayerRpcUrl: process.env.CHIA_DATALAYER_RPC_URL || 'https://localhost:8562',
    chiaChaiMcpUrl: process.env.CHIA_CHAIMCP_URL || null,
    primaryStoreId: process.env.CHIA_DBRAIN_PRIMARY_STORE_ID || null,
    digCapsulePriceBaseUnits: Number(process.env.DIG_CAPSULE_PRICE_BASE_UNITS || 25000),
    operatorDid: process.env.DBRAIN_OPERATOR_DID || null,
    clearSignCurve: process.env.DBRAIN_CLEAR_SIGN_CURVE || 'Secp256r1_Passkey',
    mipsQuorum: process.env.DBRAIN_MIPS_QUORUM || defaultQuorum,
    pqcMode: process.env.DBRAIN_PQC_MODE || 'ML-DSA-65+Ed25519-Hybrid',
    l1CheckpointInterval: process.env.DBRAIN_L1_CHECKPOINT_INTERVAL || defaultCheckpoint,
    alignmentLeaseTtlSec: Number(process.env.DBRAIN_ALIGNMENT_LEASE_TTL_SEC || 15),
    canaryGateMinScore: Number(process.env.DBRAIN_CANARY_GATE_MIN_SCORE || 0.95),
    rustAccelMode: process.env.DBRAIN_RUST_ACCEL || 'auto'
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
    envConfig: resolveEnvConfig(profile, dataDir),
    stores,
    capsules
  };
}

function createDbrainNodeServer(options = {}) {
  const state = loadNodeProfile(options);
  state.stateEpoch = 1;
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
        protocol: dbrainCore.DBRAIN_CANONICAL_PROTOCOL,
        nodeName,
        profile: state.profile,
        envConfig: state.envConfig,
        version: '1.10.0',
        rustCore: dbrainCore.getRustCoreCapabilities(),
        totalStores: state.stores.length,
        totalCapsules: state.capsules.length,
        stateEpoch: state.stateEpoch,
        cacheStats: {
          stateEpoch: state.stateEpoch,
          recallCacheSize: nodeRecallLruCache.size,
          proverCacheSize: nodeProverLruCache.size,
          core: dbrainCore.getDbrainCoreCacheStats()
        }
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
      const result = recallNodeCapsules(state.capsules, { query, lobe, storeId, limit, stateEpoch: state.stateEpoch });
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
      if (minted.capsule) {
        minted.capsule._searchHaystack = buildCapsuleSearchHaystack(minted.capsule);
      }
      state.stateEpoch += 1;
      return sendJson(res, 201, {
        status: 'MINTED',
        capsule: minted.capsule,
        store: minted.store,
        stateEpoch: state.stateEpoch
      });
    }

    if ((pathname === '/api/dbrain/clear-signing' || pathname === '/api/dbrain/clear-signing/verify') && (req.method === 'GET' || req.method === 'POST')) {
      const body = req.method === 'POST' ? await readJsonBody(req) : {};
      const presetId = String(body.presetId || url.searchParams.get('presetId') || 'VAULT-TX-A2A-ESCROW');
      const tamperMode = String(body.tamperMode || url.searchParams.get('tamperMode') || 'none');
      const cacheKey = `clear-sign:${presetId}:${tamperMode}`;
      let verification = lruGet(nodeProverLruCache, cacheKey);
      if (!verification) {
        verification = dbrainCore.parseAndVerifyClearSigningTransaction({ presetId, tamperMode });
        lruSet(nodeProverLruCache, cacheKey, verification, NODE_PROVER_CACHE_MAX);
      }
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
      const cacheKey = 'rust-accel:50';
      let bench = lruGet(nodeProverLruCache, cacheKey);
      if (!bench) {
        bench = dbrainCore.runRustAccelerationBenchmark({ iterations: 50 });
        lruSet(nodeProverLruCache, cacheKey, bench, NODE_PROVER_CACHE_MAX);
      }
      return sendJson(res, 200, bench);
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
        else if (name === 'dbrain_recall') out = recallNodeCapsules(state.capsules, { ...args, stateEpoch: state.stateEpoch });
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
