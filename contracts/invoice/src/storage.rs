//! Storage module for the Sangini Invoice Contract
//! Handles all persistent data storage on-chain

use soroban_sdk::{contracttype, Address, Env, String, Vec};

use crate::types::{Dispute, Invoice, RateConfig, TokenHolding};

// ============================================================================
// STORAGE KEYS
// ============================================================================

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,                          // Address - platform admin
    UsdcToken,                      // Address - USDC token contract
    RateConfig,                     // RateConfig - interest rates
    InvoiceCounter,                 // u32 - for generating IDs
    Invoice(String),                // Invoice - by invoice_id
    Dispute(String),                // Dispute - by invoice_id
    TokenHolding(InvoiceKey),       // TokenHolding - by invoice_id + holder
    HolderList(String),             // Vec<Address> - all holders for an invoice
    KycStatus(Address),             // bool - KYC approval status
}

#[derive(Clone)]
#[contracttype]
pub struct InvoiceKey {
    pub invoice_id: String,
    pub holder: Address,
}

// ============================================================================
// ADMIN STORAGE
// ============================================================================

pub fn has_admin(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Admin)
}

pub fn get_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

// ============================================================================
// USDC TOKEN STORAGE
// ============================================================================

pub fn get_usdc_token(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::UsdcToken).unwrap()
}

pub fn set_usdc_token(env: &Env, token: &Address) {
    env.storage().instance().set(&DataKey::UsdcToken, token);
}

// ============================================================================
// RATE CONFIG STORAGE
// ============================================================================

pub fn get_rate_config(env: &Env) -> RateConfig {
    env.storage()
        .instance()
        .get(&DataKey::RateConfig)
        .unwrap_or_default()
}

pub fn set_rate_config(env: &Env, config: &RateConfig) {
    env.storage().instance().set(&DataKey::RateConfig, config);
}

// ============================================================================
// INVOICE COUNTER
// ============================================================================

pub fn get_invoice_counter(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::InvoiceCounter)
        .unwrap_or(0)
}

pub fn set_invoice_counter(env: &Env, counter: u32) {
    env.storage().instance().set(&DataKey::InvoiceCounter, &counter);
}

// ============================================================================
// INVOICE STORAGE
// ============================================================================

pub fn get_invoice(env: &Env, invoice_id: &String) -> Option<Invoice> {
    let key = DataKey::Invoice(invoice_id.clone());
    env.storage().persistent().get(&key)
}

pub fn set_invoice(env: &Env, invoice_id: &String, invoice: &Invoice) {
    let key = DataKey::Invoice(invoice_id.clone());
    env.storage().persistent().set(&key, invoice);
    
    // Extend TTL for persistent storage (about 1 year)
    env.storage().persistent().extend_ttl(&key, 100_000, 200_000);
}

// ============================================================================
// DISPUTE STORAGE
// ============================================================================

pub fn get_dispute(env: &Env, invoice_id: &String) -> Option<Dispute> {
    let key = DataKey::Dispute(invoice_id.clone());
    env.storage().persistent().get(&key)
}

pub fn set_dispute(env: &Env, invoice_id: &String, dispute: &Dispute) {
    let key = DataKey::Dispute(invoice_id.clone());
    env.storage().persistent().set(&key, dispute);
    env.storage().persistent().extend_ttl(&key, 100_000, 200_000);
}

// ============================================================================
// TOKEN HOLDING STORAGE
// ============================================================================

pub fn get_token_holding(
    env: &Env,
    invoice_id: &String,
    holder: &Address,
) -> Option<TokenHolding> {
    let key = DataKey::TokenHolding(InvoiceKey {
        invoice_id: invoice_id.clone(),
        holder: holder.clone(),
    });
    env.storage().persistent().get(&key)
}

pub fn set_token_holding(
    env: &Env,
    invoice_id: &String,
    holder: &Address,
    holding: &TokenHolding,
) {
    let key = DataKey::TokenHolding(InvoiceKey {
        invoice_id: invoice_id.clone(),
        holder: holder.clone(),
    });
    env.storage().persistent().set(&key, holding);
    env.storage().persistent().extend_ttl(&key, 100_000, 200_000);

    // Also add to holder list
    add_holder_to_list(env, invoice_id, holder);
}

pub fn remove_token_holding(env: &Env, invoice_id: &String, holder: &Address) {
    let key = DataKey::TokenHolding(InvoiceKey {
        invoice_id: invoice_id.clone(),
        holder: holder.clone(),
    });
    env.storage().persistent().remove(&key);
    
    // Remove from holder list
    remove_holder_from_list(env, invoice_id, holder);
}

// ============================================================================
// HOLDER LIST STORAGE
// ============================================================================

pub fn get_all_holders(env: &Env, invoice_id: &String) -> Vec<Address> {
    let key = DataKey::HolderList(invoice_id.clone());
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env))
}

fn add_holder_to_list(env: &Env, invoice_id: &String, holder: &Address) {
    let key = DataKey::HolderList(invoice_id.clone());
    let mut holders: Vec<Address> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env));

    // Check if already in list
    let mut found = false;
    for existing in holders.iter() {
        if existing == *holder {
            found = true;
            break;
        }
    }

    if !found {
        holders.push_back(holder.clone());
        env.storage().persistent().set(&key, &holders);
        env.storage().persistent().extend_ttl(&key, 100_000, 200_000);
    }
}

fn remove_holder_from_list(env: &Env, invoice_id: &String, holder: &Address) {
    let key = DataKey::HolderList(invoice_id.clone());
    let holders: Vec<Address> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env));

    let mut new_holders = Vec::new(env);
    for existing in holders.iter() {
        if existing != *holder {
            new_holders.push_back(existing);
        }
    }

    env.storage().persistent().set(&key, &new_holders);
}

pub fn clear_token_holdings(env: &Env, invoice_id: &String) {
    let holders = get_all_holders(env, invoice_id);
    
    for holder in holders.iter() {
        let key = DataKey::TokenHolding(InvoiceKey {
            invoice_id: invoice_id.clone(),
            holder: holder.clone(),
        });
        env.storage().persistent().remove(&key);
    }

    // Clear the holder list
    let list_key = DataKey::HolderList(invoice_id.clone());
    env.storage().persistent().remove(&list_key);
}

// ============================================================================
// KYC STORAGE
// ============================================================================

pub fn get_kyc_status(env: &Env, investor: &Address) -> bool {
    let key = DataKey::KycStatus(investor.clone());
    env.storage().persistent().get(&key).unwrap_or(false)
}

pub fn set_kyc_status(env: &Env, investor: &Address, approved: bool) {
    let key = DataKey::KycStatus(investor.clone());
    env.storage().persistent().set(&key, &approved);
    env.storage().persistent().extend_ttl(&key, 100_000, 200_000);
}
