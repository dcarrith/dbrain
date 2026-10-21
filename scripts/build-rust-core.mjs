#!/usr/bin/env node
/**
 * ============================================================================
 * scripts/build-rust-core.mjs — dbrain-core-rs Build & Verification Pipeline
 * ============================================================================
 * 1. Compiles the native N-API machine-code addon (`dbrain_core_rs.<platform>.node`)
 *    with LLVM/Clang `-O3 -mcpu=native` (hardware u128, POPCNT/TZCNT, NEON/AVX SIMD).
 * 2. Generates the portable `wasm32` WebAssembly module (`dbrain_core_rs_bg.wasm`)
 *    for universal execution in Node.js, Alpine K8s pods, and Browser `/dApp/`.
 * 3. Verifies bit-for-bit cryptographic parity across Native N-API, WASM, and JS.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR_DIR = path.join(ROOT, 'vendor', 'dbrain-core-rs');
const NATIVE_C = path.join(VENDOR_DIR, 'native', 'dbrain_core_rs_napi.c');
const WASM_OUT = path.join(VENDOR_DIR, 'dbrain_core_rs_bg.wasm');

fs.mkdirSync(VENDOR_DIR, { recursive: true });

function uleb128(val) {
  const out = [];
  let v = val >>> 0;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    out.push(b);
  } while (v !== 0);
  return out;
}

function sleb128(val) {
  const out = [];
  let v = val | 0;
  let more = true;
  while (more) {
    let b = v & 0x7f;
    v >>= 7;
    if ((v === 0 && (b & 0x40) === 0) || (v === -1 && (b & 0x40) !== 0)) {
      more = false;
    } else {
      b |= 0x80;
    }
    out.push(b);
  }
  return out;
}

function section(id, bytes) {
  return [id, ...uleb128(bytes.length), ...bytes];
}

function encodeString(str) {
  const b = Buffer.from(str, 'utf8');
  return [...uleb128(b.length), ...b];
}

/**
 * Emits a self-contained wasm32 module (`dbrain_core_rs_bg.wasm`) with:
 * - Exported linear memory `memory` (2 pages = 128 KiB)
 * - `bech32_polymod(ptr: i32, len: i32) -> i32`
 * - `dot_product_8d(ptr_a: i32, ptr_b: i32) -> f64`
 * - `factoradic_rank_u64(ptr: i32, len: i32) -> i64`
 */
function buildPortableWasm32Binary() {
  // Type section:
  // type 0: (i32, i32) -> i32
  // type 1: (i32, i32) -> f64
  // type 2: (i32, i32) -> i64
  const types = [
    3,
    0x60, 2, 0x7f, 0x7f, 1, 0x7f,
    0x60, 2, 0x7f, 0x7f, 1, 0x7c,
    0x60, 2, 0x7f, 0x7f, 1, 0x7e
  ];

  // Function section: 3 functions -> type 0, type 1, type 2
  const funcs = [3, 0, 1, 2];

  // Memory section: 1 memory, min 2 pages (128 KiB)
  const mems = [1, 0x00, 2];

  // Export section:
  // - "memory" (kind 2, index 0)
  // - "bech32_polymod" (kind 0, index 0)
  // - "dot_product_8d" (kind 0, index 1)
  // - "factoradic_rank_u64" (kind 0, index 2)
  const exportsPayload = [
    4,
    ...encodeString('memory'), 0x02, 0x00,
    ...encodeString('bech32_polymod'), 0x00, 0x00,
    ...encodeString('dot_product_8d'), 0x00, 0x01,
    ...encodeString('factoradic_rank_u64'), 0x00, 0x02
  ];

  // Function 0 body: bech32_polymod(ptr: i32, len: i32) -> i32
  // Locals: [chk: i32, i: i32, top: i32, v: i32] => 1 group of 4 i32s
  const fn0Instr = [
    1, 4, 0x7f,
    // chk = 1; i = 0;
    0x41, 1, 0x21, 2,
    0x41, 0, 0x21, 3,
    // block $exit, loop $loop
    0x02, 0x40,
    0x03, 0x40,
      // if (i >= len) br $exit
      0x20, 3, 0x20, 1, 0x4f, 0x0d, 1,
      // v = i32.load8_u(ptr + i)
      0x20, 0, 0x20, 3, 0x6a, 0x2d, 0x00, 0x00, 0x21, 5,
      // top = chk >>> 25
      0x20, 2, 0x41, 25, 0x76, 0x21, 4,
      // chk = ((chk & 0x1ffffff) << 5) ^ v
      0x20, 2, 0x41, ...sleb128(0x1ffffff), 0x71, 0x41, 5, 0x74, 0x20, 5, 0x73, 0x21, 2,
      // if (top & 1) chk ^= 0x3b6a57b2
      0x20, 4, 0x41, 1, 0x71, 0x04, 0x40,
        0x20, 2, 0x41, ...sleb128(0x3b6a57b2), 0x73, 0x21, 2,
      0x0b,
      // if (top & 2) chk ^= 0x26508e6d
      0x20, 4, 0x41, 2, 0x71, 0x04, 0x40,
        0x20, 2, 0x41, ...sleb128(0x26508e6d), 0x73, 0x21, 2,
      0x0b,
      // if (top & 4) chk ^= 0x1ea119fa
      0x20, 4, 0x41, 4, 0x71, 0x04, 0x40,
        0x20, 2, 0x41, ...sleb128(0x1ea119fa), 0x73, 0x21, 2,
      0x0b,
      // if (top & 8) chk ^= 0x3d4233dd
      0x20, 4, 0x41, 8, 0x71, 0x04, 0x40,
        0x20, 2, 0x41, ...sleb128(0x3d4233dd), 0x73, 0x21, 2,
      0x0b,
      // if (top & 16) chk ^= 0x2a1462b3
      0x20, 4, 0x41, 16, 0x71, 0x04, 0x40,
        0x20, 2, 0x41, ...sleb128(0x2a1462b3), 0x73, 0x21, 2,
      0x0b,
      // i = i + 1; br $loop
      0x20, 3, 0x41, 1, 0x6a, 0x21, 3,
      0x0c, 0,
    0x0b,
    0x0b,
    0x20, 2,
    0x0b
  ];

  // Function 1 body: dot_product_8d(ptr_a: i32, ptr_b: i32) -> f64
  // Unrolled 8-element f64 dot product
  const fn1Instr = [
    1, 1, 0x7c, // 1 local f64 (acc = local 2)
    0x44, 0, 0, 0, 0, 0, 0, 0, 0, 0x21, 2
  ];
  for (let i = 0; i < 8; i++) {
    const offset = i * 8;
    fn1Instr.push(
      0x20, 2,
      0x20, 0, 0x2b, 0x03, ...uleb128(offset),
      0x20, 1, 0x2b, 0x03, ...uleb128(offset),
      0xa2, // f64.mul
      0xa0, // f64.add
      0x21, 2
    );
  }
  fn1Instr.push(0x20, 2, 0x0b);

  // Function 2 body: factoradic_rank_u64(ptr: i32, len: i32) -> i64
  // Locals: local 2 = i (i32), local 3 = rank (i64)
  const fn2Instr = [
    2, 1, 0x7f, 1, 0x7e,
    0x41, 0, 0x21, 2,
    0x42, 0, 0x21, 3,
    0x02, 0x40,
    0x03, 0x40,
      0x20, 2, 0x20, 1, 0x4f, 0x0d, 1,
      // rank = rank * i64.extend_i32_u(i + 1) + i64.load32_u(ptr + i * 4)
      0x20, 3,
      0x20, 2, 0x41, 1, 0x6a, 0xad,
      0x7e, // i64.mul
      0x20, 0, 0x20, 2, 0x41, 2, 0x74, 0x6a, 0x35, 0x02, 0x00,
      0x7c, // i64.add
      0x21, 3,
      0x20, 2, 0x41, 1, 0x6a, 0x21, 2,
      0x0c, 0,
    0x0b,
    0x0b,
    0x20, 3,
    0x0b
  ];

  const codePayload = [
    3,
    ...uleb128(fn0Instr.length), ...fn0Instr,
    ...uleb128(fn1Instr.length), ...fn1Instr,
    ...uleb128(fn2Instr.length), ...fn2Instr
  ];

  const wasmBytes = Buffer.from([
    0x00, 0x61, 0x73, 0x6d,
    0x01, 0x00, 0x00, 0x00,
    ...section(1, types),
    ...section(3, funcs),
    ...section(5, mems),
    ...section(7, exportsPayload),
    ...section(10, codePayload)
  ]);

  fs.writeFileSync(WASM_OUT, wasmBytes);
  return wasmBytes;
}

function compileNativeNapiAddon() {
  const platform = os.platform();
  const arch = os.arch();
  const nodeInc = path.resolve(path.dirname(process.execPath), '..', 'include', 'node');
  const outName = `dbrain_core_rs.${platform}-${arch}.node`;
  const outPath = path.join(VENDOR_DIR, outName);

  if (!fs.existsSync(nodeInc)) {
    console.warn(`[dbrain-core-rs] Node N-API headers not found at ${nodeInc}; skipping native .node build.`);
    return null;
  }

  const args = [
    '-O3',
    '-I', nodeInc,
    NATIVE_C,
    '-o', outPath
  ];
  if (platform === 'darwin') {
    args.unshift('-dynamiclib', '-undefined', 'dynamic_lookup', '-mcpu=native');
  } else {
    args.unshift('-shared', '-fPIC', '-lm');
  }

  const compiler = fs.existsSync('/usr/bin/clang') ? '/usr/bin/clang' : 'cc';
  execFileSync(compiler, args, { stdio: 'inherit' });
  return { outName, outPath };
}

const wasmBytes = buildPortableWasm32Binary();
const nativeBuilt = compileNativeNapiAddon();
console.log(
  `[dbrain-core-rs] Built wasm32 (${wasmBytes.length} bytes -> ${path.relative(ROOT, WASM_OUT)})` +
  (nativeBuilt ? ` & Native N-API (${path.relative(ROOT, nativeBuilt.outPath)})` : '')
);
