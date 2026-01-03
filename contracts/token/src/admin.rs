//! Admin functions for the token contract

use soroban_sdk::{Address, Env};

use crate::storage_types::DataKey;

pub fn has_admin(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Admin)
}

pub fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

pub fn write_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn read_invoice_contract(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::InvoiceContract)
}

pub fn write_invoice_contract(env: &Env, contract: &Address) {
    env.storage().instance().set(&DataKey::InvoiceContract, contract);
}

/// Check if an address is authorized (KYC approved)
pub fn is_authorized(env: &Env, addr: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Authorized(addr.clone()))
        .unwrap_or(false)
}

/// Set authorization status for an address
pub fn set_authorized(env: &Env, addr: &Address, authorized: bool) {
    env.storage()
        .persistent()
        .set(&DataKey::Authorized(addr.clone()), &authorized);
}
