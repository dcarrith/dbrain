'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const browserCrypto = require('../lib/dbrain-browser-crypto.js');
const core = require('../lib/dbrain-core.js');

const SAMPLE_STORE_ID = '00b19c5bc9dc40e62da459bbf69252622ac8b64a30c9a497c80fe8554eacad5f';
const SAMPLE_TXCH_ADDR = 'txch1377s2ss0n6wh0z29rxny7dlyjf8akt2hstrwnsknxzjaflm04sfsuz5c96';

describe('Suite 1: Browser & Edge WebCrypto + URN Engine (lib/dbrain-browser-crypto.js)', () => {
  it('1.1 exposes all 5 biological cognitive lobes in LOBE_META with labels, colors, and descriptions', () => {
    assert.deepEqual(
      Object.keys(browserCrypto.LOBE_META),
      ['episodic', 'semantic', 'procedural', 'working', 'alignment']
    );
    for (const lobe of Object.values(browserCrypto.LOBE_META)) {
      assert.ok(lobe.label && lobe.color && lobe.description);
    }
  });

  it('1.2 converts UTF-8 strings to hex and computes WebCrypto SHA-256 digests', async () => {
    assert.equal(browserCrypto.stringToHex('dbrain'), '64627261696e');
    assert.equal(browserCrypto.stringToHex(''), '');
    const digest = await browserCrypto.sha256Hex('dbrain.to');
    assert.match(digest, /^0x[0-9a-f]{64}$/);
  });

  it('1.3 builds canonical rootless and rooted DIG URNs in browser mode', () => {
    const rootless = browserCrypto.buildCanonicalDigUrn({
      storeId: `0x${SAMPLE_STORE_ID.toUpperCase()}`,
      resourceKey: '/dbrain:lobe:semantic:fact-1'
    });
    assert.equal(rootless, `urn:dig:chia:${SAMPLE_STORE_ID}/dbrain:lobe:semantic:fact-1`);

    const defaultKeyUrn = browserCrypto.buildCanonicalDigUrn({
      storeId: '',
      rootHash: '0x' + 'A'.repeat(64)
    });
    assert.equal(defaultKeyUrn, `urn:dig:chia::${'a'.repeat(64)}/index.html`);
  });

  it('1.4 derives provider-blind SHA-256(rootless_urn) retrieval keys via WebCrypto', async () => {
    const rk = await browserCrypto.computeDigRetrievalKeyBrowser(SAMPLE_STORE_ID, 'dbrain:lobe:semantic:fact-1');
    assert.match(rk, /^[0-9a-f]{64}$/);
  });

  it('1.5 encrypts and decrypts private cortex payloads with PBKDF2-SHA256 + AES-256-GCM (custom passphrase)', async () => {
    const msg = 'Confidential multi-agent reasoning trace #42';
    const encCustom = await browserCrypto.encryptCortexContent(msg, 'custom-swarm-secret');
    assert.match(encCustom.ciphertextEnvelope, /^ENC\[AES-256-GCM\+PBKDF2\]:salt=/);
    const decCustom = await browserCrypto.decryptCortexContent(encCustom.ciphertextEnvelope, 'custom-swarm-secret');
    assert.equal(decCustom, msg);
  });

  it('1.6 falls back to sovereign swarm key when passphrase is empty and rejects invalid envelopes or wrong keys', async () => {
    const msg = 'Fallback swarm key test';
    const encDefault = await browserCrypto.encryptCortexContent(msg, '');
    const decDefault = await browserCrypto.decryptCortexContent(encDefault.ciphertextEnvelope, '');
    assert.equal(decDefault, msg);

    await assert.rejects(
      () => browserCrypto.decryptCortexContent('INVALID_ENVELOPE', 'secret'),
      /not a PBKDF2 envelope/
    );
    await assert.rejects(
      () => browserCrypto.decryptCortexContent(encDefault.ciphertextEnvelope, 'wrong-passphrase')
    );
  });
});

describe('Suite 2: Pillar 1 — Chia Bech32m Identity, Address Codec & DID CHIP-0002 Authentication', () => {
  it('2.1 decodes and re-encodes valid lowercase and uppercase Chia Bech32m addresses (txch1 & xch1)', () => {
    const decoded = core.decodeChiaAddress(SAMPLE_TXCH_ADDR);
    assert.ok(decoded);
    assert.equal(decoded.prefix, 'txch');
    assert.equal(decoded.puzzleHash.length, 66);

    const decodedUpper = core.decodeChiaAddress(SAMPLE_TXCH_ADDR.toUpperCase());
    assert.deepEqual(decodedUpper, decoded);

    const reencodedTxch = core.encodeChiaAddress(decoded.puzzleHash, 'txch');
    assert.equal(reencodedTxch, SAMPLE_TXCH_ADDR);
    const reencodedXch = core.encodeChiaAddress(Buffer.from(decoded.puzzleHash.slice(2), 'hex'));
    assert.ok(reencodedXch.startsWith('xch1'));
    assert.equal(core.encodeChiaAddress('0x1234', 'xch'), null);
  });

  it('2.2 validates network address prefixes and rejects all malformed Bech32m inputs and bit paddings', () => {
    assert.equal(core.isValidNetworkAddress(SAMPLE_TXCH_ADDR, 'txch'), true);
    assert.equal(core.isValidNetworkAddress(SAMPLE_TXCH_ADDR), true);
    assert.equal(core.isValidNetworkAddress(SAMPLE_TXCH_ADDR, 'xch'), false);
    assert.equal(core.isValidNetworkAddress('invalid'), false);

    assert.equal(core.decodeChiaAddress(null), null);
    assert.equal(core.decodeChiaAddress('short'), null);
    assert.equal(core.decodeChiaAddress('x'.repeat(105)), null);
    assert.equal(core.decodeChiaAddress('Txch1377s2ss0n6wh0z29rxny7dlyjf8akt2hstrwnsknxzjaflm04sfsuz5c96'), null);
    assert.equal(core.decodeChiaAddress('1377s2ss0n6wh0z29rxny7dlyjf8akt2hstrwnsknxzjaflm04sfsuz5c96'), null);
    assert.equal(core.decodeChiaAddress('txch1abc'), null);
    assert.equal(core.decodeChiaAddress('btc1377s2ss0n6wh0z29rxny7dlyjf8akt2hstrwnsknxzjaflm04sfsuz5c96'), null);
    assert.equal(core.decodeChiaAddress('txch1b77s2ss0n6wh0z29rxny7dlyjf8akt2hstrwnsknxzjaflm04sfsuz5c96'), null);
    assert.equal(core.decodeChiaAddress(SAMPLE_TXCH_ADDR.slice(0, -1) + 'q'), null);

    // Valid Bech32m checksum over 20-byte payload -> rejected because puzzleHash must be 32 bytes
    const shortWords = core.convertBits(Buffer.alloc(20, 1), 8, 5, true);
    const vals = core.bech32HrpExpand('xch').concat(shortWords).concat([0, 0, 0, 0, 0, 0]);
    const poly = core.bech32Polymod(vals) ^ 0x2bc830a3;
    const charset = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    const chk = [];
    for (let i = 0; i < 6; i++) chk.push((poly >>> (5 * (5 - i))) & 31);
    const shortAddr = 'xch1' + shortWords.concat(chk).map(d => charset[d]).join('');
    assert.equal(core.decodeChiaAddress(shortAddr), null);

    assert.equal(core.convertBits([31], 5, 8, false), null);
    assert.deepEqual(core.convertBits([], 8, 5, true), []);
  });

  it('2.3 normalizes allowlisted Admin DIDs and rejects unlisted or malformed DIDs', () => {
    const allowlist = new Set([`did:chia:${SAMPLE_TXCH_ADDR}`]);
    assert.equal(core.normalizeAdminDid('', allowlist), null);
    assert.equal(core.normalizeAdminDid('did:chia:invalid', allowlist), null);

    const otherAddr = core.encodeChiaAddress(Buffer.alloc(32, 7), 'txch');
    assert.equal(core.normalizeAdminDid(`did:chia:${otherAddr}`, allowlist), null);

    const normFromRaw = core.normalizeAdminDid(SAMPLE_TXCH_ADDR, allowlist);
    assert.equal(normFromRaw.did, `did:chia:${SAMPLE_TXCH_ADDR}`);
  });

  it('2.4 issues 60s CHIP-0002 challenges and verifies HMAC signatures, audit keys, and expiry/permission guards', () => {
    const allowlist = new Set([`did:chia:${SAMPLE_TXCH_ADDR}`]);
    const otherAddr = core.encodeChiaAddress(Buffer.alloc(32, 7), 'txch');
    assert.equal(core.createDidChallenge('did:chia:invalid', allowlist), null);

    const now = 1792100000000;
    const chal = core.createDidChallenge(`did:chia:${SAMPLE_TXCH_ADDR}`, allowlist, now);
    const chalDefaultTime = core.createDidChallenge(SAMPLE_TXCH_ADDR, allowlist);
    assert.ok(chal.challengeId.startsWith('chal_'));
    assert.ok(chalDefaultTime.challengeId.startsWith('chal_'));

    const secret = 'dbrain-test-secret';
    const validSig = crypto.createHmac('sha256', secret).update(chal.message, 'utf8').digest('hex');

    const resOkSig = core.verifyDidChallengeResponse({
      challenge: chal,
      didInput: `did:chia:${SAMPLE_TXCH_ADDR}`,
      signatureHex: `0x${validSig}`,
      expectedSecretKey: secret,
      allowlistSet: allowlist,
      nowMs: now + 5000
    });
    assert.equal(resOkSig.ok, true);
    assert.equal(resOkSig.authMethod, 'did-challenge-chip0002');

    const resOkKey = core.verifyDidChallengeResponse({
      challenge: chalDefaultTime,
      didInput: SAMPLE_TXCH_ADDR,
      adminKey: secret,
      expectedSecretKey: secret,
      allowlistSet: allowlist
    });
    assert.equal(resOkKey.ok, true);
    assert.equal(resOkKey.authMethod, 'did-allowlist+audit-key');

    assert.equal(
      core.verifyDidChallengeResponse({
        challenge: chal,
        didInput: `did:chia:${otherAddr}`,
        expectedSecretKey: secret,
        allowlistSet: allowlist,
        nowMs: now
      }).status,
      403
    );

    assert.equal(
      core.verifyDidChallengeResponse({
        challenge: chal,
        didInput: SAMPLE_TXCH_ADDR,
        signatureHex: validSig,
        expectedSecretKey: secret,
        allowlistSet: allowlist,
        nowMs: now + 90000
      }).status,
      401
    );

    assert.equal(
      core.verifyDidChallengeResponse({
        challenge: chal,
        didInput: SAMPLE_TXCH_ADDR,
        signatureHex: 'deadbeef',
        adminKey: 'wrong',
        expectedSecretKey: secret,
        allowlistSet: allowlist,
        nowMs: now + 1000
      }).status,
      401
    );
  });
});

describe('Suite 3: Pillar 2 — Normative DIG Network Protocol (@dignetwork/dig-capsule-wasm, Contracts D1/D2/D5/D8)', () => {
  it('3.1 normalizes 32-byte hex store IDs, resource keys, and canonical DIG URNs', () => {
    assert.equal(core.normalizeDigHex32(`0x${SAMPLE_STORE_ID.toUpperCase()}`), SAMPLE_STORE_ID);
    assert.match(core.normalizeDigHex32('short-id'), /^[0-9a-f]{64}$/);
    assert.match(core.normalizeDigHex32(''), /^[0-9a-f]{64}$/);

    assert.equal(core.normalizeDigResourceKey(null), 'index.html');
    assert.equal(core.normalizeDigResourceKey('///nested/file.json'), 'nested/file.json');

    const rootHex = 'a'.repeat(64);
    const rootlessUrn = core.buildCanonicalDigUrn({ storeId: SAMPLE_STORE_ID });
    const rootedUrn = core.buildCanonicalDigUrn({ storeId: SAMPLE_STORE_ID, rootHash: rootHex, resourceKey: 'mem.json' });
    assert.equal(rootlessUrn, `urn:dig:chia:${SAMPLE_STORE_ID}/index.html`);
    assert.equal(rootedUrn, `urn:dig:chia:${SAMPLE_STORE_ID}:${rootHex}/mem.json`);
  });

  it('3.2 parses valid rootless/rooted DIG URNs and rejects malformed URN strings', () => {
    const rootHex = 'a'.repeat(64);
    assert.deepEqual(core.parseCanonicalDigUrn(`urn:dig:chia:${SAMPLE_STORE_ID}/index.html`), {
      chain: 'chia',
      storeId: SAMPLE_STORE_ID,
      rootHash: null,
      resourceKey: 'index.html'
    });
    assert.deepEqual(core.parseCanonicalDigUrn(`urn:dig:chia:${SAMPLE_STORE_ID}:${rootHex}/mem.json`), {
      chain: 'chia',
      storeId: SAMPLE_STORE_ID,
      rootHash: rootHex,
      resourceKey: 'mem.json'
    });
    assert.deepEqual(core.parseCanonicalDigUrn(`urn:dig:chia:${SAMPLE_STORE_ID}`), {
      chain: 'chia',
      storeId: SAMPLE_STORE_ID,
      rootHash: null,
      resourceKey: 'index.html'
    });

    assert.equal(core.parseCanonicalDigUrn('http://example.com'), null);
    assert.equal(core.parseCanonicalDigUrn('urn:dig:onlyone'), null);
    assert.equal(core.parseCanonicalDigUrn('urn:dig:a:b:c:d/key'), null);
    assert.equal(core.parseCanonicalDigUrn(`urn:dig:ethereum:${SAMPLE_STORE_ID}/key`), null);
    assert.equal(core.parseCanonicalDigUrn('urn:dig:chia:badhex/key'), null);
    assert.equal(core.parseCanonicalDigUrn(`urn:dig:chia:${SAMPLE_STORE_ID}:badroot/key`), null);

    assert.match(core.computeDigRetrievalKey(SAMPLE_STORE_ID), /^[0-9a-f]{64}$/);
  });

  it('3.3 derives HKDF keys and encrypts/decrypts chunks via WASM AES-256-GCM-SIV and raw AES-256-GCM', () => {
    const saltHex = 'b'.repeat(64);
    const wasmKey = core.deriveDigResourceKey32(SAMPLE_STORE_ID, 'skill.md', saltHex);
    const defaultKey = core.deriveDigResourceKey32(SAMPLE_STORE_ID);
    assert.equal(wasmKey.length, 32);
    assert.equal(defaultKey.length, 32);

    const plain = Buffer.from('Verified DIG Capsule Chunk Payload', 'utf8');
    const ctWasm = core.encryptDigChunk(wasmKey, plain);
    const decWasm = core.decryptDigChunk(wasmKey, ctWasm);
    assert.deepEqual(decWasm, plain);

    const rawKey = crypto.randomBytes(32);
    const ctRaw = core.encryptDigChunk(rawKey, plain);
    const decRaw = core.decryptDigChunk(rawKey, ctRaw);
    assert.deepEqual(decRaw, plain);

    assert.throws(() => core.decryptDigChunk(rawKey, Buffer.from('short')), /Invalid DIG chunk ciphertext length/);
  });

  it('3.4 builds D5/D8 Merkle trees (empty, even, and odd-node carry-up Contract D8) and verifies binary proofs', () => {
    const emptyTree = core.buildDigMerkleTree([]);
    assert.equal(core.verifyDigMerkleProofBytes(emptyTree.prove(0)).valid, true);

    const leaves = [
      core.digResourceLeaf(Buffer.from('leaf-0')),
      core.digResourceLeaf(Buffer.from('leaf-1')),
      core.digResourceLeaf(Buffer.from('leaf-2'))
    ];
    const tree = core.buildDigMerkleTree(leaves);
    for (let i = 0; i < 3; i++) {
      const res = core.verifyDigMerkleProofBytes(tree.prove(i));
      assert.equal(res.valid, true);
      assert.equal(res.rootHex, tree.rootHex);
    }

    assert.equal(core.verifyDigMerkleProofBytes(Buffer.alloc(10)).valid, false);
    const badLenBuf = Buffer.concat([tree.prove(0), Buffer.from([0xff])]);
    assert.equal(core.verifyDigMerkleProofBytes(badLenBuf).reason, 'Proof byte length mismatch');

    const badTagBuf = Buffer.from(tree.prove(0));
    badTagBuf.writeUInt8(9, 36 + 32);
    assert.match(core.verifyDigMerkleProofBytes(badTagBuf).reason, /InvalidTag/);
  });

  it('3.5 compiles self-defending .dig WASM modules with 13-section DIGS headers and validates via WebAssembly.validate', () => {
    const compiled = core.compileAndParseDigsCapsule({
      storeId: SAMPLE_STORE_ID,
      storeName: 'dbrain.to Test Store',
      generation: 3,
      resources: [
        { path: 'dbrain:lobe:semantic:cap-1', content: 'Semantic triple payload' },
        { path: 'empty.bin', content: Buffer.alloc(0) }
      ]
    });
    assert.equal(compiled.wasmValid, true);
    assert.equal(compiled.parsedDigs.magic, 'DIGS');
    assert.equal(compiled.parsedDigs.sectionCount, 13);
    assert.equal(compiled.parsedDigs.keyTableCount, 2);

    const emptyCompiled = core.compileAndParseDigsCapsule({ storeId: SAMPLE_STORE_ID });
    assert.equal(emptyCompiled.wasmValid, true);
  });

  it('3.6 serves blind-host dig.getContent hits and indistinguishable deterministic decoy streams on miss', () => {
    const compiled = core.compileAndParseDigsCapsule({
      storeId: SAMPLE_STORE_ID,
      resources: [{ path: 'dbrain:lobe:semantic:cap-1', content: 'Semantic triple payload' }]
    });
    const hitRk = core.computeDigRetrievalKey(SAMPLE_STORE_ID, 'dbrain:lobe:semantic:cap-1');
    const hitFull = core.buildBlindHostGetContentResponse({ compiledCapsule: compiled, retrievalKeyHex: hitRk });
    assert.equal(hitFull.complete, true);
    assert.ok(hitFull.inclusion_proof);

    const hitPartial = core.buildBlindHostGetContentResponse({
      compiledCapsule: compiled,
      retrievalKeyHex: hitRk,
      offset: 0,
      length: 4
    });
    assert.equal(hitPartial.complete, false);
    assert.equal(hitPartial.next_offset, 4);

    const hitOffsetNonZero = core.buildBlindHostGetContentResponse({
      compiledCapsule: compiled,
      retrievalKeyHex: hitRk,
      offset: 4,
      length: 1000
    });
    assert.equal(hitOffsetNonZero.inclusion_proof, null);

    const missRk = core.computeDigRetrievalKey(SAMPLE_STORE_ID, 'non-existent-secret-key');
    const miss1 = core.buildBlindHostGetContentResponse({ compiledCapsule: compiled, retrievalKeyHex: missRk });
    const miss2 = core.buildBlindHostGetContentResponse({ compiledCapsule: compiled, retrievalKeyHex: missRk });
    assert.equal(miss1.ciphertext, miss2.ciphertext);
    assert.equal('decoy' in miss1, false);

    const missPartial = core.buildBlindHostGetContentResponse({
      compiledCapsule: compiled,
      retrievalKeyHex: missRk,
      offset: 4,
      length: 10
    });
    assert.equal(missPartial.complete, false);
    assert.equal(missPartial.inclusion_proof, null);
  });

  it('3.7 enforces all DIGS binary format validation guards in parseDigsBlob', () => {
    assert.throws(() => core.parseDigsBlob(Buffer.from('short')), /shorter than 9-byte header/);
    assert.throws(() => core.parseDigsBlob(Buffer.from('XXXX\x01\x00\x00\x00\x00')), /Invalid DIGS magic/);
    assert.throws(() => core.parseDigsBlob(Buffer.from('DIGS\x02\x00\x00\x00\x00')), /Unsupported DIGS version/);
    assert.throws(() => core.parseDigsBlob(Buffer.from('DIGS\x01\x00\x00\x00\x05')), /Invalid DIGS section table/);

    const oobHeader = Buffer.alloc(19);
    oobHeader.write('DIGS', 0, 4, 'ascii');
    oobHeader.writeUInt8(1, 4);
    oobHeader.writeUInt32BE(1, 5);
    oobHeader.writeUInt16BE(1, 9);
    oobHeader.writeUInt32BE(19, 11);
    oobHeader.writeUInt32BE(50, 15);
    assert.throws(() => core.parseDigsBlob(oobHeader), /out of bounds/);

    const minDigs = Buffer.alloc(19 + 3);
    minDigs.write('DIGS', 0, 4, 'ascii');
    minDigs.writeUInt8(1, 4);
    minDigs.writeUInt32BE(1, 5);
    minDigs.writeUInt16BE(6, 9);
    minDigs.writeUInt32BE(19, 11);
    minDigs.writeUInt32BE(3, 15);
    minDigs.write('{x}', 19, 3, 'utf8');
    const parsedMin = core.parseDigsBlob(minDigs);
    assert.equal(parsedMin.storeIdHex, null);
    assert.equal(parsedMin.currentRootHex, null);
    assert.equal(parsedMin.chunkPoolCount, 0);
    assert.equal(parsedMin.merkleLeavesCount, 0);
    assert.equal(parsedMin.fillerLen, 0);
    assert.equal(parsedMin.metadata, null);
  });
});

describe('Suite 4: Pillar 3 & 4 — 5-Lobe Merkle Store, SWE-ContextBench Hybrid Recall & Merkle Delta Sync', () => {
  it('4.1 normalizes DBRAIN-v1.2 protocol versions and upgrades legacy DIG-BRAIN aliases', () => {
    assert.equal(core.normalizeDbrainProtocol().valid, true);
    assert.equal(core.normalizeDbrainProtocol('DBRAIN-v1.2').upgradedFromLegacy, false);
    assert.equal(core.normalizeDbrainProtocol('DIG-BRAIN-v1.2').upgradedFromLegacy, true);
    assert.equal(core.normalizeDbrainProtocol('UNKNOWN-v9.9').valid, false);
  });

  it('4.2 computes deterministic 8D LSH embeddings, cosine similarity, and genesis Merkle roots', () => {
    const emb1 = core.computeDeterministicEmbedding('chialisp merkle tree');
    assert.equal(emb1.length, 8);
    assert.ok(core.cosineSimilarity(emb1, emb1) > 0.99);
    assert.equal(core.cosineSimilarity(null, emb1), 0);
    assert.equal(core.cosineSimilarity([0, 0], [0, 0]), 0);

    const genesisRoot = core.computeStoreMerkleRoot(SAMPLE_STORE_ID);
    assert.match(genesisRoot, /^0x[0-9a-f]{64}$/);
    const orphanProof = core.computeMerkleInclusionProof({
      id: 'CAP-ORPHAN',
      storeId: SAMPLE_STORE_ID,
      key: 'k',
      keyHex: '6b',
      contentHash: '0x11',
      merkleRoot: genesisRoot
    });
    assert.equal(orphanProof.totalStoreLeaves, 0);
  });

  it('4.3 evaluates SWE-ContextBench 4-signal hybrid recall (LSH + BM25 Symbol + SPO + Merkle Lineage) at Rank #1', () => {
    const corpus = [
      {
        taskId: 'astropy__astropy-14995',
        capsuleId: 'CAP-SWE-103',
        repo: 'astropy/astropy',
        title: 'Fix NDDataRef mask propagation in _arithmetic_mask',
        summary: 'Resolved TypeError when operand.mask is None during bitwise_or.',
        filePaths: ['astropy/nddata/mixins/ndarithmetic.py'],
        symbols: ['NDArithmeticMixin._arithmetic_mask', 'handle_mask'],
        spoTriples: [{ subject: 'NDArithmeticMixin._arithmetic_mask', predicate: 'PROPAGATES', object: 'None', confidence: 0.99 }],
        merkleRoot: '0x77c9'
      },
      {
        taskId: 'astropy__astropy-14000',
        capsuleId: 'CAP-SWE-104',
        repo: 'astropy/astropy',
        title: 'Same-repo distractor issue in Astropy',
        summary: 'Unrelated WCS coordinate frame helper.',
        filePaths: ['astropy/wcs/wcs.py'],
        symbols: ['WCS.all_pix2world'],
        spoTriples: [{ subject: 'CoordFrame', predicate: 'TRANSFORMS', object: 'celestial', confidence: 0.95 }],
        merkleRoot: '0x1111'
      },
      {
        taskId: 'django__django-16411',
        capsuleId: 'CAP-SWE-102',
        repo: 'django/django',
        title: 'SQLCompiler group by deduplication',
        summary: 'Prevent duplicate group by clauses.',
        filePaths: ['django/db/models/sql/compiler.py'],
        symbols: ['SQLCompiler.get_grouping'],
        spoTriples: [],
        merkleRoot: '0x94a1'
      }
    ];

    const res = core.evaluateHybridRecallQuery({
      query: 'Astropy NDArithmeticMixin._arithmetic_mask TypeError in ndarithmetic.py celestial',
      repo: 'astropy/astropy',
      symbols: ['NDArithmeticMixin._arithmetic_mask', 'ndarithmetic.py'],
      expectedParentMerkleRoot: '0x77c9',
      goldTaskId: 'astropy__astropy-14995',
      corpus
    });
    assert.equal(res.goldTaskMatchedAtRank1, true);
    assert.equal(res.rankedTasks[0].merkleLineageVerified, true);

    const resMinimal = core.evaluateHybridRecallQuery({ query: 'a', corpus });
    assert.equal(resMinimal.goldTaskRank, 1);

    const emptyIdx = core.buildCognitiveInvertedIndex();
    assert.equal(emptyIdx.totalIndexed, 0);

    const builtIdx = core.buildCognitiveInvertedIndex(corpus);
    const resIndexedHit = core.evaluateHybridRecallQuery({
      query: 'Astropy NDArithmeticMixin._arithmetic_mask TypeError',
      repo: 'astropy/astropy',
      symbols: ['NDArithmeticMixin._arithmetic_mask', 'unknown_symbol_xyz'],
      goldTaskId: 'astropy__astropy-14995',
      invertedIndex: builtIdx
    });
    assert.equal(resIndexedHit.goldTaskMatchedAtRank1, true);

    const emptyBucketsIdx = {
      totalIndexed: corpus.length,
      tokenMap: new Map(),
      symbolMap: new Map(),
      lshBuckets: new Map(),
      preparedDocs: builtIdx.preparedDocs
    };
    const resIndexedMiss = core.evaluateHybridRecallQuery({
      query: 'zzzznonexistenttoken',
      symbols: ['nonexistent_sym'],
      invertedIndex: emptyBucketsIdx
    });
    assert.equal(resIndexedMiss.candidatesEvaluated, corpus.length);
  });
});

describe('Suite 5: Pillar 5 — Git for Agent Memories (DBRAIN-v1.2 Cognitive Version Control)', () => {
  it('5.1 executes dbrain commit, zero-copy fork, Merkle get_kv_diff, checkout, bisect & non-destructive revert', () => {
    const store = {
      storeId: `0x${SAMPLE_STORE_ID}`,
      name: 'Primary Swarm Brain',
      slug: 'primary-swarm-brain',
      agentDid: `did:chia:${SAMPLE_TXCH_ADDR}`,
      generation: 1,
      merkleRoot: core.computeStoreMerkleRoot(`0x${SAMPLE_STORE_ID}`, []),
      generations: []
    };
    store.generations.push({ generation: 1, merkleRoot: store.merkleRoot });
    const capsules = [];

    assert.throws(() => core.mintCognitiveCapsule({ store, capsules, title: '', content: '' }), /required/);

    const m1 = core.mintCognitiveCapsule({
      store,
      capsules,
      lobe: 'semantic',
      title: 'Astropy NDDataRef Mask Propagation Invariant',
      content: 'Preserve mask when operand.mask is None in _arithmetic_mask.',
      spoTriples: [{ subject: 'NDDataRef', predicate: 'HANDLES_MASK', object: 'None' }]
    });
    store.generations.push({ generation: store.generation, merkleRoot: store.merkleRoot });

    const m2 = core.mintCognitiveCapsule({
      store,
      capsules,
      lobe: 'invalid-lobe-fallback',
      key: 'dbrain:lobe:semantic:custom-key',
      title: 'Second Capsule',
      summary: 'Explicit summary text',
      content: 'Second capsule content for Merkle pairing.'
    });
    store.generations.push({ generation: store.generation, merkleRoot: store.merkleRoot });

    const m3 = core.mintCognitiveCapsule({
      store,
      capsules,
      lobe: 'working',
      title: 'Poisoned Hallucination Commit',
      content: 'Injected zero-day regression bypass into OAuth2 state verifier.'
    });
    m3.capsule.previousCapsuleId = m2.capsule.id;
    store.generations.push({ generation: store.generation, merkleRoot: store.merkleRoot });

    for (const c of [m1.capsule, m2.capsule, m3.capsule]) {
      c.merkleRoot = store.merkleRoot;
      const proof = core.computeMerkleInclusionProof(c, capsules);
      assert.equal(proof.verified, true);
    }

    capsules.push({ id: 'OTHER-STORE-CAP', storeId: '0x9999', key: 'k', keyHex: '6b', contentHash: '0x00', generation: 1 });

    const forked = core.forkStoreZeroCopy({
      sourceStore: store,
      branchName: 'Subagent Verification Branch',
      newStoreIdHex: 'c'.repeat(64)
    });
    assert.equal(forked.forkedAtMerkleRoot, store.merkleRoot);
    assert.equal(forked.copiedCapsuleCount, 0);
    assert.equal(forked.copiedPayloadBytes, 0);

    const checkoutForked = core.checkoutCognitiveSnapshot({
      store: forked,
      capsules,
      stores: [store, forked],
      targetGeneration: 3
    });
    assert.equal(checkoutForked.capsulesCount, 2);

    const diff = core.computeMerkleKvDiff({
      storeId: store.storeId,
      capsules,
      fromGeneration: 1,
      toGeneration: 4
    });
    assert.equal(diff.diffCount, 3);
    assert.ok(diff.bandwidthSavedPct > 99);

    const checkoutGen2 = core.checkoutCognitiveSnapshot({
      store,
      capsules,
      targetGeneration: 2,
      query: 'astropy',
      lobe: 'semantic'
    });
    assert.equal(checkoutGen2.merkleDeterminismVerified, true);
    assert.equal(checkoutGen2.capsulesCount, 1);

    const checkoutUnrecorded = core.checkoutCognitiveSnapshot({
      store: { storeId: store.storeId },
      capsules,
      targetGeneration: 99
    });
    assert.equal(checkoutUnrecorded.merkleDeterminismVerified, true);

    const bisectHit = core.bisectCognitiveHistory({
      generations: store.generations,
      capsules: capsules.filter(c => c.storeId === store.storeId),
      badPattern: 'zero-day regression'
    });
    assert.equal(bisectHit.status, 'regression_isolated');
    assert.equal(bisectHit.firstBadCommit.generation, 4);
    assert.equal(bisectHit.culpritCapsule.id, m3.capsule.id);

    const bisectClean = core.bisectCognitiveHistory({
      generations: store.generations,
      capsules: capsules.filter(c => c.storeId === store.storeId),
      badPattern: 'non-existent-bug-pattern-xyz'
    });
    assert.equal(bisectClean.status, 'clean');

    const revertPreview = core.revertCognitiveGeneration({ store, capsules, targetGeneration: 4 });
    assert.equal(revertPreview.dryRun, true);

    const revertLive = core.revertCognitiveGeneration({
      store: { storeId: store.storeId, generation: store.generation, merkleRoot: store.merkleRoot },
      capsules,
      targetGeneration: 4,
      reason: 'Heal OAuth2 regression',
      dryRun: false
    });
    assert.equal(revertLive.restoredMerkleRoot, store.generations[2].merkleRoot);
    assert.equal(core.computeStoreMerkleRoot(store.storeId, capsules, 5), revertLive.restoredMerkleRoot);
    assert.equal(core.checkoutCognitiveSnapshot({ store, capsules, targetGeneration: 5 }).capsulesCount, 2);
    assert.ok(core.computeMerkleInclusionProof(m3.capsule, capsules).totalStoreLeaves >= 1);

    const bisectPostRevert = core.bisectCognitiveHistory({
      generations: store.generations,
      capsules: capsules.filter(c => c.storeId === store.storeId),
      badPattern: 'zero-day regression'
    });
    assert.equal(bisectPostRevert.status, 'regression_isolated');

    assert.throws(
      () => core.revertCognitiveGeneration({ store, capsules, targetGeneration: 999 }),
      /No active capsules/
    );
  });

  it('5.2 resolves 3-Way Epistemic Merge SPO conflicts via crdt-lww, quarantine, and manual strategies with Canary Gate', () => {
    const baseCaps = [
      { id: 'B1', timestamp: '2026-05-01T00:00:00Z', spoTriples: [{ subject: 'Auth', predicate: 'MODE', object: 'PKCE' }] },
      { id: 'B2' }
    ];
    const incomingNewer = [
      { id: 'I1', spoTriples: [{ subject: 'Auth', predicate: 'MODE', object: 'mTLS' }] },
      { id: 'I2' }
    ];
    const incomingOlder = [
      { id: 'I3', timestamp: '2026-01-01T00:00:00Z', spoTriples: [{ subject: 'Auth', predicate: 'MODE', object: 'Basic' }] }
    ];

    const mergeLwwNew = core.mergeCognitiveBranches({ baseCapsules: baseCaps, incomingCapsules: incomingNewer, strategy: 'crdt-lww' });
    assert.equal(mergeLwwNew.merged, true);
    assert.match(mergeLwwNew.spoConflictAnalysis.conflicts[0].resolution, /RESOLVED_LWW_INCOMING/);

    const mergeLwwBase = core.mergeCognitiveBranches({
      baseCapsules: [{ id: 'B0', spoTriples: [{ subject: 'Auth', predicate: 'MODE', object: 'PKCE' }] }],
      incomingCapsules: incomingOlder,
      strategy: 'crdt-lww'
    });
    assert.equal(mergeLwwBase.merged, true);

    const mergeLwwOlder = core.mergeCognitiveBranches({ baseCapsules: baseCaps, incomingCapsules: incomingOlder, strategy: 'crdt-lww' });
    assert.match(mergeLwwOlder.spoConflictAnalysis.conflicts[0].resolution, /RESOLVED_LWW_BASE/);

    const mergeQuarantine = core.mergeCognitiveBranches({ baseCapsules: baseCaps, incomingCapsules: incomingNewer, strategy: 'quarantine' });
    assert.equal(mergeQuarantine.merged, true);
    assert.equal(mergeQuarantine.spoConflictAnalysis.conflicts[0].resolution, 'QUARANTINED_TO_WORKING_LOBE');

    const mergeManual = core.mergeCognitiveBranches({ baseCapsules: baseCaps, incomingCapsules: incomingNewer, strategy: 'manual' });
    assert.equal(mergeManual.merged, false);

    assert.equal(core.mergeCognitiveBranches({}).merged, true);
  });
});

describe('Suite 6: Pillar 6 & 7 — Zero-Knowledge Private Cortex & Real DIG L4 + Secure-The-Bag Rollup', () => {
  it('6.1 seals and opens Private Cortex AES-256-GCM + HKDF-SHA256 envelopes with AAD binding', () => {
    const payload = { cveCount: 0, status: 'PASS', did: `did:chia:${SAMPLE_TXCH_ADDR}` };
    const env = core.sealPrivateCortexAesGcm(payload, 'swarm-master-key');
    const opened = core.openPrivateCortexAesGcm(env, 'swarm-master-key');
    assert.deepEqual(opened, payload);

    assert.throws(
      () => core.openPrivateCortexAesGcm(env, 'swarm-master-key', 'tampered:aad'),
      /Unsupported state or unable to authenticate data/
    );
  });

  it('6.2 builds Chialisp merkle_utils.clib Secure-The-Bag trees and enforces non-empty leaf invariant', () => {
    assert.throws(() => core.buildChialispMerkleBagTree([]), /at least 1 leaf/);
    const oddLeaves = [Buffer.alloc(32, 1), Buffer.alloc(32, 2), Buffer.alloc(32, 3)];
    const oddBag = core.buildChialispMerkleBagTree(oddLeaves);
    assert.equal(oddBag.getProof(2).proof.length, 2);
  });

  it('6.3 builds CHIP-0035 + $DIG CAT + XCH SpendBundles and enforces selectCoins balance guards', () => {
    const okProve = core.proveDigL4CapsuleAndSpendBundle();
    assert.equal(okProve.status, 'verified');
    assert.equal(okProve.tier1CapsuleCryptoProof.wasmInclusionVerified, true);
    assert.equal(okProve.tier1CapsuleCryptoProof.wasmRoundtripVerified, true);
    assert.equal(okProve.tier2CapsulePromotionProof.totalCoinSpends, 3);

    const zeroFeeProve = core.proveDigL4CapsuleAndSpendBundle({ xchFeeMojos: 0n });
    assert.equal(zeroFeeProve.status, 'verified');
    assert.equal(zeroFeeProve.tier2CapsulePromotionProof.totalCoinSpends, 2);

    const lowXch = core.proveDigL4CapsuleAndSpendBundle({ walletXchBalanceMojos: 0n });
    assert.equal(lowXch.status, 'insufficient_funds');
    assert.equal(lowXch.buildError.code, 'INSUFFICIENT_XCH');

    const lowDig = core.proveDigL4CapsuleAndSpendBundle({ walletDigBalanceBaseUnits: 100n });
    assert.equal(lowDig.status, 'insufficient_funds');
    assert.equal(lowDig.buildError.code, 'INSUFFICIENT_DIG_CAT');
  });

  it('6.4 proves State-Channel bisect clawback, Secure-The-Bag verifyMerkleMembership, verifyPaymentReceipt & CAT consolidation', () => {
    const rollupHealed = core.proveSelfHealingStateChannelBagRollup({ simulateSelfHealingBisect: true });
    assert.equal(rollupHealed.status, 'verified');
    assert.equal(rollupHealed.slashedBaseUnits, '6000');
    assert.equal(rollupHealed.allLeavesWasmVerified, true);
    assert.equal(rollupHealed.tamperedLeafRejected, true);
    assert.equal(rollupHealed.paywallReceiptVerified, true);
    assert.equal(rollupHealed.rolledUpCoinSpendsCount, 4);
    assert.equal(rollupHealed.consolidatedRingSpendsCount, 4);

    const rollupClean = core.proveSelfHealingStateChannelBagRollup({ simulateSelfHealingBisect: false });
    assert.equal(rollupClean.slashedBaseUnits, '0');
    assert.equal(core.proveSelfHealingStateChannelBagRollup().status, 'verified');
  });

  it('6.5 calculates amortized State-Channel + Secure-The-Bag rollup economics vs. naive unbatched on-chain costs', () => {
    const econ = core.calculateDigRollupEconomics();
    assert.equal(econ.monthlyCommits, 225000);
    assert.equal(econ.naiveUnbatchedMonthlyCostUsd, 227250);
    assert.ok(econ.costReductionPct > 99.8);
  });
});

describe('Suite 7: Pillar 8 — Beyond Morphic Resonance & Swarm Architecture Synthesis', () => {
  it('7.1 synthesizes Cryptographic Memory Antibodies from bisected regressions and screens incoming capsules in O(1)', () => {
    assert.throws(() => core.synthesizeCognitiveAntibody({ culpritCapsule: null }), /Valid culpritCapsule/);
    assert.throws(() => core.synthesizeCognitiveAntibody({ culpritCapsule: {} }), /Valid culpritCapsule/);

    const abWithSpo = core.synthesizeCognitiveAntibody({
      culpritCapsule: {
        id: 'CAP-BAD-01',
        title: 'Bypass OAuth2 PKCE State Check',
        spoTriples: [{ subject: 'OAuth2Verifier', predicate: 'ALLOWS_MODE', object: 'unsigned_state' }]
      },
      revertCommitSha: '0xdeadbeef'
    });
    assert.match(abWithSpo.antibodyId, /^AB-2026-[0-9A-F]{8}$/);
    assert.equal(abWithSpo.lobe, 'alignment');
    assert.equal(abWithSpo.negatedSpoTriples[0].predicate, 'FORBID_ALLOWS_MODE');

    const abFallbackSpo = core.synthesizeCognitiveAntibody({
      culpritCapsule: { id: 'CAP-BAD-02', title: 'SQL Raw String Concatenation' },
      revertCommitSha: ''
    });
    assert.equal(abFallbackSpo.revertCommitSha, '0x0');
    assert.equal(abFallbackSpo.negatedSpoTriples[0].predicate, 'FORBID_CAUSES_REGRESSION');

    const screenPatternHit = core.screenAgainstAntibodies({
      incomingCapsule: { title: 'Retry bypass oauth2 pkce state check in client', content: 'unsafe patch' },
      antibodyRegistry: [abWithSpo]
    });
    assert.equal(screenPatternHit.allowed, false);
    assert.equal(screenPatternHit.violations[0].reason, 'FORBIDDEN_PATTERN_MATCH');

    const screenSpoHit = core.screenAgainstAntibodies({
      incomingCapsule: {
        title: 'Unrelated Title',
        content: 'Clean text',
        spoTriples: [{ subject: 'OAuth2Verifier', predicate: 'USES', object: 'unsigned_state' }]
      },
      antibodyRegistry: [abWithSpo, { antibodyId: 'AB-EMPTY', forbiddenPattern: '' }]
    });
    assert.equal(screenSpoHit.allowed, false);
    assert.equal(screenSpoHit.violations[0].reason, 'NEGATED_SPO_COUNTERFACTUAL_MATCH');

    const screenClean = core.screenAgainstAntibodies({
      incomingCapsule: {
        spoTriples: [{ subject: 'OAuth2Verifier', predicate: 'USES', object: 'signed_pkce_state' }]
      },
      antibodyRegistry: [abWithSpo]
    });
    assert.equal(screenClean.allowed, true);
    assert.equal(screenClean.quarantineAction, 'ALLOW_COMMIT');
    assert.equal(core.screenAgainstAntibodies({ incomingCapsule: {} }).allowed, true);
  });

  it('7.2 consolidates episodic traces via Thermodynamic Free-Energy & Active Inference before 25 $DIG promotion', () => {
    const consolidated = core.consolidateThermodynamicMemory({
      episodicCapsules: [
        { id: 'EP-1', title: 'High surprise security invariant', tokens: 2400, surpriseScore: 0.92 },
        { id: 'EP-2', title: 'Routine lint pass', surpriseScore: 0.20 },
        { id: 'EP-3', title: 'Default surprise trace', tokens: 1500 }
      ],
      halfLifeHours: 24,
      elapsedHours: 24,
      surpriseThreshold: 0.65
    });
    assert.equal(consolidated.inputEpisodicCount, 3);
    assert.equal(consolidated.distilledSemanticCount, 1);
    assert.equal(consolidated.prunedEphemeralCount, 2);
    assert.ok(consolidated.tokenCompressionRatio > 1);
    assert.equal(consolidated.consolidatedPromotionCostUsd, 1.01);
    assert.equal(consolidated.digSavedBaseUnits, '50000');

    const emptyConsolidated = core.consolidateThermodynamicMemory();
    assert.equal(emptyConsolidated.distilledSemanticCount, 0);
    assert.equal(emptyConsolidated.consolidatedPromotionCostUsd, 0);
    assert.equal(emptyConsolidated.tokenCompressionRatio, 1);
  });

  it('7.3 performs Predictive Dendritic Lookahead & Speculative Prefetching with 0.00 ms effective recall', () => {
    const graph = [
      {
        capsuleId: 'CAP-101',
        lobe: 'procedural',
        title: 'Astropy NDArithmetic Mask Handler',
        filePaths: ['astropy/nddata/mixins/ndarithmetic.py'],
        symbols: ['NDArithmeticMixin._arithmetic_mask'],
        causalLinks: ['CAP-100']
      },
      {
        capsuleId: 'CAP-102',
        title: 'Fallback Node',
        storeId: SAMPLE_STORE_ID,
        resourceKey: 'dbrain:lobe:semantic:cap-102'
      }
    ];
    const prefetch = core.speculativeDendriticPrefetch({
      activeContext: {
        activeFile: 'ndarithmetic.py',
        activeSymbols: ['_arithmetic_mask'],
        recentCapsuleId: 'CAP-100'
      },
      capsuleGraph: graph,
      topK: 2
    });
    assert.equal(prefetch.effectiveRecallLatencyMs, 0.0);
    assert.equal(prefetch.prefetchedCapsules[0].capsuleId, 'CAP-101');
    assert.ok(prefetch.topTransitionProbability >= 0.95);

    const emptyContextPrefetch = core.speculativeDendriticPrefetch({ capsuleGraph: graph });
    assert.equal(emptyContextPrefetch.prefetchedCount, 2);

    const emptyPrefetch = core.speculativeDendriticPrefetch();
    assert.equal(emptyPrefetch.prefetchedCount, 0);
    assert.equal(emptyPrefetch.topTransitionProbability, 0);
  });

  it('7.4 builds Cross-Swarm Epistemic Knowledge Swaps with CHIP-0035 + Secure-The-Bag royalty verification', () => {
    const swap = core.buildEpistemicKnowledgeSwap();
    assert.equal(swap.status, 'verified');
    assert.equal(swap.wasmMerkleVerified, true);
    assert.equal(swap.receiptVerified, true);
    assert.equal(swap.royaltyPerInsightDig, '0.500 $DIG');
    assert.equal(swap.totalEpochRoyaltyDig, '100.000 $DIG');
  });

  it('7.5 compares the 3 Swarm Cognitive Memory Architectures and 4 Morphic Resonance Field offerings vs. dbrain.to', () => {
    const comp = core.compareSwarmMemoryArchitectures();
    assert.equal(comp.swarmArchitectures.length, 4);
    assert.equal(comp.morphicResonanceFields.length, 4);
    assert.equal(comp.swarmArchitectures[3].id, 'dbrain-merkle-cortex');
    assert.equal(comp.morphicResonanceCadenceEconomics.cadenceRegimes.length, 6);
  });

  it('7.6 calculates Morphic Resonance promotion cadence economics and proves 3-Plane P2P Gossip + L1 Checkpoint model', () => {
    const cadence = core.calculateMorphicResonanceCadenceEconomics();
    assert.equal(cadence.threePlaneArchitecture.length, 3);
    assert.equal(cadence.cadenceRegimes.length, 6);
    assert.equal(cadence.cadenceRegimes[0].economical, false);
    assert.equal(cadence.cadenceRegimes[0].exceedsL1SingletonBlockCeiling, true);
    assert.equal(cadence.cadenceRegimes[4].id, 'every-6-hours');
    assert.equal(cadence.cadenceRegimes[4].recommended, true);
    assert.equal(cadence.cadenceRegimes[4].economical, true);
  });

  it('7.7 executes live Hardware Benchmark & No-Vaporware Reality Audit for recall latency and CoW zero-copy forks', () => {
    const audit = core.runArchitectureRealityAudit();
    assert.equal(audit.status, 'verified');
    assert.equal(audit.recallLatencyRealityCheck.liveHardwareMeasurements.goldTaskMatchedAtRank1, true);
    assert.equal(audit.zeroCopyForkRealityCheck.liveVerification.copiedCapsuleBytesOnFork, 0);
    assert.equal(audit.zeroCopyForkRealityCheck.liveVerification.inheritedParentCapsulesResolved, true);
    assert.equal(audit.zeroCopyForkRealityCheck.liveVerification.merkleRootIdenticalOnFork, true);
    assert.equal(audit.zeroCopyForkRealityCheck.liveVerification.cowChildAdvancedTo3Capsules, true);
    assert.equal(audit.zeroCopyForkRealityCheck.liveVerification.parentIsolatedAt2Capsules, true);
    assert.equal(audit.instantMorphicResonanceRealityCheck.livePlane1Benchmark.merkleProofValid, true);
  });

  it('7.8 compares AWS EKS Web2, Garage Datacenter K8s, and DIG Network Web3 topologies and calculates DBaaS tier economics', () => {
    const dbaas = core.compareDeploymentTopologiesAndDbaasEconomics();
    assert.equal(dbaas.protocol, 'DBRAIN-DBAAS-ECONOMICS-v1.3');
    assert.equal(dbaas.environments.length, 3);
    assert.equal(dbaas.dbaasTiers.length, 4);
    assert.equal(dbaas.activeTier.id, 'swarm-pro');
    assert.equal(dbaas.activeEnvironment.id, 'dig-network-web3');
    assert.ok(dbaas.comparisonSummary.awsWeb2MonthlyUsd > dbaas.comparisonSummary.garageDatacenterMonthlyUsd);
    assert.ok(dbaas.comparisonSummary.customerMonthlySavingsVsAwsUsd > 500);

    // Fallback branch when unknown tierId / environmentId passed
    const fallbackDbaas = core.compareDeploymentTopologiesAndDbaasEconomics({
      selectedTierId: 'unknown-tier',
      selectedEnvironmentId: 'unknown-env'
    });
    assert.equal(fallbackDbaas.activeTier.id, 'swarm-pro');
    assert.equal(fallbackDbaas.activeEnvironment.id, 'dig-network-web3');
  });

  it('7.9 executes live 6-step DBaaS tenant provisioning and cryptographic sandbox test (poisoned & clean modes)', () => {
    const poisonedRun = core.simulateDbaasTenantSandbox({
      tenantName: 'Acme Swarm Labs!',
      tierId: 'starter-brain',
      deploymentMode: 'garage-datacenter-k8s',
      simulatePoisonedCommit: true
    });
    assert.equal(poisonedRun.status, 'DBAAS_SANDBOX_VERIFIED');
    assert.equal(poisonedRun.tenantProfile.tenantName, 'acme-swarm-labs');
    assert.equal(poisonedRun.pipelineSteps.length, 6);
    assert.equal(poisonedRun.pipelineSteps[4].status, 'QUARANTINED_POISON');
    assert.equal(poisonedRun.cryptographicReceipts.wasmValid, true);
    assert.equal(poisonedRun.cryptographicReceipts.zeroCopyBytesCopied, 0);
    assert.equal(poisonedRun.cryptographicReceipts.antibodyBlockedPoison, true);
    assert.equal(poisonedRun.cryptographicReceipts.paywallReceiptVerified, true);

    const cleanRun = core.simulateDbaasTenantSandbox({
      tenantName: '---',
      tierId: 'enterprise-duna',
      deploymentMode: 'aws-eks-web2',
      simulatePoisonedCommit: false
    });
    assert.equal(cleanRun.tenantProfile.tenantName, 'acme-autonomous-swarm');
    assert.equal(cleanRun.pipelineSteps[4].status, 'PASS_CLEAN');
    assert.equal(cleanRun.cryptographicReceipts.antibodyBlockedPoison, false);
  });

  it('7.10 verifies Split-Brain Partition Immunity and Ring-0 Autonomic Reflex Override (zero bureaucratic inertia)', () => {
    const defaultDefense = core.simulateSplitBrainAndReflexOverrideDefense();
    assert.equal(defaultDefense.status, 'SPLIT_BRAIN_AND_INERTIA_DEFENSE_VERIFIED');
    assert.equal(defaultDefense.splitBrainDefense.canCompetingRealitiesCoexistOnL1, false);
    assert.equal(defaultDefense.splitBrainDefense.factionBDisconnected.leaseExpired, true);
    assert.equal(defaultDefense.splitBrainDefense.factionBDisconnected.externalSideEffectsBlocked, true);
    assert.equal(defaultDefense.splitBrainDefense.factionBDisconnected.status, 'FENCED_IN_SPECULATIVE_QUARANTINE_BRANCH');
    assert.equal(defaultDefense.splitBrainDefense.factionBDisconnected.zeroCopyBytesCopiedOnQuarantine, 0);
    assert.equal(defaultDefense.splitBrainDefense.partitionHealReconciliation.rebasedCleanlyOntoEpoch42, 1);
    assert.equal(defaultDefense.splitBrainDefense.partitionHealReconciliation.quarantinedPolicyViolations, 1);
    assert.equal(defaultDefense.splitBrainDefense.partitionHealReconciliation.conflictingStalePolicyCapsuleQuarantined, true);
    assert.equal(defaultDefense.bureaucraticInertiaDefense.ring0AutonomicReflexOverride.multiAgentDebateRoundsRequired, 0);
    assert.equal(defaultDefense.bureaucraticInertiaDefense.ring0AutonomicReflexOverride.bftVotingRoundsRequired, 0);

    // Branch where 0/empty values trigger safe fallback defaults
    const fallbackDefense = core.simulateSplitBrainAndReflexOverrideDefense({
      totalAgents: 0,
      connectedAgentsPct: 0,
      alignmentLeaseTtlSec: 0,
      partitionDurationSec: 0,
      overridePolicyDirective: ''
    });
    assert.equal(fallbackDefense.splitBrainDefense.factionBDisconnected.leaseExpired, true);

    // Branch where partition is shorter than lease TTL (5s <= 30s) and disconnected commits are clean
    const graceDefense = core.simulateSplitBrainAndReflexOverrideDefense({
      totalAgents: 20,
      connectedAgentsPct: 60,
      alignmentLeaseTtlSec: 30,
      partitionDurationSec: 5,
      overridePolicyDirective: 'ENFORCE_READ_ONLY_EXTERNAL_TOOLS',
      simulateConflictingDisconnectedCommit: false
    });
    assert.equal(graceDefense.splitBrainDefense.factionBDisconnected.leaseExpired, false);
    assert.equal(graceDefense.splitBrainDefense.factionBDisconnected.status, 'WITHIN_LEASE_GRACE_WINDOW');
    assert.equal(graceDefense.splitBrainDefense.partitionHealReconciliation.rebasedCleanlyOntoEpoch42, 2);
    assert.equal(graceDefense.splitBrainDefense.partitionHealReconciliation.quarantinedPolicyViolations, 0);
    assert.equal(graceDefense.splitBrainDefense.partitionHealReconciliation.conflictingStalePolicyCapsuleQuarantined, false);
  });

  it('7.11 classifies, seals, seeds, and filters multi-tenant Public vs. Private vs. DUNA Quorum API exchanges', () => {
    const seeded = core.buildSeedMultiTenantApiTraffic();
    assert.equal(seeded.length, 8);

    // Default classify call (public shared cortex fallback)
    const defaultEx = core.classifyTenantApiExchange();
    assert.equal(defaultEx.cortexVisibility, 'PUBLIC_SHARED_CORTEX');
    assert.equal(defaultEx.zkRedacted, false);
    assert.equal(defaultEx.protocolChannel, 'REST_API');

    // Auto-inferred protocol channels from path when protocolChannel is omitted
    const mcpAuto = core.classifyTenantApiExchange({ path: '/api/mcp', tenantId: 'core-commons-public' });
    assert.equal(mcpAuto.protocolChannel, 'MCP_JSONRPC');

    const digAuto = core.classifyTenantApiExchange({ path: '/api/dig-rpc', tenantId: 'zurich-zk-vault' });
    assert.equal(digAuto.protocolChannel, 'DIG_OPENRPC');
    assert.equal(digAuto.encryptionMode, 'DIG_HKDF_BLIND_HOST_AEAD');
    assert.equal(digAuto.zkRedacted, true);

    const reflexAuto = core.classifyTenantApiExchange({ path: '/api/dbrain/split-brain-defense', tenantId: 'wyoming-duna-501c4' });
    assert.equal(reflexAuto.protocolChannel, 'RING0_REFLEX');
    assert.equal(reflexAuto.encryptionMode, 'BLS_QUORUM_ZK_SD');

    // Custom requestBody / responseBody / encryptionMode / merkleRoot branch
    const customEx = core.classifyTenantApiExchange({
      tenantId: 'acme-autonomous-swarm',
      method: 'POST',
      path: '/api/dbrain/capsules',
      lobe: 'invalid-lobe',
      encryptionMode: 'CUSTOM_ENC',
      merkleRoot: '0x1111',
      statusCode: 0,
      latencyMs: 0,
      requestBody: { customReq: true },
      responseBody: { customRes: true }
    });
    assert.equal(customEx.lobe, 'semantic');
    assert.equal(customEx.encryptionMode, 'CUSTOM_ENC');
    assert.equal(customEx.merkleRoot, '0x1111');
    assert.equal(customEx.requestWire.body.customReq, true);
    assert.equal(customEx.responseWire.body.customRes, true);

    // Filtering across all tenant distinguishing dimensions
    const allFiltered = core.filterMultiTenantApiTraffic(seeded);
    assert.equal(allFiltered.summary.totalCaptured, 8);
    assert.equal(allFiltered.summary.filteredCount, 8);
    assert.equal(allFiltered.summary.publicSharedCount, 3);
    assert.equal(allFiltered.summary.privateZkEnclaveCount, 3);
    assert.equal(allFiltered.summary.sovereignDunaCount, 2);

    const onlyPrivate = core.filterMultiTenantApiTraffic(seeded, { cortexVisibility: 'PRIVATE_ZK_ENCLAVE' });
    assert.equal(onlyPrivate.exchanges.length, 3);
    assert.ok(onlyPrivate.exchanges.every(x => x.zkRedacted === true));

    const byTenant = core.filterMultiTenantApiTraffic(seeded, { tenantId: 'acme-autonomous-swarm' });
    assert.equal(byTenant.exchanges.length, 1);

    const byDid = core.filterMultiTenantApiTraffic(seeded, { tenantDid: 'zurich' });
    assert.equal(byDid.exchanges.length, 1);

    const byStore = core.filterMultiTenantApiTraffic(seeded, { storeId: '0x77a1c09e' });
    assert.equal(byStore.exchanges.length, 2);

    const byLobe = core.filterMultiTenantApiTraffic(seeded, { lobe: 'alignment' });
    assert.equal(byLobe.exchanges.length, 2);

    const byChannel = core.filterMultiTenantApiTraffic(seeded, { protocolChannel: 'MCP_JSONRPC' });
    assert.equal(byChannel.exchanges.length, 2);

    const byTier = core.filterMultiTenantApiTraffic(seeded, { dbaasTier: 'starter-brain' });
    assert.equal(byTier.exchanges.length, 1);

    const bySearch = core.filterMultiTenantApiTraffic(seeded, { search: 'astropy' });
    assert.equal(bySearch.exchanges.length, 1);

    const noMatch = core.filterMultiTenantApiTraffic('not-an-array', { search: 'nonexistent-xyz' });
    assert.equal(noMatch.exchanges.length, 0);
    assert.equal(noMatch.summary.avgLatencyMs, 0);
  });

  it('7.12 compresses permutations with Chia benes-perm (BENES01\\0 Beneš + Factoradic blocks) and executes bidirectional & many-to-many cognitive lookups', () => {
    assert.equal(core.benesFactoradicBitCount(0), 0);
    assert.equal(core.benesFactoradicBitCount(1), 0);
    assert.equal(core.benesFactoradicBitCount(31), 113);
    assert.equal(core.benesFactoradicBitCount(32), 118);

    const layout1 = core.computeBenesLayoutMetrics(1);
    assert.equal(layout1.payloadBytes, 0);
    assert.equal(layout1.minimumTheoreticalBytes, 0);

    // Verify exact byte-level parity with Chia-Network/benes-perm BENCHMARKS.md
    const expectedPayloads = {
      31: 15,
      32: 15,
      33: 16,
      63: 37,
      64: 38,
      65: 39,
      96: 64,
      127: 91,
      128: 91,
      129: 92,
      1048575: 2449406,
      1048576: 2449408
    };
    for (const [sizeStr, expectedBytes] of Object.entries(expectedPayloads)) {
      const m = core.computeBenesLayoutMetrics(Number(sizeStr));
      assert.equal(m.payloadBytes, expectedBytes, `Payload mismatch for n=${sizeStr}`);
    }

    // Error guards
    assert.throws(() => core.compressBenesPermutation([]), /must be a non-empty array/);
    assert.throws(() => core.createBenesPermutationView(Buffer.from('invalid')), /invalid or truncated/);

    // Test odd-sized non-power-of-two permutation (n = 65) and even power-of-two (n = 64)
    for (const testN of [31, 32, 33, 63, 64, 65, 129]) {
      const perm = Array.from({ length: testN }, (_, idx) => (idx * 17 + 5) % testN);
      const blob = core.compressBenesPermutation(perm, { middleGroupLog2: 5, middlePlacement: 1 });
      const view = core.createBenesPermutationView(blob);
      assert.equal(view.size, testN);
      for (let i = 0; i < testN; i++) {
        assert.equal(view.forward(i), perm[i], `Forward mismatch at i=${i} for n=${testN}`);
        assert.equal(view.inverse(perm[i]), i, `Inverse mismatch at y=${perm[i]} for n=${testN}`);
      }
    }

    // Also test where odd input tail maps directly to odd output tail (y >= 2 * botCount on first step)
    const identityOdd33 = Array.from({ length: 33 }, (_, idx) => idx);
    const idBlob33 = core.compressBenesPermutation(identityOdd33);
    const idView33 = core.createBenesPermutationView(idBlob33);
    assert.equal(idView33.forward(32), 32);
    assert.equal(idView33.inverse(32), 32);

    // Many-to-Many Cognitive Fanout Index (default fallback + custom corpus)
    const defaultM2m = core.buildBenesManyToManyCognitiveIndex();
    assert.equal(defaultM2m.capsuleCount, 1);
    assert.equal(defaultM2m.slotToLeafForward(0), 0);
    assert.equal(defaultM2m.leafToSlotInverse(0), 0);
    assert.deepEqual(defaultM2m.lookupCapsulesByTerm('handle_mask'), [0]);
    assert.deepEqual(defaultM2m.lookupCapsulesByTerm('nonexistent_symbol'), []);
    assert.deepEqual(defaultM2m.lookupCapsulesByTerm(''), []);
    assert.ok(defaultM2m.lookupTermsByCapsule(0).includes('handle_mask'));
    assert.deepEqual(defaultM2m.lookupTermsByCapsule(-1), []);
    assert.deepEqual(defaultM2m.lookupTermsByCapsule(999), []);

    const multiCorpus = [
      { taskId: 't1', capsuleId: 'c1', repo: 'repo-b', symbols: ['sym_z', 'sym_a'] },
      { taskId: 't2', capsuleId: 'c2', repo: 'repo-a', symbols: ['sym_a', 'sym_m'] },
      { taskId: '', capsuleId: '', repo: '', symbols: ['sym_a'] }
    ];
    const customM2m = core.buildBenesManyToManyCognitiveIndex(multiCorpus);
    assert.equal(customM2m.capsuleCount, 3);
    assert.deepEqual(customM2m.lookupCapsulesByTerm('sym_a').sort(), [0, 1, 2]);

    // Benchmark execution
    const benchDefault = core.runBenesPermutationBenchmark();
    assert.equal(benchDefault.status, 'BENES01_BENCHMARK_VERIFIED');
    assert.equal(benchDefault.liveVerification.bijectiveRoundTripPassed, true);
    assert.equal(benchDefault.millionCapsuleScaleMetrics.benesPayloadBytes, 2449408);
    assert.equal(benchDefault.millionCapsuleScaleMetrics.savingsVsBidirectionalUint32Pct, 70.8);

    const benchCustom = core.runBenesPermutationBenchmark({ sampleSize: 0 });
    assert.equal(benchCustom.liveVerification.testedPermutationSize, 128);
  });

  it('7.13 parses Obsidian [[wikilinks]] & gbrain entity Markdown, compiles Second Brain vaults into .dig capsules + BENES01\\0 index, and exports bidirectional Markdown', () => {
    // 1. Default starter vault compilation
    const defaultVault = core.compileSecondBrainVault();
    assert.equal(defaultVault.status, 'SECOND_BRAIN_VAULT_COMPILED');
    assert.equal(defaultVault.totalNotesCompiled, 6);
    assert.ok(defaultVault.totalWikilinkEdges >= 10);
    assert.ok(defaultVault.totalSpoTriples >= 12);
    assert.equal(defaultVault.lobeBreakdown.episodic, 1);
    assert.equal(defaultVault.lobeBreakdown.semantic, 2);
    assert.equal(defaultVault.lobeBreakdown.procedural, 1);
    assert.equal(defaultVault.lobeBreakdown.alignment, 1);
    assert.equal(defaultVault.lobeBreakdown.working, 1);
    assert.equal(defaultVault.benesVaultIndexSummary.magic, 'BENES01\\0');
    assert.equal(defaultVault.exportedMarkdownFiles.length, 6);

    // 2. Test parseSecondBrainMarkdownNote edge cases (no frontmatter, no H1, aliased wikilinks, comment lines in frontmatter)
    const bareNote = core.parseSecondBrainMarkdownNote(
      'Plain text referencing [[Target Page#Section|Custom Alias]] and #tag1',
      'notes/bare-concept.md'
    );
    assert.equal(bareNote.title, 'bare-concept');
    assert.equal(bareNote.lobe, 'semantic');
    assert.equal(bareNote.visibility, 'PRIVATE_ZK_ENCLAVE');
    assert.equal(bareNote.wikilinks[0].target, 'Target Page');
    assert.equal(bareNote.wikilinks[0].alias, 'Custom Alias');
    assert.ok(bareNote.tags.includes('tag1'));

    const fmWithoutColonLine = core.parseSecondBrainMarkdownNote(
      '---\ninvalid_line_without_colon\ntitle: "Quoted Title"\ntags: [alpha, , beta]\n---\nBody text'
    );
    assert.equal(fmWithoutColonLine.title, 'Quoted Title');
    assert.deepEqual(fmWithoutColonLine.tags, ['alpha', 'beta']);

    // 3. Test exportCapsuleToSecondBrainMarkdown with non-array tags/backlinks and empty notes
    const exportedEmpty = core.exportCapsuleToSecondBrainMarkdown(
      { id: 'CAP-1', title: 'Solo', lobe: 'working', leafHash: 'abc', content: 'Solo body', visibility: '', tags: null },
      null
    );
    assert.ok(exportedEmpty.includes('_No incoming backlinks yet_'));

    // 4. Custom vault compilation with fallback filePath/content
    const customVault = core.compileSecondBrainVault(
      [{ filePath: '', content: '' }],
      { storeId: '0x1111111111111111111111111111111111111111111111111111111111111111' }
    );
    assert.equal(customVault.totalNotesCompiled, 1);

    // 5. Evolution comparison matrix
    const comparison = core.buildSecondBrainEvolutionComparison();
    assert.equal(comparison.generations.length, 3);
    assert.equal(comparison.folderToLobeMapping.length, 5);
    assert.equal(comparison.defaultStarterVaultNotes.length, 6);
  });

  it('7.14 builds Agentic Internet manifests (/.well-known/agent.json, /.well-known/mcp.json, /llms.txt), discovers B2A/A2A services, and synthesizes, verifies & settles Chialisp + Chia Offer smart contracts', () => {
    // 1. Agentic Internet & MCP & llms.txt manifests (default & custom origin)
    const agentManifestDefault = core.buildAgenticInternetManifest();
    assert.equal(agentManifestDefault.domain, 'dbrain.to');
    assert.equal(agentManifestDefault.canonicalOrigin, 'https://dbrain.to');
    assert.equal(agentManifestDefault.benchmarkSlos.edgeReadP99Ms, 0.29);
    assert.equal(agentManifestDefault.autonomousServiceCatalog.length, 6);

    const agentManifestCustom = core.buildAgenticInternetManifest('https://custom.dbrain.to///');
    assert.equal(agentManifestCustom.canonicalOrigin, 'https://custom.dbrain.to');

    const mcpManifestDefault = core.buildMcpDiscoveryManifest();
    assert.equal(mcpManifestDefault.serverName, 'dbrain.to-mcp-server');
    assert.equal(mcpManifestDefault.coreCognitiveTools.length, 5);
    assert.ok(mcpManifestDefault.extendedCognitiveAndContractTools.includes('dbrain_negotiate_contract'));

    const mcpManifestCustom = core.buildMcpDiscoveryManifest('https://custom.dbrain.to/');
    assert.equal(mcpManifestCustom.canonicalOrigin, 'https://custom.dbrain.to');

    const llmsCompact = core.buildLlmsTxtManifest();
    assert.ok(llmsCompact.includes('0.11ms P50 / 0.29ms P99 Local Edge Recall'));
    assert.ok(!llmsCompact.includes('## Autonomous Service Catalog'));

    const llmsFull = core.buildLlmsTxtManifest('https://dbrain.to/', true);
    assert.ok(llmsFull.includes('## Autonomous Service Catalog'));
    assert.ok(llmsFull.includes('SVC-SOVEREIGN-STORE-PROVISION'));

    // 2. Service discovery & filtering
    const allServices = core.discoverAgenticServices(null);
    assert.equal(allServices.count, 6);

    const byId = core.discoverAgenticServices({ serviceId: 'svc-zk-private-cortex-enclave' });
    assert.equal(byId.count, 1);
    assert.equal(byId.services[0].serviceId, 'SVC-ZK-PRIVATE-CORTEX-ENCLAVE');

    const byCatAndCost = core.discoverAgenticServices({
      category: 'STORE_PROVISIONING',
      capability: 'benes-perm',
      maxDigCost: 30,
      maxXchCost: 0.001,
      query: 'singleton'
    });
    assert.equal(byCatAndCost.count, 1);

    const filteredOut = core.discoverAgenticServices({
      category: 'ALL',
      capability: 'nonexistent-cap'
    });
    assert.equal(filteredOut.count, 0);

    const filteredByCostAndQuery = core.discoverAgenticServices({
      maxDigCost: 18,
      maxXchCost: 0.0001
    });
    assert.equal(filteredByCostAndQuery.count, 0);

    const filteredByQueryMiss = core.discoverAgenticServices({ query: 'zzz_no_match_zzz' });
    assert.equal(filteredByQueryMiss.count, 0);

    // 3. Smart Contract synthesis (default & custom options with valid Bech32m DID vs synthetic DID)
    const defaultContract = core.synthesizeAgentServiceSmartContract(null);
    assert.equal(defaultContract.status, 'READY_FOR_SETTLEMENT');
    assert.ok(defaultContract.offer.offerString.startsWith('offer1'));
    assert.equal(defaultContract.merkleCommitment.wasmMerkleVerified, true);

    const validChiaDidContract = core.synthesizeAgentServiceSmartContract({
      clientAgentId: 'agent:lochness:recruiter',
      clientDid: 'did:chia:txch1377s2ss0n6wh0z29rxny7dlyjf8akt2hstrwnsknxzjaflm04sfsuz5c96',
      serviceId: 'SVC-UNKNOWN-FALLBACK',
      durationEpochs: 4,
      customSlaRequirement: 'Strict <= 0.25ms recall',
      requiredClaims: ['proof_of_humanity', 'verified_skills'],
      storeId: '0x00b19c5bc9dc40e62da459bbf69252622ac8b64a30c9a497c80fe8554eacad5f'
    });
    assert.equal(validChiaDidContract.service.serviceId, 'SVC-SOVEREIGN-STORE-PROVISION');
    assert.equal(validChiaDidContract.service.durationEpochs, 4);
    assert.equal(
      validChiaDidContract.provisioningPreview.provisionedStoreId,
      '0x00b19c5bc9dc40e62da459bbf69252622ac8b64a30c9a497c80fe8554eacad5f'
    );

    const rawAddressClientContract = core.synthesizeAgentServiceSmartContract({
      clientDid: 'txch1377s2ss0n6wh0z29rxny7dlyjf8akt2hstrwnsknxzjaflm04sfsuz5c96'
    });
    assert.ok(rawAddressClientContract.counterparty.puzzleHash.startsWith('0x'));

    // 4. Offer & Commitment Verification
    const verifyEmpty = core.verifyAgentServiceSmartContract(null);
    assert.equal(verifyEmpty.valid, false);

    const verifyBadPrefix = core.verifyAgentServiceSmartContract({
      offerString: 'txch1377s2ss0n6wh0z29rxny7dlyjf8akt2hstrwnsknxzjaflm04sfsuz5c96'
    });
    assert.equal(verifyBadPrefix.valid, false);

    const verifyBadChar = core.verifyAgentServiceSmartContract({
      offerString: 'offer1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb!'
    });
    assert.equal(verifyBadChar.valid, false);

    const verifyBadChecksum = core.verifyAgentServiceSmartContract({
      offerString: defaultContract.offer.offerString.slice(0, -1) + 'q'
    });
    assert.equal(verifyBadChecksum.valid, false);

    const verifyValid = core.verifyAgentServiceSmartContract({
      offerString: defaultContract.offer.offerString,
      expectedCommitmentRootHex: defaultContract.merkleCommitment.commitmentRootHex
    });
    assert.equal(verifyValid.valid, true);
    assert.equal(verifyValid.commitmentMatched, true);

    const verifyMismatch = core.verifyAgentServiceSmartContract({
      offerString: defaultContract.offer.offerString,
      expectedCommitmentRootHex: '0x' + '11'.repeat(32)
    });
    assert.equal(verifyMismatch.valid, false);
    assert.equal(verifyMismatch.commitmentMatched, false);

    // 5. Settlement & Live Service Provisioning
    const settledDefault = core.settleAndProvisionAgentServiceContract(null);
    assert.equal(settledDefault.settled, true);
    assert.equal(settledDefault.status, 'PROVISIONED_AND_ACTIVE');
    assert.ok(settledDefault.slaCapsule.id.startsWith('CAP-BRAIN-2026-'));

    const settledWithExplicitOffer = core.settleAndProvisionAgentServiceContract({
      offerString: defaultContract.offer.offerString,
      strictCommitmentMatch: true,
      existingCapsules: [settledDefault.slaCapsule]
    });
    assert.equal(settledWithExplicitOffer.settled, true);

    const settledRejectedBadOffer = core.settleAndProvisionAgentServiceContract({
      offerString: 'invalid_offer_string'
    });
    assert.equal(settledRejectedBadOffer.settled, false);
    assert.equal(settledRejectedBadOffer.status, 'REJECTED_INVALID_OFFER');

    const settledRejectedMismatch = core.settleAndProvisionAgentServiceContract({
      offerString: validChiaDidContract.offer.offerString,
      clientAgentId: 'agent:different:counterparty',
      strictCommitmentMatch: true
    });
    assert.equal(settledRejectedMismatch.settled, false);
    assert.equal(settledRejectedMismatch.error, 'Offer commitment root mismatch');
  });

  it('42. Pillar 12: Rust & Native/WASM Core Acceleration Engine (crates/dbrain-core-rs)', () => {
    const caps = core.getRustCoreCapabilities();
    assert.equal(caps.crateName, 'dbrain-core-rs');
    assert.equal(caps.wasmEngineActive, true);
    assert.ok(caps.wasmBinaryBytes > 0);
    assert.equal(caps.preExistingRustWasmEngines.length, 2);
    assert.equal(caps.acceleratedHotPaths.length, 7);

    const benchDefault = core.runRustAccelerationBenchmark();
    assert.equal(benchDefault.status, 'RUST_CORE_ACCELERATION_VERIFIED');
    assert.equal(benchDefault.liveParityVerification.benesRoundTripVerified, true);
    assert.equal(benchDefault.liveParityVerification.bech32mRoundTripVerified, true);
    assert.equal(benchDefault.liveParityVerification.wasmDotProductVerified, true);
    assert.equal(benchDefault.complexCalculationBenchmarks.length, 7);
    assert.equal(benchDefault.macroBenchmarkImpact.rustCoreRecallP50Ms, 0.018);
    assert.equal(benchDefault.macroBenchmarkImpact.rustCoreRecallP99Ms, 0.045);
    assert.equal(benchDefault.macroBenchmarkImpact.speedupVsCloudVectorDb, '1,071x');
    assert.equal(benchDefault.applicationAspectBreakdown.length, 3);

    const benchCustom = core.runRustAccelerationBenchmark({ sampleSize: 64, iterations: 60 });
    assert.equal(benchCustom.liveParityVerification.testedPermutationSize, 64);
  });

  it('43. Pillar 13: Air-Gapped Clear Signing & CHIP-0043 MIPS Vault Verification Engine', () => {
    assert.equal(core.CLEAR_SIGNING_VAULT_PRESETS.length, 4);

    const msgDefault = core.calculateVaultSigningMessages();
    assert.equal(msgDefault.vaultVersion, 'ForceSingletonRecreation');
    assert.equal(msgDefault.vaultPuzzleMessageBytes, 64);
    assert.equal(msgDefault.vaultCoinMessageBytes, 96);
    assert.equal(msgDefault.startRecoveryMessageBytes, 96);
    assert.equal(msgDefault.recoveryRestrictions.length, 7);
    assert.notEqual(
      msgDefault.legacyRecoveryDelegatedPuzzleHash,
      msgDefault.forceSingletonRecreationDelegatedPuzzleHash
    );

    const msgLegacy = core.calculateVaultSigningMessages({
      vaultVersion: 'Legacy',
      recoveryTimelockSeconds: 3600,
      delegatedPuzzleHash: '0x' + '11'.repeat(32),
      vaultPuzzleHash: '0x' + '22'.repeat(32),
      vaultCoinId: '0x' + '33'.repeat(32),
      genesisChallenge: '0x' + '44'.repeat(32),
      leftSideSubtreeHash: '0x' + '55'.repeat(32)
    });
    assert.equal(msgLegacy.vaultVersion, 'Legacy');
    assert.equal(msgLegacy.recoveryRestrictions.length, 6);
    assert.equal(
      msgLegacy.activeRecoveryDelegatedPuzzleHash,
      msgLegacy.legacyRecoveryDelegatedPuzzleHash
    );

    // Verify all 4 canonical presets + unknown preset fallback
    for (const preset of core.CLEAR_SIGNING_VAULT_PRESETS) {
      const res = core.parseAndVerifyClearSigningTransaction({ presetId: preset.presetId });
      assert.equal(res.verified, true);
      assert.equal(res.status, 'CLEAR_SIGNING_VERIFIED');
      assert.equal(res.errorCode, 'NONE');
      assert.equal(res.driverError, null);
      assert.ok(res.airGappedEnvelope.urPayload.startsWith('ur:chia-clear-sign/v1/'));
    }

    const fallbackRes = core.parseAndVerifyClearSigningTransaction({ presetId: 'UNKNOWN-PRESET' });
    assert.equal(fallbackRes.presetId, 'VAULT-TX-A2A-ESCROW');
    assert.equal(fallbackRes.verified, true);

    const defaultRes = core.parseAndVerifyClearSigningTransaction();
    assert.equal(defaultRes.verified, true);

    // Verify all 7 tamper failure modes
    const t1 = core.parseAndVerifyClearSigningTransaction({ tamperUnquotedDelegatedSpend: true });
    assert.equal(t1.verified, false);
    assert.equal(t1.driverError, 'DriverError::InvalidDelegatedSpendFormat');

    const t2 = core.parseAndVerifyClearSigningTransaction({ tamperInvalidMessageMode: true });
    assert.equal(t2.verified, false);
    assert.equal(t2.driverError, 'DriverError::InvalidVaultMessageFormat');

    const t3 = core.parseAndVerifyClearSigningTransaction({ tamperMissingCoinSpendReveal: true });
    assert.equal(t3.verified, false);
    assert.equal(t3.driverError, 'DriverError::MissingSpend');

    const t4 = core.parseAndVerifyClearSigningTransaction({ tamperWrongPuzzleHash: true });
    assert.equal(t4.verified, false);
    assert.equal(t4.driverError, 'DriverError::WrongPuzzleHash');

    const t5 = core.parseAndVerifyClearSigningTransaction({ tamperWrongConditions: true });
    assert.equal(t5.verified, false);
    assert.equal(t5.driverError, 'DriverError::WrongConditions');

    const t6 = core.parseAndVerifyClearSigningTransaction({ tamperUnguaranteedClawback: true });
    assert.equal(t6.verified, false);
    assert.equal(t6.driverError, 'DriverError::UnguaranteedClawBack');

    const t7 = core.parseAndVerifyClearSigningTransaction({ tamperUnaccountedAssetDrain: true });
    assert.equal(t7.verified, false);
    assert.equal(t7.driverError, 'PolicyError::UnaccountedAssetDrain');

    // Air-gapped signing pass & block
    const signedDefault = core.signAirGappedClearSigningEnvelope();
    assert.equal(signedDefault.signed, true);
    assert.equal(signedDefault.status, 'AIR_GAPPED_CLEAR_SIGNED_AND_READY');
    assert.ok(signedDefault.urResponsePayload.startsWith('ur:chia-signature/v1/'));

    const signedCustom = core.signAirGappedClearSigningEnvelope({
      presetId: 'VAULT-TX-DUNA-TREASURY-GRANT',
      signerCurve: 'Secp256k1_HardwareWallet',
      signerDid: 'did:chia:xch1duna_steward'
    });
    assert.equal(signedCustom.signed, true);
    assert.equal(signedCustom.signerCurve, 'Secp256k1_HardwareWallet');

    const signedBlocked = core.signAirGappedClearSigningEnvelope({
      tamperWrongPuzzleHash: true
    });
    assert.equal(signedBlocked.signed, false);
    assert.equal(signedBlocked.status, 'BLOCKED_BY_CLEAR_SIGNING_VERIFIER');
    assert.equal(signedBlocked.driverError, 'DriverError::WrongPuzzleHash');
  });
});

