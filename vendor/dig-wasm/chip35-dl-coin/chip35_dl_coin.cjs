/**
 * Build coin spends that reserve `fee` mojos from the spender's own coins while asserting
 * concurrent spend of `assert_coin_ids` (see [`chip35_dl_coin::add_fee`]). Lets a fee-less
 * singleton op (update/melt) carry a network fee. `selected_coins` is `Coin[]`,
 * `assert_coin_ids` is `Uint8Array[]` of 32-byte coin ids. Returns `CoinSpend[]`.
 * @param {Uint8Array} spender_synthetic_key
 * @param {Coin[]} selected_coins
 * @param {Uint8Array[]} assert_coin_ids
 * @param {bigint} fee
 * @returns {CoinSpend[]}
 */
function addFee(spender_synthetic_key, selected_coins, assert_coin_ids, fee) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(spender_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.addFee(retptr, ptr0, len0, addHeapObject(selected_coins), addHeapObject(assert_coin_ids), fee);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Build the **Admin** delegated puzzle for a 48-byte synthetic public key (a hub Teams admin).
 * An admin may update the store AND change delegation (add/remove writers — i.e. revoke a deploy
 * token), but cannot transfer ownership. Returns a `DelegatedPuzzle` (`{ adminInnerPuzzleHash }`).
 * @param {Uint8Array} synthetic_key
 * @returns {DelegatedPuzzle}
 */
function adminDelegatedPuzzleFromKey(synthetic_key) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.adminDelegatedPuzzleFromKey(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Build the keyless CAT consolidation spends: ring-merge up to `cap` (default 50) of the SMALLEST
 * `selected_cats` (all of ONE asset id) into ONE output CAT coin (self-send of `total`) back to the
 * spender (see [`chip35_dl_coin::build_cat_consolidation`]). The CAT ring nets to zero, so it pays no
 * network fee — carry one on a separate XCH coin via `addFee` asserting the lead CAT coin id.
 * Requires ≥2 CATs. Returns `CoinSpend[]`.
 * @param {Uint8Array} spender_synthetic_key
 * @param {Cat[]} selected_cats
 * @param {number | null} [cap]
 * @returns {CoinSpend[]}
 */
function buildCatConsolidation(spender_synthetic_key, selected_cats, cap) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(spender_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.buildCatConsolidation(retptr, ptr0, len0, addHeapObject(selected_cats), isLikeNone(cap) ? Number.MAX_SAFE_INTEGER : (cap) >>> 0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Build the coin spends for a buyer to pay the dapp owner `amount` base units of a **CAT** (incl.
 * DIG) (#46 payment). `selected_cats` is the buyer's `Cat[]` of ONE asset id (as
 * `chip0002_getAssetCoins` returns them); `nonce` is the 32-byte unlock nonce. The CAT ring nets to
 * zero, so carry any XCH network fee with a separate XCH coin via `addFee` asserting the lead CAT
 * coin id. Returns `{ coinSpends, receipt }`.
 * @param {Uint8Array} buyer_synthetic_key
 * @param {Cat[]} selected_cats
 * @param {Uint8Array} owner_puzzle_hash
 * @param {bigint} amount
 * @param {Uint8Array} nonce
 * @returns {PaymentResponse}
 */
function buildCatPayment(buyer_synthetic_key, selected_cats, owner_puzzle_hash, amount, nonce) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(buyer_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(owner_puzzle_hash, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(nonce, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.buildCatPayment(retptr, ptr0, len0, addHeapObject(selected_cats), ptr1, len1, amount, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Build a CHIP-0007 metadata document from a JS object and return its canonical JSON + the
 * `metadata_hash` (sha256 of that JSON). De-dupes the hand-computed badge metadata: callers stop
 * hand-rolling SHA-256. Returns `{ json: string, metadataHash: Uint8Array }`. Validates schema.
 * @param {Chip0007Metadata} metadata
 * @returns {Chip0007MetadataResult}
 */
function buildChip0007Metadata(metadata) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.buildChip0007Metadata(retptr, addHeapObject(metadata));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Build the keyless XCH consolidation spends: merge up to `cap` (default 50) of the SMALLEST `coins`
 * into ONE output coin (self-send of `total - fee`) back to the spender, reserving an optional `fee`
 * (see [`chip35_dl_coin::build_coin_consolidation`]). `selected_coins` is the spender's XCH `Coin[]`;
 * the output goes to the spender's own puzzle hash. Requires ≥2 coins. Returns `CoinSpend[]`.
 * @param {Uint8Array} spender_synthetic_key
 * @param {Coin[]} selected_coins
 * @param {number | null | undefined} cap
 * @param {bigint} fee
 * @returns {CoinSpend[]}
 */
function buildCoinConsolidation(spender_synthetic_key, selected_coins, cap, fee) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(spender_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.buildCoinConsolidation(retptr, ptr0, len0, addHeapObject(selected_coins), isLikeNone(cap) ? Number.MAX_SAFE_INTEGER : (cap) >>> 0, fee);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Build the (UNSIGNED) DIG-CAT coin spends that pay `amount` base units of $DIG to the DIG treasury
 * for a capsule (commit) — the canonical per-capsule store payment (see
 * [`chip35_dl_coin::build_dig_store_payment`]). `dig_cats` is the buyer's `Cat[]` of the DIG asset
 * (as `chip0002_getAssetCoins` returns them); `store_id` is the capsule's launcher id (= store id);
 * `amount` is the dynamic, USD-pegged per-capsule price in DIG base units (an INPUT — never
 * hardcoded). The caller concatenates the returned `CoinSpend[]` with the commit's
 * `updateStoreMetadata` spends and signs the whole bundle. MINT does NOT call this (mint is free of
 * $DIG). Returns `CoinSpend[]`.
 * @param {Uint8Array} buyer_synthetic_key
 * @param {Cat[]} dig_cats
 * @param {Uint8Array} store_id
 * @param {bigint} amount
 * @returns {CoinSpend[]}
 */
function buildDigStorePayment(buyer_synthetic_key, dig_cats, store_id, amount) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(buyer_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(store_id, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.buildDigStorePayment(retptr, ptr0, len0, addHeapObject(dig_cats), ptr1, len1, amount);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * A NON-owner unrolls + mints item `index` of a precommitted collection on demand (#40), funding the
 * 1-mojo launcher (+ `fee`) from `claimerCoins`. `descriptor` is the opaque JSON string
 * `buildLazyMintCommit` returned; `claimerPuzzleHash` is the 32-byte recipient. `merkleProof` is
 * accepted for an allowlist-gated claim but on-chain enforcement is DEFERRED. Returns
 * `{ coinSpends, launcherId, nftCoin }`.
 * @param {Uint8Array} claimer_synthetic_key
 * @param {Coin[]} claimer_coins
 * @param {Uint8Array} claimer_puzzle_hash
 * @param {string} descriptor
 * @param {number} index
 * @param {MerkleMembershipProof} merkle_proof
 * @param {bigint} fee
 * @returns {LazyMintClaimResult}
 */
function buildLazyMintClaim(claimer_synthetic_key, claimer_coins, claimer_puzzle_hash, descriptor, index, merkle_proof, fee) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(claimer_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(claimer_puzzle_hash, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(descriptor, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        wasm.buildLazyMintClaim(retptr, ptr0, len0, addHeapObject(claimer_coins), ptr1, len1, ptr2, len2, index, addHeapObject(merkle_proof), fee);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * The creator DID spends ONCE to precommit `items` into `collection`, attributed by lineage to `did`
 * (#40). `did` is the same `Did` shape `mintNftWithDid`/`bulkMint` accept (the DID's current on-chain
 * coin + identifiers). `policy` is `{ directMint: true }` (free) or
 * `{ paymentGated: { price, asset, payee } }` (payment ENFORCEMENT deferred — see the docs).
 * `allowlistRoot` is an optional 32-byte merkle root (on-chain enforcement deferred). Returns
 * `{ coinSpends, root, launcherIds, commitCoins, descriptor }` — `descriptor` is the opaque JSON
 * string a claimer passes back to `buildLazyMintClaim`.
 * @param {Uint8Array} minter_synthetic_key
 * @param {Did} did
 * @param {Collection} collection
 * @param {LazyMintItem[]} items
 * @param {LazyMintPolicy} policy
 * @param {Uint8Array | null} [allowlist_root]
 * @returns {LazyMintCommitResult}
 */
function buildLazyMintCommit(minter_synthetic_key, did, collection, items, policy, allowlist_root) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(minter_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(allowlist_root) ? 0 : passArray8ToWasm0(allowlist_root, wasm.__wbindgen_export);
        var len1 = WASM_VECTOR_LEN;
        wasm.buildLazyMintCommit(retptr, ptr0, len0, addHeapObject(did), addHeapObject(collection), addHeapObject(items), addHeapObject(policy), ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Build the coin spends for a buyer to pay the dapp owner `amount` mojos of **XCH** (#46 payment).
 * `selected_coins` is the buyer's XCH `Coin[]`; `nonce` is the 32-byte unlock nonce. Returns
 * `{ coinSpends, receipt }` where `receipt` is the `PaymentReceipt` the paywall later verifies.
 * @param {Uint8Array} buyer_synthetic_key
 * @param {Coin[]} selected_coins
 * @param {Uint8Array} owner_puzzle_hash
 * @param {bigint} amount
 * @param {Uint8Array} nonce
 * @param {bigint} fee
 * @returns {PaymentResponse}
 */
function buildPayment(buyer_synthetic_key, selected_coins, owner_puzzle_hash, amount, nonce, fee) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(buyer_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(owner_puzzle_hash, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(nonce, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.buildPayment(retptr, ptr0, len0, addHeapObject(selected_coins), ptr1, len1, amount, ptr2, len2, fee);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Bulk-mint every item in a parsed traits manifest into a collection, attributed to a DID (#34).
 * `did` is the DID coin + identifiers `{ launcherId, innerPuzzleHash, didCoin }` (e.g. from a prior
 * `createDid`, fetched on-chain). Returns `{ coinSpends, launcherIds }`.
 * @param {Uint8Array} minter_synthetic_key
 * @param {Did} did
 * @param {Collection} collection
 * @param {ManifestItem[]} items
 * @param {Uint8Array} recipient_puzzle_hash
 * @returns {BulkMintResult}
 */
function bulkMint(minter_synthetic_key, did, collection, items, recipient_puzzle_hash) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(minter_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(recipient_puzzle_hash, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.bulkMint(retptr, ptr0, len0, addHeapObject(did), addHeapObject(collection), addHeapObject(items), ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Bulk-mint N items into a collection FUNDED by a separate XCH coin (#221) — the multi-item (N>1)
 * path. Each item's intermediate launcher prints 1 mojo that must be donated from the SAME bundle
 * (Chia coin-value conservation is bundle-wide), and the DID's own value cannot fund more than one;
 * `fundingCoin` (spent via `fundingSyntheticKey`'s standard puzzle) contributes exactly `items.length`
 * mojos, returning any excess as change to the funding key's own address. Both keys sign the bundle.
 * `did` is the DID coin + identifiers `{ launcherId, innerPuzzleHash, didCoin }`; `fundingCoin` is a
 * `Coin`. Returns `{ coinSpends, launcherIds }`.
 * @param {Uint8Array} minter_synthetic_key
 * @param {Did} did
 * @param {Collection} collection
 * @param {ManifestItem[]} items
 * @param {Uint8Array} recipient_puzzle_hash
 * @param {Coin} funding_coin
 * @param {Uint8Array} funding_synthetic_key
 * @returns {BulkMintResult}
 */
function bulkMintFunded(minter_synthetic_key, did, collection, items, recipient_puzzle_hash, funding_coin, funding_synthetic_key) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(minter_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(recipient_puzzle_hash, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(funding_synthetic_key, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.bulkMintFunded(retptr, ptr0, len0, addHeapObject(did), addHeapObject(collection), addHeapObject(items), ptr1, len1, addHeapObject(funding_coin), ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Bulk-mint N items into a collection FUNDED by a COIN SET with a SINGLE network fee, with NO
 * on-chain DID (#1132) — the hub's non-DID bulk-mint path. Every item's intermediate launcher prints
 * 1 mojo that must be donated bundle-wide, so `selectedCoins` (all spent via `minterSyntheticKey`'s
 * standard puzzle) must total at least `items.length + fee` mojos: `items.length` funds the singleton
 * launchers, `fee` is reserved as the network fee, and any excess returns as change to the minter's
 * own address. No DID coin, no DID authorization spend, no DID attribution on the NFTs. Returns
 * `{ coinSpends, launcherIds }`.
 * @param {Uint8Array} minter_synthetic_key
 * @param {Collection} collection
 * @param {ManifestItem[]} items
 * @param {Uint8Array} recipient_puzzle_hash
 * @param {Coin[]} selected_coins
 * @param {bigint} fee
 * @returns {BulkMintResult}
 */
function bulkMintFundedNoDid(minter_synthetic_key, collection, items, recipient_puzzle_hash, selected_coins, fee) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(minter_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(recipient_puzzle_hash, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.bulkMintFundedNoDid(retptr, ptr0, len0, addHeapObject(collection), addHeapObject(items), ptr1, len1, addHeapObject(selected_coins), fee);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * A machine-readable descriptor of this module's surface, for runtime introspection by an agent or
 * consumer: `{ name, version, builders, errorCodes }`. `builders` is every exported builder/helper
 * (camelCase JS names); `errorCodes` is the catalogue of stable `UPPER_SNAKE` codes a caller may
 * branch on (thrown as `{ code, message }`, or carried as the `code` field of a `{ ok, code?, error? }`
 * result). One call yields the version + the full surface with zero out-of-band knowledge.
 * @returns {Capabilities}
 */
function capabilities() {
    const ret = wasm.capabilities();
    return takeObject(ret);
}

/**
 * Create a DID (creator identity) singleton. Returns
 * `{ coinSpends, launcherId, innerPuzzleHash, didCoin }`.
 * @param {Uint8Array} minter_synthetic_key
 * @param {Coin[]} selected_coins
 * @param {bigint} fee
 * @returns {CreateDidResult}
 */
function createDid(minter_synthetic_key, selected_coins, fee) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(minter_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.createDid(retptr, ptr0, len0, addHeapObject(selected_coins), fee);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Reconstruct a DataStore from the coin spend that created its current coin (the launcher
 * spend for an eve store). Lets the app MELT a store it did not mint in-session: fetch the
 * creating spend from a full node, rebuild the DataStore here, then meltStore() it.
 * `coin_spend` is the wasm CoinSpend shape (Uint8Array fields); `prev_delegated_puzzles` is
 * the parent's delegated-puzzle list ([] for an owner-only store).
 * @param {CoinSpend} coin_spend
 * @param {DelegatedPuzzle[]} prev_delegated_puzzles
 * @returns {DataStore}
 */
function dataStoreFromSpend(coin_spend, prev_delegated_puzzles) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.dataStoreFromSpend(retptr, addHeapObject(coin_spend), addHeapObject(prev_delegated_puzzles));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Decode canonical offer text into its spend bundle `{ coinSpends, aggregatedSignature }`.
 * @param {string} text
 * @returns {SpendBundle}
 */
function decodeOffer(text) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.decodeOffer(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * The cross-system $DIG-payment constants (mainnet): the DIG CAT `assetId` and the treasury INNER
 * `puzzleHash` every per-capsule payment settles to. Byte-identical across the ecosystem
 * (digstore-chain / hub). Lets an agent/consumer read them at runtime instead of hardcoding. Returns
 * `{ assetId: Uint8Array, treasuryInnerPuzzleHash: Uint8Array }`.
 * @returns {DigConstants}
 */
function digConstants() {
    const ret = wasm.digConstants();
    return takeObject(ret);
}

/**
 * The DIG-CAT payment coin a capsule (commit) pays to the treasury — what `buildDigStorePayment`
 * emits (see [`chip35_dl_coin::dig_treasury_payment_coin`]). `lead_dig_cat` is the lead DIG `Cat`
 * (its id is the new coin's parent); `amount` is the payment in DIG base units. Lets a caller pin /
 * verify the exact expected treasury coin without re-deriving the CAT wrap. Returns a `Coin`.
 * @param {Cat} lead_dig_cat
 * @param {bigint} amount
 * @returns {Coin}
 */
function digTreasuryPaymentCoin(lead_dig_cat, amount) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.digTreasuryPaymentCoin(retptr, addHeapObject(lead_dig_cat), amount);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Derive the digstore-scoped owner discovery hint for a 32-byte owner puzzle hash. The app
 * computes the SAME hint to enumerate the wallet's stores via coinset
 * get_coin_records_by_hint — it MUST match the hint mint_store emits. Returns 32 bytes.
 * @param {Uint8Array} owner_puzzle_hash
 * @returns {Uint8Array}
 */
function digstoreOwnerHint(owner_puzzle_hash) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(owner_puzzle_hash, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.digstoreOwnerHint(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export4(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Encode a spend bundle (`{coinSpends, aggregatedSignature}`) into canonical offer text.
 * @param {SpendBundle} spend_bundle
 * @returns {string}
 */
function encodeOffer(spend_bundle) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.encodeOffer(retptr, addHeapObject(spend_bundle));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        var ptr1 = r0;
        var len1 = r1;
        if (r3) {
            ptr1 = 0; len1 = 0;
            throw takeObject(r2);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export4(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Generate per-item CHIP-0007 metadata documents for a collection from a parsed traits manifest
 * (#34). `collection` is `Collection`; `items` is `ManifestItem[]`. Returns
 * `Chip0007Metadata[]` (the off-chain JSON docs; the caller hashes + writes them into each capsule).
 * @param {Collection} collection
 * @param {ManifestItem[]} items
 * @returns {Chip0007Metadata[]}
 */
function generateItemMetadata(collection, items) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.generateItemMetadata(retptr, addHeapObject(collection), addHeapObject(items));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Decode a hex-encoded spend bundle into its `CoinSpend[]` (see
 * [`chip35_dl_coin::hex_spend_bundle_to_coin_spends`]).
 * @param {string} hex
 * @returns {CoinSpend[]}
 */
function hexSpendBundleToCoinSpends(hex) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.hexSpendBundleToCoinSpends(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Initialise the module. Call once at startup. Installs a panic hook (when the
 * `console-panic-hook` feature is on) so Rust panics surface in the JS console.
 */
function init() {
    wasm.init();
}

/**
 * Issue a single-issuance (fixed-supply) CAT. Returns `{ coinSpends, assetId, catCoins }`.
 * @param {Uint8Array} issuer_synthetic_key
 * @param {Coin[]} selected_coins
 * @param {bigint} amount
 * @param {bigint} fee
 * @returns {IssueCatResult}
 */
function issueCat(issuer_synthetic_key, selected_coins, amount, fee) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(issuer_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.issueCat(retptr, ptr0, len0, addHeapObject(selected_coins), amount, fee);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Burn (melt) a store singleton (see [`chip35_dl_coin::melt_store`]). Owner-authorized only.
 * Returns the melt `CoinSpend[]`.
 * @param {DataStore} store
 * @param {Uint8Array} owner_public_key
 * @returns {CoinSpend[]}
 */
function meltStore(store, owner_public_key) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(owner_public_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.meltStore(retptr, addHeapObject(store), ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Mint a single NFT whose media lives in a DIG capsule (root-pinned URN + https gateway fallback URIs,
 * hashes computed from real bytes). `params` is `NftMintParams`. Returns
 * `{ coinSpends, launcherId, nftCoin }`.
 * @param {Uint8Array} minter_synthetic_key
 * @param {Coin[]} selected_coins
 * @param {NftMintParams} params
 * @param {bigint} fee
 * @returns {NftMintResult}
 */
function mintNft(minter_synthetic_key, selected_coins, params, fee) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(minter_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.mintNft(retptr, ptr0, len0, addHeapObject(selected_coins), addHeapObject(params), fee);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Mint a single NFT AUTHORIZED BY + attributed to a creator DID (#38). Unlike `mintNft` (which only
 * stamps the attribution), this composes the DID-acknowledgement spend into the bundle so the
 * on-chain owner assignment is genuinely authorized by the creator identity. `did` is the DID's
 * current on-chain coin + identifiers `{ didCoin, proof, launcherId, innerPuzzleHash }` (fetched
 * on-chain / from a prior `createDid`); `params` is `NftMintParams` (its `did` field is ignored —
 * the full `did` arg is the authority). `selected_coins` cover the `fee`. Returns
 * `{ coinSpends, launcherId, nftCoin }`.
 * @param {Uint8Array} minter_synthetic_key
 * @param {Coin[]} selected_coins
 * @param {Did} did
 * @param {NftMintParams} params
 * @param {bigint} fee
 * @returns {NftMintResult}
 */
function mintNftWithDid(minter_synthetic_key, selected_coins, did, params, fee) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(minter_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.mintNftWithDid(retptr, ptr0, len0, addHeapObject(selected_coins), addHeapObject(did), addHeapObject(params), fee);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Build the spend bundle that launches a new DataLayer store singleton (see
 * [`chip35_dl_coin::mint_store`]). `program_hash` is an optional 32-byte size-proof; the rest of
 * the JS values mirror the core builder. Returns a `SuccessResponse` (`coinSpends` + `newStore`).
 * @param {Uint8Array} minter_synthetic_key
 * @param {Coin[]} selected_coins
 * @param {Uint8Array} root_hash
 * @param {string | null | undefined} label
 * @param {string | null | undefined} description
 * @param {bigint | null | undefined} bytes
 * @param {Uint8Array | null | undefined} program_hash
 * @param {Uint8Array} owner_puzzle_hash
 * @param {DelegatedPuzzle[]} delegated_puzzles
 * @param {bigint} fee
 * @returns {SuccessResponse}
 */
function mintStore(minter_synthetic_key, selected_coins, root_hash, label, description, bytes, program_hash, owner_puzzle_hash, delegated_puzzles, fee) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(minter_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(root_hash, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(label) ? 0 : passStringToWasm0(label, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len2 = WASM_VECTOR_LEN;
        var ptr3 = isLikeNone(description) ? 0 : passStringToWasm0(description, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len3 = WASM_VECTOR_LEN;
        var ptr4 = isLikeNone(program_hash) ? 0 : passArray8ToWasm0(program_hash, wasm.__wbindgen_export);
        var len4 = WASM_VECTOR_LEN;
        const ptr5 = passArray8ToWasm0(owner_puzzle_hash, wasm.__wbindgen_export);
        const len5 = WASM_VECTOR_LEN;
        wasm.mintStore(retptr, ptr0, len0, addHeapObject(selected_coins), ptr1, len1, ptr2, len2, ptr3, len3, !isLikeNone(bytes), isLikeNone(bytes) ? BigInt(0) : bytes, ptr4, len4, ptr5, len5, addHeapObject(delegated_puzzles), fee);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Build the **Oracle** delegated puzzle: anyone may spend the store for the fixed `oracle_fee`
 * (mojos) paid to the 32-byte `oracle_puzzle_hash`. Returns a `DelegatedPuzzle`
 * (`{ oraclePaymentPuzzleHash, oracleFee }`).
 * @param {Uint8Array} oracle_puzzle_hash
 * @param {bigint} oracle_fee
 * @returns {DelegatedPuzzle}
 */
function oracleDelegatedPuzzle(oracle_puzzle_hash, oracle_fee) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(oracle_puzzle_hash, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.oracleDelegatedPuzzle(retptr, ptr0, len0, oracle_fee);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Exercise a store's oracle delegated puzzle (see [`chip35_dl_coin::oracle_spend`]). The spender
 * pays the oracle fee plus `fee` from `selected_coins`. Returns a `SuccessResponse`.
 * @param {Uint8Array} spender_synthetic_key
 * @param {Coin[]} selected_coins
 * @param {DataStore} store
 * @param {bigint} fee
 * @returns {SuccessResponse}
 */
function oracleSpend(spender_synthetic_key, selected_coins, store, fee) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(spender_synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.oracleSpend(retptr, ptr0, len0, addHeapObject(selected_coins), addHeapObject(store), fee);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * SHA-256-derive a 32-byte unlock nonce from arbitrary request bytes (`dappId||resource||user`).
 * A dapp issues one nonce per unlock request, embeds it in the payment, and verifies it later. The
 * dapp may instead use any random 32 bytes — this is a deterministic convenience. Returns 32 bytes.
 * @param {Uint8Array} request_bytes
 * @returns {Uint8Array}
 */
function paymentNonce(request_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(request_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.paymentNonce(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export4(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Prove an NFT held by `claimed_owner_puzzle_hash` is a member of the collection/creator identified
 * by `required_did` (#46 collection-gating). Returns `{ ok, proof?, error? }`.
 * @param {CoinSpend} parent_spend
 * @param {Uint8Array} claimed_owner_puzzle_hash
 * @param {Uint8Array} required_did
 * @returns {GatingResult}
 */
function proveCollectionMembership(parent_spend, claimed_owner_puzzle_hash, required_did) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(claimed_owner_puzzle_hash, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(required_did, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.proveCollectionMembership(retptr, addHeapObject(parent_spend), ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Prove an NFT (reconstructed from `parent_spend`, the coin spend that created its current coin) is
 * owned by `claimed_owner_puzzle_hash`, optionally gating on a specific NFT launcher id (#46 NFT-
 * gating). `parent_spend` is the wasm `CoinSpend` shape. Returns `{ ok, proof?, error? }` — on
 * success `proof` is the `NftOwnershipProof` (launcher id, owner, attributed DID, current coin id);
 * the caller still confirms `proof.nftCoinId` is unspent on-chain for liveness.
 * @param {CoinSpend} parent_spend
 * @param {Uint8Array} claimed_owner_puzzle_hash
 * @param {Uint8Array | null} [required_nft]
 * @returns {GatingResult}
 */
function proveNftOwnership(parent_spend, claimed_owner_puzzle_hash, required_nft) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(claimed_owner_puzzle_hash, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(required_nft) ? 0 : passArray8ToWasm0(required_nft, wasm.__wbindgen_export);
        var len1 = WASM_VECTOR_LEN;
        wasm.proveNftOwnership(retptr, addHeapObject(parent_spend), ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Read an NFT's ownership facts (owner, attributed DID, launcher id, current coin id) from
 * `parent_spend` WITHOUT applying a gate — for dapps that want to decide in their own code.
 * Returns `{ ok, proof?, error? }`.
 * @param {CoinSpend} parent_spend
 * @returns {GatingResult}
 */
function readNftOwnership(parent_spend) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.readNftOwnership(retptr, addHeapObject(parent_spend));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Select coins high-value-first (descending amount, tie-break coin id) to cover `target`, using at
 * most `cap` coins (default 50). Pure — no keys, no networking; works for XCH or any single CAT tail
 * (pass the CAT coins' underlying `Coin`s). `asset` (`{ xch:true }` or `{ assetId }`) is echoed into
 * the result so a caller knows which consolidation to run.
 *
 * Returns a discriminated `SelectCoinsResult`:
 * - `{ ok:true, coins, total, change, coinCount, asset }` — a selection within `cap` covers the
 *   target (`coins` are largest-first — `coins[0]` is the lead coin the builders expect);
 * - `{ ok:false, needsConsolidation:true, asset, availableCoinCount, availableTotal, required, cap }`
 *   — enough value EXISTS but reaching the target needs more than `cap` coins (consolidate, then
 *   re-select);
 * - `{ ok:false, needsConsolidation:false, asset, availableCoinCount, availableTotal, required, cap }`
 *   — the total value is genuinely below the target (distinct from needs-consolidation).
 * @param {Coin[]} coins
 * @param {bigint} target
 * @param {PaymentAsset} asset
 * @param {number | null} [cap]
 * @returns {SelectCoinsResult}
 */
function selectCoins(coins, target, asset, cap) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.selectCoins(retptr, addHeapObject(coins), target, addHeapObject(asset), isLikeNone(cap) ? Number.MAX_SAFE_INTEGER : (cap) >>> 0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * SHA-256 of arbitrary bytes → 32-byte hash (the one true primitive for `data_hash`/
 * `metadata_hash`/`license_hash`). Returns the raw 32 bytes (`Uint8Array`).
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
function sha256(bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.sha256(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export4(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Serialize a spend bundle (`{coinSpends, aggregatedSignature}`) to its hex wire encoding
 * (see [`chip35_dl_coin::spend_bundle_to_hex`]).
 * @param {SpendBundle} spend_bundle
 * @returns {string}
 */
function spendBundleToHex(spend_bundle) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.spendBundleToHex(retptr, addHeapObject(spend_bundle));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        var ptr1 = r0;
        var len1 = r1;
        if (r3) {
            ptr1 = 0; len1 = 0;
            throw takeObject(r2);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export4(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Update a store's metadata (see [`chip35_dl_coin::update_store_metadata`]). Exactly one of
 * `owner_public_key`, `admin_public_key`, `writer_public_key` must be provided — it selects the
 * authorizing role. Returns a `SuccessResponse`.
 * @param {DataStore} store
 * @param {Uint8Array} new_root_hash
 * @param {string | null} [new_label]
 * @param {string | null} [new_description]
 * @param {bigint | null} [new_bytes]
 * @param {Uint8Array | null} [new_program_hash]
 * @param {Uint8Array | null} [owner_public_key]
 * @param {Uint8Array | null} [admin_public_key]
 * @param {Uint8Array | null} [writer_public_key]
 * @returns {SuccessResponse}
 */
function updateStoreMetadata(store, new_root_hash, new_label, new_description, new_bytes, new_program_hash, owner_public_key, admin_public_key, writer_public_key) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(new_root_hash, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(new_label) ? 0 : passStringToWasm0(new_label, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(new_description) ? 0 : passStringToWasm0(new_description, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len2 = WASM_VECTOR_LEN;
        var ptr3 = isLikeNone(new_program_hash) ? 0 : passArray8ToWasm0(new_program_hash, wasm.__wbindgen_export);
        var len3 = WASM_VECTOR_LEN;
        var ptr4 = isLikeNone(owner_public_key) ? 0 : passArray8ToWasm0(owner_public_key, wasm.__wbindgen_export);
        var len4 = WASM_VECTOR_LEN;
        var ptr5 = isLikeNone(admin_public_key) ? 0 : passArray8ToWasm0(admin_public_key, wasm.__wbindgen_export);
        var len5 = WASM_VECTOR_LEN;
        var ptr6 = isLikeNone(writer_public_key) ? 0 : passArray8ToWasm0(writer_public_key, wasm.__wbindgen_export);
        var len6 = WASM_VECTOR_LEN;
        wasm.updateStoreMetadata(retptr, addHeapObject(store), ptr0, len0, ptr1, len1, ptr2, len2, !isLikeNone(new_bytes), isLikeNone(new_bytes) ? BigInt(0) : new_bytes, ptr3, len3, ptr4, len4, ptr5, len5, ptr6, len6);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Transfer ownership and/or replace the delegated-puzzle set (see
 * [`chip35_dl_coin::update_store_ownership`]). Omitting `new_owner_puzzle_hash` keeps the
 * current owner. Exactly one of `owner_public_key`/`admin_public_key` must be provided. Returns
 * a `SuccessResponse`.
 * @param {DataStore} store
 * @param {Uint8Array | null | undefined} new_owner_puzzle_hash
 * @param {DelegatedPuzzle[]} new_delegated_puzzles
 * @param {Uint8Array | null} [owner_public_key]
 * @param {Uint8Array | null} [admin_public_key]
 * @returns {SuccessResponse}
 */
function updateStoreOwnership(store, new_owner_puzzle_hash, new_delegated_puzzles, owner_public_key, admin_public_key) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        var ptr0 = isLikeNone(new_owner_puzzle_hash) ? 0 : passArray8ToWasm0(new_owner_puzzle_hash, wasm.__wbindgen_export);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(owner_public_key) ? 0 : passArray8ToWasm0(owner_public_key, wasm.__wbindgen_export);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(admin_public_key) ? 0 : passArray8ToWasm0(admin_public_key, wasm.__wbindgen_export);
        var len2 = WASM_VECTOR_LEN;
        wasm.updateStoreOwnership(retptr, addHeapObject(store), ptr0, len0, addHeapObject(new_delegated_puzzles), ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Validate a CHIP-0007 document's schema, and (when the actual bytes are provided) that each
 * on-chain hash matches `sha256(bytes)` — the URI↔hash agreement check (#36). `assets` is
 * `{ dataBytes?, dataHash?, metadataBytes?, metadataHash?, licenseBytes?, licenseHash? }` (all
 * `Uint8Array`). Returns `{ ok: bool, errors: string[] }`.
 * @param {Chip0007Metadata} metadata
 * @param {Chip0007Assets} assets
 * @returns {ValidationResult}
 */
function validateChip0007(metadata, assets) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.validateChip0007(retptr, addHeapObject(metadata), addHeapObject(assets));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Verify a merkle membership proof for an allowlist-gated lazy-mint claim WITHOUT building a spend
 * (#40). Recomputes the root from `leaf` + `proof` (the on-chain `merkle_utils.clib` shape: leaf
 * prefix `0x01`, node prefix `0x02`) and returns `true` iff it equals the 32-byte `root`. Lets a hub
 * / SDK validate a claimer's proof and gate the allowlist OFF-chain today. (`leaf` is the claimer's
 * 32-byte puzzle hash; `root` is the committed `allowlistRoot`; `proof` is a `MerkleMembershipProof`
 * `{ path, proof: Uint8Array[] }`.) Trustless ON-CHAIN enforcement remains deferred (see DESIGN.md #40).
 * @param {Uint8Array} leaf
 * @param {MerkleMembershipProof} proof
 * @param {Uint8Array} root
 * @returns {boolean}
 */
function verifyMerkleMembership(leaf, proof, root) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(leaf, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(root, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.verifyMerkleMembership(retptr, ptr0, len0, addHeapObject(proof), ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 !== 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Verify an observed payment unlocks a paywall (#46 pay-to-unlock): it must pay `owner_puzzle_hash`,
 * in `required_asset`, at least `min_amount`, and (when `require_nonce` is a 32-byte value) carry
 * that nonce. `observed` is an `ObservedPayment` the dapp filled in after reading the owner's coin;
 * `required_asset` is a `PaymentAsset` (`{xch:true}` or `{assetId}`). Returns `{ ok, error? }` —
 * `ok:true` grants access, otherwise `error` is the human-readable denial reason.
 * @param {ObservedPayment} observed
 * @param {Uint8Array} owner_puzzle_hash
 * @param {bigint} min_amount
 * @param {PaymentAsset} required_asset
 * @param {Uint8Array | null} [require_nonce]
 * @returns {PaywallResult}
 */
function verifyPaymentReceipt(observed, owner_puzzle_hash, min_amount, required_asset, require_nonce) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(owner_puzzle_hash, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(require_nonce) ? 0 : passArray8ToWasm0(require_nonce, wasm.__wbindgen_export);
        var len1 = WASM_VECTOR_LEN;
        wasm.verifyPaymentReceipt(retptr, addHeapObject(observed), ptr0, len0, min_amount, addHeapObject(required_asset), ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * The published package version (= the Cargo crate version = the npm package version). Lets a
 * consumer/agent feature-gate on exactly which build is loaded at runtime.
 * @returns {string}
 */
function version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.version(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export4(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Build the **Writer** delegated puzzle for a 48-byte synthetic public key — a revocable deploy
 * token (#17) or a hub Teams writer (#43). A writer may advance the root (deploy a new capsule)
 * WITHOUT the owner seed, but may NOT change delegation or transfer ownership. Add it to a store
 * to issue the token; replace the store's delegated set to revoke it. Returns a `DelegatedPuzzle`
 * (`{ writerInnerPuzzleHash }`).
 * @param {Uint8Array} synthetic_key
 * @returns {DelegatedPuzzle}
 */
function writerDelegatedPuzzleFromKey(synthetic_key) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(synthetic_key, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.writerDelegatedPuzzleFromKey(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
function __wbg_Error_ef53bc310eb298a0(arg0, arg1) {
    const ret = Error(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
}
function __wbg_Number_6b506e6536831eaa(arg0) {
    const ret = Number(getObject(arg0));
    return ret;
}
function __wbg_String_8564e559799eccda(arg0, arg1) {
    const ret = String(getObject(arg1));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
function __wbg___wbindgen_bigint_get_as_i64_38130e98eecd467d(arg0, arg1) {
    const v = getObject(arg1);
    const ret = typeof(v) === 'bigint' ? v : undefined;
    getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
}
function __wbg___wbindgen_boolean_get_1a45e2c38d4d41b9(arg0) {
    const v = getObject(arg0);
    const ret = typeof(v) === 'boolean' ? v : undefined;
    return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
}
function __wbg___wbindgen_debug_string_0accd80f45e5faa2(arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
function __wbg___wbindgen_in_70a403a56e771704(arg0, arg1) {
    const ret = getObject(arg0) in getObject(arg1);
    return ret;
}
function __wbg___wbindgen_is_bigint_6ffd6468a9bc44b9(arg0) {
    const ret = typeof(getObject(arg0)) === 'bigint';
    return ret;
}
function __wbg___wbindgen_is_function_754e9f305ff6029e(arg0) {
    const ret = typeof(getObject(arg0)) === 'function';
    return ret;
}
function __wbg___wbindgen_is_null_87c3bfe968c6a5ad(arg0) {
    const ret = getObject(arg0) === null;
    return ret;
}
function __wbg___wbindgen_is_object_56732c2bc353f41d(arg0) {
    const val = getObject(arg0);
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
}
function __wbg___wbindgen_is_undefined_67b456be8673d3d7(arg0) {
    const ret = getObject(arg0) === undefined;
    return ret;
}
function __wbg___wbindgen_jsval_eq_1068e624fa87f6ab(arg0, arg1) {
    const ret = getObject(arg0) === getObject(arg1);
    return ret;
}
function __wbg___wbindgen_jsval_loose_eq_2c56564c75129511(arg0, arg1) {
    const ret = getObject(arg0) == getObject(arg1);
    return ret;
}
function __wbg___wbindgen_number_get_9bb1761122181af2(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof(obj) === 'number' ? obj : undefined;
    getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
}
function __wbg___wbindgen_string_get_72bdf95d3ae505b1(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
function __wbg___wbindgen_throw_1506f2235d1bdba0(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
}
function __wbg_call_8a89609d89f6608a() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
}, arguments); }
function __wbg_done_60cf307fcc680536(arg0) {
    const ret = getObject(arg0).done;
    return ret;
}
function __wbg_error_a6fa202b58aa1cd3(arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_export4(deferred0_0, deferred0_1, 1);
    }
}
function __wbg_from_d300fe49deab18f5(arg0) {
    const ret = Array.from(getObject(arg0));
    return addHeapObject(ret);
}
function __wbg_get_1f8f054ddbaa7db2() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(getObject(arg0), getObject(arg1));
    return addHeapObject(ret);
}, arguments); }
function __wbg_get_unchecked_33f6e5c9e2f2d6b2(arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return addHeapObject(ret);
}
function __wbg_get_with_ref_key_6412cf3094599694(arg0, arg1) {
    const ret = getObject(arg0)[getObject(arg1)];
    return addHeapObject(ret);
}
function __wbg_instanceof_ArrayBuffer_8f49811467741499(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof ArrayBuffer;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
function __wbg_instanceof_Uint8Array_86f30649f63ef9c2(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof Uint8Array;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
}
function __wbg_isArray_67c2c9c4313f4448(arg0) {
    const ret = Array.isArray(getObject(arg0));
    return ret;
}
function __wbg_isSafeInteger_66acec27e09e99a7(arg0) {
    const ret = Number.isSafeInteger(getObject(arg0));
    return ret;
}
function __wbg_iterator_8732428d309e270e() {
    const ret = Symbol.iterator;
    return addHeapObject(ret);
}
function __wbg_length_4a591ecaa01354d9(arg0) {
    const ret = getObject(arg0).length;
    return ret;
}
function __wbg_length_66f1a4b2e9026940(arg0) {
    const ret = getObject(arg0).length;
    return ret;
}
function __wbg_new_227d7c05414eb861() {
    const ret = new Error();
    return addHeapObject(ret);
}
function __wbg_new_578aeef4b6b94378(arg0) {
    const ret = new Uint8Array(getObject(arg0));
    return addHeapObject(ret);
}
function __wbg_new_ce1ab61c1c2b300d() {
    const ret = new Object();
    return addHeapObject(ret);
}
function __wbg_new_d90091b82fdf5b91() {
    const ret = new Array();
    return addHeapObject(ret);
}
function __wbg_next_9e03acdf51c4960d(arg0) {
    const ret = getObject(arg0).next;
    return addHeapObject(ret);
}
function __wbg_next_eb8ca7351fa27906() { return handleError(function (arg0) {
    const ret = getObject(arg0).next();
    return addHeapObject(ret);
}, arguments); }
function __wbg_prototypesetcall_3249fc62a0fafa30(arg0, arg1, arg2) {
    Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), getObject(arg2));
}
function __wbg_set_6be42768c690e380(arg0, arg1, arg2) {
    getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
}
function __wbg_set_6e30c9374c26414c() { return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
    return ret;
}, arguments); }
function __wbg_set_dca99999bba88a9a(arg0, arg1, arg2) {
    getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
}
function __wbg_stack_3b0d974bbf31e44f(arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
function __wbg_value_f3625092ee4b37f4(arg0) {
    const ret = getObject(arg0).value;
    return addHeapObject(ret);
}
function __wbindgen_cast_0000000000000001(arg0) {
    // Cast intrinsic for `F64 -> Externref`.
    const ret = arg0;
    return addHeapObject(ret);
}
function __wbindgen_cast_0000000000000002(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
    const ret = getArrayU8FromWasm0(arg0, arg1);
    return addHeapObject(ret);
}
function __wbindgen_cast_0000000000000003(arg0, arg1) {
    // Cast intrinsic for `Ref(String) -> Externref`.
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
}
function __wbindgen_cast_0000000000000004(arg0) {
    // Cast intrinsic for `U64 -> Externref`.
    const ret = BigInt.asUintN(64, arg0);
    return addHeapObject(ret);
}
function __wbindgen_object_clone_ref(arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
}
function __wbindgen_object_drop_ref(arg0) {
    takeObject(arg0);
}
function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function dropObject(idx) {
    if (idx < 1028) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getObject(idx) { return heap[idx]; }

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_export3(addHeapObject(e));
    }
}

let heap = new Array(1024).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;


let wasm;
function __wbg_set_wasm(val) {
    wasm = val;
}

for (const [k, v] of Object.entries({ addFee, adminDelegatedPuzzleFromKey, buildCatConsolidation, buildCatPayment, buildChip0007Metadata, buildCoinConsolidation, buildDigStorePayment, buildLazyMintClaim, buildLazyMintCommit, buildPayment, bulkMint, bulkMintFunded, bulkMintFundedNoDid, capabilities, createDid, dataStoreFromSpend, decodeOffer, digConstants, digTreasuryPaymentCoin, digstoreOwnerHint, encodeOffer, generateItemMetadata, hexSpendBundleToCoinSpends, init, issueCat, meltStore, mintNft, mintNftWithDid, mintStore, oracleDelegatedPuzzle, oracleSpend, paymentNonce, proveCollectionMembership, proveNftOwnership, readNftOwnership, selectCoins, sha256, spendBundleToHex, updateStoreMetadata, updateStoreOwnership, validateChip0007, verifyMerkleMembership, verifyPaymentReceipt, version, writerDelegatedPuzzleFromKey, __wbg_Error_ef53bc310eb298a0, __wbg_Number_6b506e6536831eaa, __wbg_String_8564e559799eccda, __wbg___wbindgen_bigint_get_as_i64_38130e98eecd467d, __wbg___wbindgen_boolean_get_1a45e2c38d4d41b9, __wbg___wbindgen_debug_string_0accd80f45e5faa2, __wbg___wbindgen_in_70a403a56e771704, __wbg___wbindgen_is_bigint_6ffd6468a9bc44b9, __wbg___wbindgen_is_function_754e9f305ff6029e, __wbg___wbindgen_is_null_87c3bfe968c6a5ad, __wbg___wbindgen_is_object_56732c2bc353f41d, __wbg___wbindgen_is_undefined_67b456be8673d3d7, __wbg___wbindgen_jsval_eq_1068e624fa87f6ab, __wbg___wbindgen_jsval_loose_eq_2c56564c75129511, __wbg___wbindgen_number_get_9bb1761122181af2, __wbg___wbindgen_string_get_72bdf95d3ae505b1, __wbg___wbindgen_throw_1506f2235d1bdba0, __wbg_call_8a89609d89f6608a, __wbg_done_60cf307fcc680536, __wbg_error_a6fa202b58aa1cd3, __wbg_from_d300fe49deab18f5, __wbg_get_1f8f054ddbaa7db2, __wbg_get_unchecked_33f6e5c9e2f2d6b2, __wbg_get_with_ref_key_6412cf3094599694, __wbg_instanceof_ArrayBuffer_8f49811467741499, __wbg_instanceof_Uint8Array_86f30649f63ef9c2, __wbg_isArray_67c2c9c4313f4448, __wbg_isSafeInteger_66acec27e09e99a7, __wbg_iterator_8732428d309e270e, __wbg_length_4a591ecaa01354d9, __wbg_length_66f1a4b2e9026940, __wbg_new_227d7c05414eb861, __wbg_new_578aeef4b6b94378, __wbg_new_ce1ab61c1c2b300d, __wbg_new_d90091b82fdf5b91, __wbg_next_9e03acdf51c4960d, __wbg_next_eb8ca7351fa27906, __wbg_prototypesetcall_3249fc62a0fafa30, __wbg_set_6be42768c690e380, __wbg_set_6e30c9374c26414c, __wbg_set_dca99999bba88a9a, __wbg_stack_3b0d974bbf31e44f, __wbg_value_f3625092ee4b37f4, __wbindgen_cast_0000000000000001, __wbindgen_cast_0000000000000002, __wbindgen_cast_0000000000000003, __wbindgen_cast_0000000000000004, __wbindgen_object_clone_ref, __wbindgen_object_drop_ref, __wbg_set_wasm })) {
  exports[k] = v;
}
const fs = require("fs");
const path = require("path");
const wasmBytes = fs.readFileSync(path.join(__dirname, "chip35_dl_coin_wasm_bg.wasm"));
const wasmModule = new WebAssembly.Module(wasmBytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, {
  "./chip35_dl_coin_wasm_bg.js": exports,
});
__wbg_set_wasm(wasmInstance.exports);
init();
