#!/usr/bin/env node
/**
 * ============================================================================
 * cli/dbrain-mcp.mjs — Open-Source Stdio Model Context Protocol (MCP) Server
 * ============================================================================
 * Connects Google Antigravity, Claude Code, Cursor, or any MCP 2024-11-05 client
 * directly to a Homelab, Community, or City Decentralized Brain over stdin/stdout.
 */

import { createRequire } from 'node:module';
import readline from 'node:readline';

const require = createRequire(import.meta.url);
const dbrainCore = require('../lib/dbrain-core.js');
const { loadNodeProfile, recallNodeCapsules } = require('../lib/dbrain-server.js');

const state = loadNodeProfile();

const TOOLS = [
  {
    name: 'dbrain_remember',
    description: 'Mint and anchor a signed DBRAIN-v1.2 memory capsule into a Chia DataLayer Brain Store.',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string' },
        lobe: { type: 'string', enum: ['episodic', 'semantic', 'procedural', 'working', 'alignment'] },
        title: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } }
      },
      required: ['title', 'content']
    }
  },
  {
    name: 'dbrain_recall',
    description: 'Sub-millisecond hybrid semantic & key-value recall accelerated by crates/dbrain-core-rs (SIMD + u128 BPC).',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string' },
        lobe: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'number' }
      }
    }
  },
  {
    name: 'dbrain_list_stores',
    description: 'List active Chia DataLayer Agent Brain Singleton Stores for the active Homelab, Community, or City profile.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'dbrain_clear_sign_verify',
    description: 'Verify a CHIP-0043 MIPS Vault transaction via xch-dev/chia-wallet-sdk clear_signing and emit air-gapped signing digests.',
    inputSchema: {
      type: 'object',
      properties: {
        presetId: { type: 'string' },
        tamperMode: { type: 'string' },
        signerDevice: { type: 'string', enum: ['secp256r1_passkey', 'secp256k1_hardware', 'bls12_381_cold_key'] }
      }
    }
  }
];

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req;
  try {
    req = JSON.parse(trimmed);
  } catch (_e) {
    return;
  }

  const { id, method, params = {} } = req;
  try {
    if (method === 'initialize') {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'dbrain-stdio-mcp', version: '1.10.0', profile: state.profile.id },
          capabilities: { tools: { listChanged: false } }
        }
      }) + '\n');
      return;
    }
    if (method === 'tools/list') {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result: { tools: TOOLS } }) + '\n');
      return;
    }
    if (method === 'tools/call') {
      const name = params.name;
      const args = params.arguments || {};
      let out;
      if (name === 'dbrain_remember') {
        const targetStore = state.stores.find(s => s.storeId === args.storeId) || state.stores[0];
        out = dbrainCore.mintCognitiveCapsule({
          store: targetStore,
          capsules: state.capsules,
          stores: state.stores,
          lobe: args.lobe || 'semantic',
          title: args.title,
          content: args.content,
          summary: args.title,
          tags: args.tags || ['mcp', state.profile.id],
          authorDid: targetStore.ownerDid
        });
      } else if (name === 'dbrain_recall') {
        out = recallNodeCapsules(state.capsules, args);
      } else if (name === 'dbrain_list_stores') {
        out = { profile: state.profile.id, total: state.stores.length, stores: state.stores };
      } else if (name === 'dbrain_clear_sign_verify') {
        out = dbrainCore.parseAndVerifyClearSigningTransaction(args);
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] }
      }) + '\n');
    }
  } catch (err) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: err.message }
    }) + '\n');
  }
});
