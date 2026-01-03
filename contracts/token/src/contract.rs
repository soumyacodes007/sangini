//! Sangini Invoice Token Contract
//! 
//! Custom token with AUTHORIZATION_REQUIRED (KYC) and CLAWBACK support
//! for invoice financing marketplace.

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, String};

use crate::admin::{
    has_admin, is_authorized, read_admin, read_invoice_contract, set_authorized, write_admin,
    write_invoice_contract,
};
use crate::allowance::{read_allowance, spend_allowance, write_allowance};
use crate::balance::{read_balance, receive_balance, spend_balance};
use crate::metadata::{read_decimals, read_name, read_symbol, write_metadata};
use crate::storage_types::{INSTANCE_BUMP_AMOUNT, INSTANCE_LIFETIME_THRESHOLD};

fn check_nonnegative_amount(amount: i128) {
    if amount < 0 {
        panic!("negative amount is not allowed");
    }
}

/// Require authorization - AUTHORIZATION_REQUIRED flag implementation
fn require_authorized(env: &Env, addr: &Address) {
    // Admin and invoice contract are always authorized
    let admin = read_admin(env);
    if *addr == admin {
        return;
    }
    
    if let Some(invoice_contract) = read_invoice_contract(env) {
        if *addr == invoice_contract {
            return;
        }
    }

    // Others need explicit authorization
    if !is_authorized(env, addr) {
        panic!("address not authorized (KYC required)");
    }
}

#[contract]
pub struct SanginiTokenContract;

#[contractimpl]
impl SanginiTokenContract {
    /// Initialize the token
    pub fn initialize(
        env: Env,
        admin: Address,
        invoice_contract: Address,
        name: String,
        symbol: String,
        invoice_id: String,
    ) {
        if has_admin(&env) {
            panic!("already initialized");
        }
        write_admin(&env, &admin);
        write_invoice_contract(&env, &invoice_contract);
        write_metadata(&env, name, symbol, 7, invoice_id); // 7 decimals like Stellar
    }

    /// Mint tokens (only admin or invoice contract can call)
    pub fn mint(env: Env, to: Address, amount: i128) {
        check_nonnegative_amount(amount);

        let admin = read_admin(&env);
        admin.require_auth();

        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        receive_balance(&env, &to, amount);

        // Emit mint event
        env.events().publish(
            (symbol_short!("mint"), admin.clone()),
            (to, amount),
        );
    }

    /// Set authorization status (KYC) - AUTHORIZATION_REQUIRED implementation
    pub fn set_authorized(env: Env, addr: Address, authorized: bool) {
        let admin = read_admin(&env);
        admin.require_auth();

        set_authorized(&env, &addr, authorized);

        // Emit authorization event
        env.events().publish(
            (symbol_short!("auth"),),
            (addr, authorized),
        );
    }

    /// Check if an address is authorized
    pub fn authorized(env: Env, addr: Address) -> bool {
        is_authorized(&env, &addr)
    }

    /// Clawback tokens from an address (only admin can call)
    /// Used for dispute resolution
    pub fn clawback(env: Env, from: Address, amount: i128) {
        check_nonnegative_amount(amount);

        let admin = read_admin(&env);
        admin.require_auth();

        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        spend_balance(&env, &from, amount);

        // Emit clawback event
        env.events().publish(
            (symbol_short!("clawback"), admin.clone()),
            (from, amount),
        );
    }

    /// Burn tokens (for settlement)
    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();

        check_nonnegative_amount(amount);

        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        spend_balance(&env, &from, amount);

        // Emit burn event
        env.events().publish(
            (symbol_short!("burn"),),
            (from, amount),
        );
    }

    /// Burn tokens from another address (needs allowance)
    pub fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();

        check_nonnegative_amount(amount);

        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        spend_allowance(&env, &from, &spender, amount);
        spend_balance(&env, &from, amount);

        // Emit burn event
        env.events().publish(
            (symbol_short!("burn"),),
            (from, amount),
        );
    }

    /// Set allowance for spender
    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();

        check_nonnegative_amount(amount);

        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        write_allowance(&env, &from, &spender, amount, expiration_ledger);

        // Emit approve event
        env.events().publish(
            (symbol_short!("approve"), from.clone()),
            (spender, amount, expiration_ledger),
        );
    }

    /// Get allowance
    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        read_allowance(&env, &from, &spender).amount
    }

    /// Get balance (read-only, no auth check)
    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        read_balance(&env, &id)
    }

    /// Transfer tokens - REQUIRES AUTHORIZATION
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        check_nonnegative_amount(amount);

        // Both sender and receiver must be authorized
        require_authorized(&env, &from);
        require_authorized(&env, &to);

        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        spend_balance(&env, &from, amount);
        receive_balance(&env, &to, amount);

        // Emit transfer event
        env.events().publish(
            (symbol_short!("transfer"), from.clone()),
            (to, amount),
        );
    }

    /// Transfer from (with allowance) - REQUIRES AUTHORIZATION
    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();

        check_nonnegative_amount(amount);

        // Both sender and receiver must be authorized
        require_authorized(&env, &from);
        require_authorized(&env, &to);

        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        spend_allowance(&env, &from, &spender, amount);
        spend_balance(&env, &from, amount);
        receive_balance(&env, &to, amount);

        // Emit transfer event
        env.events().publish(
            (symbol_short!("transfer"), from.clone()),
            (to, amount),
        );
    }

    // ========================================================================
    // TOKEN INTERFACE (SEP-41)
    // ========================================================================

    pub fn decimals(env: Env) -> u32 {
        read_decimals(&env)
    }

    pub fn name(env: Env) -> String {
        read_name(&env)
    }

    pub fn symbol(env: Env) -> String {
        read_symbol(&env)
    }

    // ========================================================================
    // ADMIN FUNCTIONS
    // ========================================================================

    pub fn set_admin(env: Env, new_admin: Address) {
        let admin = read_admin(&env);
        admin.require_auth();

        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        write_admin(&env, &new_admin);

        // Emit admin change event
        env.events().publish(
            (symbol_short!("admin"),),
            (admin, new_admin),
        );
    }

    pub fn admin(env: Env) -> Address {
        read_admin(&env)
    }
}
