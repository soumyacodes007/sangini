//! Storage module for the Sangini Invoice Contract
//! Handles all persistent data storage on-chain

use soroban_sdk::{contracttype, Address, Env, String, Vec};

use crate::types::{Dispute, Invoice, RateConfig, TokenHolding, SellOrder};

// ============================================================================
// STORAGE KEYS
// ============================================================================

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    UsdcToken,
    RateConfig,
    InvoiceCounter,
    OrderCounter,
    Invoice(String),
    Dispute(String),
    TokenHolding(InvoiceKey),
    HolderList(String),
    KycStatus(Address),
    InsurancePool,
    SellOrder(String),
    OrdersByInvoice(String),
    AuthorizedRelayer(Address),
    InsuranceClaimed(InvoiceKey),
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
// PAYMENT TOKEN STORAGE
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
// COUNTERS
// ============================================================================

pub fn get_invoice_counter(env: &Env) -> u32 {
    env.storage().instance().get(&DataKey::InvoiceCounter).unwrap_or(0)
}

pub fn set_invoice_counter(env: &Env, counter: u32) {
    env.storage().instance().set(&DataKey::InvoiceCounter, &counter);
}

pub fn get_order_counter(env: &Env) -> u32 {
    env.storage().instance().get(&DataKey::OrderCounter).unwrap_or(0)
}

pub fn set_order_counter(env: &Env, counter: u32) {
    env.storage().instance().set(&DataKey::OrderCounter, &counter);
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

pub fn get_token_holding(env: &Env, invoice_id: &String, holder: &Address) -> Option<TokenHolding> {
    let key = DataKey::TokenHolding(InvoiceKey {
        invoice_id: invoice_id.clone(),
        holder: holder.clone(),
    });
    env.storage().persistent().get(&key)
}

pub fn set_token_holding(env: &Env, invoice_id: &String, holder: &Address, holding: &TokenHolding) {
    let key = DataKey::TokenHolding(InvoiceKey {
        invoice_id: invoice_id.clone(),
        holder: holder.clone(),
    });
    env.storage().persistent().set(&key, holding);
    env.storage().persistent().extend_ttl(&key, 100_000, 200_000);
    add_holder_to_list(env, invoice_id, holder);
}

pub fn remove_token_holding(env: &Env, invoice_id: &String, holder: &Address) {
    let key = DataKey::TokenHolding(InvoiceKey {
        invoice_id: invoice_id.clone(),
        holder: holder.clone(),
    });
    env.storage().persistent().remove(&key);
    remove_holder_from_list(env, invoice_id, holder);
}

// ============================================================================
// HOLDER LIST STORAGE
// ============================================================================

pub fn get_all_holders(env: &Env, invoice_id: &String) -> Vec<Address> {
    let key = DataKey::HolderList(invoice_id.clone());
    env.storage().persistent().get(&key).unwrap_or(Vec::new(env))
}

fn add_holder_to_list(env: &Env, invoice_id: &String, holder: &Address) {
    let key = DataKey::HolderList(invoice_id.clone());
    let mut holders: Vec<Address> = env.storage().persistent().get(&key).unwrap_or(Vec::new(env));
    
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
    let holders: Vec<Address> = env.storage().persistent().get(&key).unwrap_or(Vec::new(env));
    
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

// ============================================================================
// INSURANCE POOL STORAGE
// ============================================================================

pub fn get_insurance_pool(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::InsurancePool).unwrap_or(0)
}

pub fn add_to_insurance_pool(env: &Env, amount: i128) {
    let current = get_insurance_pool(env);
    env.storage().instance().set(&DataKey::InsurancePool, &(current + amount));
}

pub fn withdraw_from_insurance_pool(env: &Env, amount: i128) -> bool {
    let current = get_insurance_pool(env);
    if current < amount {
        return false;
    }
    env.storage().instance().set(&DataKey::InsurancePool, &(current - amount));
    true
}

pub fn is_insurance_claimed(env: &Env, invoice_id: &String, holder: &Address) -> bool {
    let key = DataKey::InsuranceClaimed(InvoiceKey {
        invoice_id: invoice_id.clone(),
        holder: holder.clone(),
    });
    env.storage().persistent().get(&key).unwrap_or(false)
}

pub fn set_insurance_claimed(env: &Env, invoice_id: &String, holder: &Address) {
    let key = DataKey::InsuranceClaimed(InvoiceKey {
        invoice_id: invoice_id.clone(),
        holder: holder.clone(),
    });
    env.storage().persistent().set(&key, &true);
    env.storage().persistent().extend_ttl(&key, 100_000, 200_000);
}

// ============================================================================
// SELL ORDER STORAGE
// ============================================================================

pub fn get_sell_order(env: &Env, order_id: &String) -> Option<SellOrder> {
    let key = DataKey::SellOrder(order_id.clone());
    env.storage().persistent().get(&key)
}

pub fn set_sell_order(env: &Env, order_id: &String, order: &SellOrder) {
    let key = DataKey::SellOrder(order_id.clone());
    env.storage().persistent().set(&key, order);
    env.storage().persistent().extend_ttl(&key, 100_000, 200_000);
}

pub fn get_orders_for_invoice(env: &Env, invoice_id: &String) -> Vec<String> {
    let key = DataKey::OrdersByInvoice(invoice_id.clone());
    env.storage().persistent().get(&key).unwrap_or(Vec::new(env))
}

pub fn add_order_to_invoice(env: &Env, invoice_id: &String, order_id: &String) {
    let key = DataKey::OrdersByInvoice(invoice_id.clone());
    let mut orders: Vec<String> = env.storage().persistent().get(&key).unwrap_or(Vec::new(env));
    orders.push_back(order_id.clone());
    env.storage().persistent().set(&key, &orders);
    env.storage().persistent().extend_ttl(&key, 100_000, 200_000);
}

// ============================================================================
// RELAYER STORAGE
// ============================================================================

pub fn is_authorized_relayer(env: &Env, addr: &Address) -> bool {
    let key = DataKey::AuthorizedRelayer(addr.clone());
    env.storage().persistent().get(&key).unwrap_or(false)
}

pub fn set_authorized_relayer(env: &Env, addr: &Address, authorized: bool) {
    let key = DataKey::AuthorizedRelayer(addr.clone());
    env.storage().persistent().set(&key, &authorized);
    env.storage().persistent().extend_ttl(&key, 100_000, 200_000);
}
