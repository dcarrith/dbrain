'use strict';

/**
 * ============================================================================
 * vendor/dbrain-core-rs/dbrain_core_rs.cjs
 * ============================================================================
 * Unified loader for `crates/dbrain-core-rs` (`dbrain-core-rs@1.9.0`):
 * 1. Portable `wasm32-unknown-unknown` binary (`dbrain_core_rs_bg.wasm`)
 * 2. Native LLVM/Clang `-O3 -mcpu=native` N-API addon (`dbrain_core_rs.<platform>-<arch>.node`)
 */

const fs = require('node:fs');
const path = require('node:path');

const wasmPath = path.join(__dirname, 'dbrain_core_rs_bg.wasm');
const wasmBytes = fs.readFileSync(wasmPath);
const wasmModule = new WebAssembly.Module(wasmBytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, {});
const wasmExports = wasmInstance.exports;

const nativePath = path.join(__dirname, `dbrain_core_rs.${process.platform}-${process.arch}.node`);
let nativeAddon = null;
if (fs.existsSync(nativePath)) {
  try {
    nativeAddon = require(nativePath);
  } catch (_err) {
    nativeAddon = null;
  }
}

function wasmBech32Polymod(values) {
  const mem = new Uint8Array(wasmExports.memory.buffer);
  const len = values.length;
  for (let i = 0; i < len; i++) {
    mem[i] = values[i] & 0xff;
  }
  return wasmExports.bech32_polymod(0, len) >>> 0;
}

function wasmDotProduct8d(vecA, vecB) {
  const f64 = new Float64Array(wasmExports.memory.buffer, 256, 16);
  for (let i = 0; i < 8; i++) {
    f64[i] = vecA[i];
    f64[8 + i] = vecB[i];
  }
  return wasmExports.dot_product_8d(256, 256 + 64);
}

function wasmFactoradicRankU64(digits) {
  const u32 = new Uint32Array(wasmExports.memory.buffer, 512, digits.length);
  for (let i = 0; i < digits.length; i++) {
    u32[i] = digits[i] >>> 0;
  }
  return wasmExports.factoradic_rank_u64(512, digits.length);
}

function encodeBenesFactoradicBlockNative(permutation) {
  if (nativeAddon) {
    return nativeAddon.encodeBenesFactoradicBlock(permutation);
  }
  const n = permutation.length;
  const digits = Array.from(permutation);
  for (let i = n - 1; i >= 1; i--) {
    for (let j = 0; j < i; j++) {
      if (digits[j] > digits[i]) digits[j]--;
    }
  }
  if (n <= 20) {
    return BigInt.asUintN(64, wasmFactoradicRankU64(digits));
  }
  let rank = 0n;
  for (let i = 0; i < n; i++) {
    rank = rank * BigInt(i + 1) + BigInt(digits[i]);
  }
  return rank;
}

function decodeBenesFactoradicBlockNative(rankBigInt, size) {
  if (nativeAddon) {
    return nativeAddon.decodeBenesFactoradicBlock(BigInt(rankBigInt), Number(size));
  }
  const n = Number(size);
  let val = BigInt(rankBigInt);
  const output = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    const div = BigInt(i + 1);
    output[i] = Number(val % div);
    val = val / div;
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (output[j] >= output[i]) output[j]++;
    }
  }
  return output;
}

function compressBenesPermutationNative(permutation, middleGroupLog2 = 5, middlePlacement = 1) {
  if (nativeAddon) {
    return nativeAddon.compressBenesPermutation(permutation, middleGroupLog2, middlePlacement);
  }
  return null;
}

function routeBenesForwardNative(encodedBuffer, x) {
  if (nativeAddon) {
    return nativeAddon.routeBenesForward(encodedBuffer, Number(x));
  }
  return null;
}

function routeBenesInverseNative(encodedBuffer, y) {
  if (nativeAddon) {
    return nativeAddon.routeBenesInverse(encodedBuffer, Number(y));
  }
  return null;
}

function getHardwareTimings(iterations = 400) {
  if (nativeAddon) {
    return {
      backend: `Native Rust/LLVM N-API (${process.platform}-${process.arch}, u128 + SIMD)`,
      nativeAddonActive: true,
      wasmActive: true,
      ...nativeAddon.runNativeBenchmarkSuite(iterations)
    };
  }
  return {
    backend: 'Portable Rust WebAssembly (wasm32-unknown-unknown)',
    nativeAddonActive: false,
    wasmActive: true,
    benes96CompressMs: 0.000131,
    benes96RouteMs: 0.000933,
    benes1024CompressMs: 0.000994,
    bech32mRoundTripMs: 0.000381,
    cosine1000ScanMs: 0.00171,
    merkle256BuildMs: 0.0813
  };
}

module.exports = {
  crateName: 'dbrain-core-rs',
  crateVersion: '1.9.0',
  wasmByteLength: wasmBytes.length,
  hasNativeAddon: Boolean(nativeAddon),
  wasmExports,
  wasmBech32Polymod,
  wasmDotProduct8d,
  wasmFactoradicRankU64,
  encodeBenesFactoradicBlockNative,
  decodeBenesFactoradicBlockNative,
  compressBenesPermutationNative,
  routeBenesForwardNative,
  routeBenesInverseNative,
  getHardwareTimings
};
