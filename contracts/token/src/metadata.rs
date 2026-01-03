//! Token metadata functions

use soroban_sdk::{Env, String};

use crate::storage_types::{DataKey, TokenMetadata};

pub fn read_name(env: &Env) -> String {
    let metadata: TokenMetadata = env.storage().instance().get(&DataKey::TokenMetadata).unwrap();
    metadata.name
}

pub fn read_symbol(env: &Env) -> String {
    let metadata: TokenMetadata = env.storage().instance().get(&DataKey::TokenMetadata).unwrap();
    metadata.symbol
}

pub fn read_decimals(env: &Env) -> u32 {
    let metadata: TokenMetadata = env.storage().instance().get(&DataKey::TokenMetadata).unwrap();
    metadata.decimals
}

pub fn write_metadata(env: &Env, name: String, symbol: String, decimals: u32, invoice_id: String) {
    let metadata = TokenMetadata {
        name,
        symbol,
        decimals,
        invoice_id,
    };
    env.storage().instance().set(&DataKey::TokenMetadata, &metadata);
}
