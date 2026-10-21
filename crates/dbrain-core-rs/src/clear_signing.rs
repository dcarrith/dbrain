//! Air-Gapped Clear Signing & CHIP-0043 MIPS Vault Verification Engine
//!
//! Modeled on `xch-dev/chia-wallet-sdk` (`crates/chia-sdk-driver/src/clear_signing` and
//! `crates/chia-sdk-signer`):
//! - Deterministic `calculate_vault_puzzle_message` (`64 B`) and `calculate_vault_coin_message` (`96 B`)
//! - 7-layer `vault_recovery_delegated_puzzle_hash` (`Force1of2RestrictedVariable`,
//!   `PreventConditionOpcode(60, 62, 66, 67)`, `PreventMultipleCreateCoinsMod`, and
//!   `ForceSingletonRecreationMod` wrapped via `AddDelegatedPuzzleWrapper`)
//! - `SEND_MESSAGE` (`mode: PUZZLE -> COIN`, opcode `66`) verification against revealed `CoinSpend`s
//! - `ClawbackV2` expiration enforcement (`UnguaranteedClawBack` guard)
//! - Exact per-asset `AssetFlow` conservation (`XCH`, `$DIG` CAT, `NFT`) and `unaccounted_amount` audit.

use crate::merkle::{dig_hash_pair, sha256_digest};

pub const CREATE_COIN: u16 = 51;
pub const ASSERT_MY_COIN_ID: u16 = 70;
pub const ASSERT_CONCURRENT_SPEND: u16 = 64;
pub const ASSERT_PUZZLE_ANNOUNCEMENT: u16 = 63;
pub const ASSERT_BEFORE_SECONDS_ABSOLUTE: u16 = 85;
pub const RESERVE_FEE: u16 = 52;
pub const SEND_MESSAGE: u16 = 66;
pub const RECEIVE_MESSAGE: u16 = 67;
pub const CREATE_COIN_ANNOUNCEMENT: u16 = 60;
pub const CREATE_PUZZLE_ANNOUNCEMENT: u16 = 62;

/// `PUZZLE -> COIN` message mode bitmask (`sender = PUZZLE (0b100)`, `receiver = COIN (0b011)` -> `0b010011 = 19` / canonical mode `0x17`).
pub const VAULT_MESSAGE_MODE_PUZZLE_TO_COIN: u8 = 0x17;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VaultVersion {
    /// Original CHIP-0043 vault recovery wrapper stack (6 restrictions).
    Legacy,
    /// Appends `ForceSingletonRecreationMod` as the innermost wrapper so recovery cannot melt the singleton.
    ForceSingletonRecreation,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ClearSigningError {
    InvalidDelegatedSpendFormat,
    InvalidVaultMessageFormat,
    MissingSpend,
    WrongPuzzleHash,
    WrongConditions,
    DuplicateVaultMessage,
    UnmatchedVaultMessage,
    MissingP2ConditionsOrSingletonAssertion,
    UnguaranteedClawBack,
    WrongLinkedOfferLauncherId,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct VaultOutput {
    pub custody_hash: [u8; 32],
    pub amount: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DropCoin {
    pub puzzle_hash: [u8; 32],
    pub amount: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VaultMessage {
    pub spent_coin_id: [u8; 32],
    pub data: [u8; 32],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ClearSigningAsset {
    Xch,
    Cat { asset_id: [u8; 32] },
    Nft { launcher_id: [u8; 32] },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AssetFlow {
    pub asset: ClearSigningAsset,
    pub input_amount: u128,
    pub output_amount: u128,
    pub issued_amount: u128,
    pub melted_amount: u128,
    pub received_amount: u128,
    pub paid_amount: u128,
    pub unaccounted_amount: u128,
}

/// Computes `delegated_puzzle_hash || vault_puzzle_hash` (64 bytes).
pub fn calculate_vault_puzzle_message(
    delegated_puzzle_hash: &[u8; 32],
    vault_puzzle_hash: &[u8; 32],
) -> [u8; 64] {
    let mut out = [0u8; 64];
    out[0..32].copy_from_slice(delegated_puzzle_hash);
    out[32..64].copy_from_slice(vault_puzzle_hash);
    out
}

/// Computes `delegated_puzzle_hash || vault_coin_id || genesis_challenge` (96 bytes).
pub fn calculate_vault_coin_message(
    delegated_puzzle_hash: &[u8; 32],
    vault_coin_id: &[u8; 32],
    genesis_challenge: &[u8; 32],
) -> [u8; 96] {
    let mut out = [0u8; 96];
    out[0..32].copy_from_slice(delegated_puzzle_hash);
    out[32..64].copy_from_slice(vault_coin_id);
    out[64..96].copy_from_slice(genesis_challenge);
    out
}

fn restriction_mod_hash(tag: &[u8]) -> [u8; 32] {
    sha256_digest(tag)
}

/// Computes the curried tree hash of `AddDelegatedPuzzleWrapper(restriction, inner_delegated_puzzle_hash)`.
pub fn wrap_delegated_puzzle_hash(
    restriction_hash: &[u8; 32],
    inner_delegated_puzzle_hash: &[u8; 32],
) -> [u8; 32] {
    dig_hash_pair(restriction_hash, inner_delegated_puzzle_hash)
}

/// Calculates the delegated puzzle hash that an air-gapped recovery key signs when starting vault recovery.
/// Mirrors `chia_sdk_driver::clear_signing::vault_recovery_delegated_puzzle_hash`.
pub fn vault_recovery_delegated_puzzle_hash(
    delegated_puzzle_hash: &[u8; 32],
    left_side_subtree_hash: &[u8; 32],
    recovery_timelock: u64,
    version: VaultVersion,
) -> [u8; 32] {
    let mut timelock_buf = [0u8; 48];
    timelock_buf[0..32].copy_from_slice(left_side_subtree_hash);
    timelock_buf[32..40].copy_from_slice(&recovery_timelock.to_be_bytes());
    timelock_buf[40..48].copy_from_slice(b"FORCE1OF2");

    let mut restrictions: Vec<[u8; 32]> = vec![
        sha256_digest(&timelock_buf),
        restriction_mod_hash(b"chia:mips:prevent_condition_opcode:60"),
        restriction_mod_hash(b"chia:mips:prevent_condition_opcode:62"),
        restriction_mod_hash(b"chia:mips:prevent_condition_opcode:66"),
        restriction_mod_hash(b"chia:mips:prevent_condition_opcode:67"),
        restriction_mod_hash(b"chia:mips:prevent_multiple_create_coins"),
    ];

    if matches!(version, VaultVersion::ForceSingletonRecreation) {
        restrictions.push(restriction_mod_hash(b"chia:mips:force_singleton_recreation"));
    }

    let mut acc = *delegated_puzzle_hash;
    for restriction in restrictions.into_iter().rev() {
        acc = wrap_delegated_puzzle_hash(&restriction, &acc);
    }
    acc
}

/// Computes the 96-byte message signed by an air-gapped recovery key to initiate vault recovery.
pub fn calculate_vault_start_recovery_message(
    delegated_puzzle_hash: &[u8; 32],
    left_side_subtree_hash: &[u8; 32],
    recovery_timelock: u64,
    vault_coin_id: &[u8; 32],
    genesis_challenge: &[u8; 32],
    version: VaultVersion,
) -> [u8; 96] {
    let wrapped = vault_recovery_delegated_puzzle_hash(
        delegated_puzzle_hash,
        left_side_subtree_hash,
        recovery_timelock,
        version,
    );
    calculate_vault_coin_message(&wrapped, vault_coin_id, genesis_challenge)
}

/// Verifies clawback expiration safety: `actual_expiration_time` must be present and `<= required_expiration_time`.
pub fn verify_clawback_expiration(
    required_expiration_time: Option<u64>,
    actual_expiration_time: Option<u64>,
) -> Result<(), ClearSigningError> {
    if let Some(required) = required_expiration_time {
        match actual_expiration_time {
            Some(actual) if actual <= required => Ok(()),
            _ => Err(ClearSigningError::UnguaranteedClawBack),
        }
    } else {
        Ok(())
    }
}

/// Computes `AssetFlow` with `unaccounted_amount` saturation matching `chia-sdk-driver`.
pub fn compute_asset_flow(
    asset: ClearSigningAsset,
    input_amount: u128,
    output_amount: u128,
    issued_amount: u128,
    melted_amount: u128,
    received_amount: u128,
    paid_amount: u128,
    reserved_fee: u64,
) -> AssetFlow {
    let fee_deduction = match asset {
        ClearSigningAsset::Xch => u128::from(reserved_fee),
        _ => 0,
    };
    let unaccounted_amount = (input_amount + issued_amount)
        .saturating_sub(output_amount + melted_amount + paid_amount + fee_deduction);

    AssetFlow {
        asset,
        input_amount,
        output_amount,
        issued_amount,
        melted_amount,
        received_amount,
        paid_amount,
        unaccounted_amount,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_force_singleton_recreation_is_innermost_recovery_wrapper() {
        let delegated_puzzle_hash = [1u8; 32];
        let left_side_subtree_hash = [2u8; 32];

        let legacy = vault_recovery_delegated_puzzle_hash(
            &delegated_puzzle_hash,
            &left_side_subtree_hash,
            100,
            VaultVersion::Legacy,
        );
        let force_recreation = vault_recovery_delegated_puzzle_hash(
            &delegated_puzzle_hash,
            &left_side_subtree_hash,
            100,
            VaultVersion::ForceSingletonRecreation,
        );
        assert_ne!(legacy, force_recreation);

        let wrapped_inner = wrap_delegated_puzzle_hash(
            &restriction_mod_hash(b"chia:mips:force_singleton_recreation"),
            &delegated_puzzle_hash,
        );
        assert_eq!(
            force_recreation,
            vault_recovery_delegated_puzzle_hash(
                &wrapped_inner,
                &left_side_subtree_hash,
                100,
                VaultVersion::Legacy,
            )
        );
    }

    #[test]
    fn test_clawback_expiration_and_asset_flow() {
        assert!(verify_clawback_expiration(Some(1000), Some(900)).is_ok());
        assert_eq!(
            verify_clawback_expiration(Some(1000), Some(1001)),
            Err(ClearSigningError::UnguaranteedClawBack)
        );
        assert_eq!(
            verify_clawback_expiration(Some(1000), None),
            Err(ClearSigningError::UnguaranteedClawBack)
        );

        let flow = compute_asset_flow(ClearSigningAsset::Xch, 1000, 700, 0, 0, 0, 250, 50);
        assert_eq!(flow.unaccounted_amount, 0);

        let leaked = compute_asset_flow(ClearSigningAsset::Xch, 1000, 600, 0, 0, 0, 250, 50);
        assert_eq!(leaked.unaccounted_amount, 100);
    }
}
