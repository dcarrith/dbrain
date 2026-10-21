'use strict';

const { webcrypto } = require('node:crypto');
const { subtle } = webcrypto;
const getRandomValues = webcrypto.getRandomValues.bind(webcrypto);

const LOBE_META = {
  episodic: {
    label: 'Episodic Lobe',
    color: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.16)',
    description: 'Timestamped agent trajectories, debugging sessions, tool execution traces, and interaction outcomes.'
  },
  semantic: {
    label: 'Semantic Lobe',
    color: '#c084fc',
    badgeBg: 'rgba(192, 132, 252, 0.16)',
    description: 'Verified domain facts, knowledge graph triples, quantized vector embeddings, and code invariants.'
  },
  procedural: {
    label: 'Procedural Lobe',
    color: '#7dd3fc',
    badgeBg: 'rgba(125, 211, 252, 0.16)',
    description: 'Executable agent skills (SKILL.md), MCP tool schemas, Chialisp puzzle templates, and deployment playbooks.'
  },
  working: {
    label: 'Working Lobe',
    color: '#e879f9',
    badgeBg: 'rgba(232, 121, 249, 0.16)',
    description: 'Shared multi-agent swarm scratchpads, active task DAGs, CRDT locks, and subagent leases.'
  },
  alignment: {
    label: 'Alignment Lobe',
    color: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.16)',
    description: 'Constitutional guardrails, cryptographic provenance rules, DID permissions, and zero-trust boundaries.'
  }
};

function stringToHex(str) {
  const bytes = new TextEncoder().encode(str);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await subtle.digest('SHA-256', bytes);
  const arr = Array.from(new Uint8Array(digest));
  return '0x' + arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildCanonicalDigUrn(params) {
  const storeHex = String(params.storeId || '').replace(/^0x/i, '').toLowerCase();
  const rootHex = params.rootHash ? String(params.rootHash).replace(/^0x/i, '').toLowerCase() : '';
  const rawResource = String(params.resourceKey ?? '').replace(/^\/+/, '');
  const normKey = rawResource.length > 0 ? rawResource : 'index.html';
  return `urn:dig:chia:${storeHex}${rootHex ? ':' + rootHex : ''}/${normKey}`;
}

async function computeDigRetrievalKeyBrowser(storeId, resourceKey) {
  const rootlessUrn = buildCanonicalDigUrn({ storeId, rootHash: null, resourceKey });
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(rootlessUrn));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return Buffer.from(binary, 'binary').toString('base64');
}

function fromBase64(b64) {
  const binary = Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function encryptCortexContent(plaintext, passphrase) {
  const enc = new TextEncoder();
  const salt = getRandomValues(new Uint8Array(16));
  const iv = getRandomValues(new Uint8Array(12));
  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(passphrase || 'dbrain-sovereign-swarm-key'),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const aesKey = await subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const ctBuf = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(plaintext)
  );
  const ivBase64 = toBase64(iv);
  const saltBase64 = toBase64(salt);
  const ctBase64 = toBase64(new Uint8Array(ctBuf));
  return {
    ciphertextEnvelope: `ENC[AES-256-GCM+PBKDF2]:salt=${saltBase64}:iv=${ivBase64}:ct=${ctBase64}`,
    ivBase64,
    saltBase64
  };
}

async function decryptCortexContent(envelope, passphrase) {
  const match = /^ENC\[AES-256-GCM\+PBKDF2\]:salt=([^:]+):iv=([^:]+):ct=(.+)$/.exec(envelope.trim());
  if (!match) {
    throw new Error('Capsule uses an offline hardware RSA-OAEP-256 swarm key or is not a PBKDF2 envelope.');
  }
  const [, saltB64, ivB64, ctB64] = match;
  const enc = new TextEncoder();
  const salt = fromBase64(saltB64);
  const iv = fromBase64(ivB64);
  const ct = fromBase64(ctB64);
  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(passphrase || 'dbrain-sovereign-swarm-key'),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const aesKey = await subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const ptBuf = await subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ct
  );
  return new TextDecoder().decode(ptBuf);
}

module.exports = {
  LOBE_META,
  stringToHex,
  sha256Hex,
  buildCanonicalDigUrn,
  computeDigRetrievalKeyBrowser,
  toBase64,
  fromBase64,
  encryptCortexContent,
  decryptCortexContent
};
