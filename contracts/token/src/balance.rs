//! Balance management for the token contract

use soroban_sdk::{Address, Env};

use crate::storage_types::{DataKey, BALANCE_BUMP_AMOUNT, BALANCE_LIFETIME_THRESHOLD};

pub fn read_balance(env: &Env, addr: &Address) -> i128 {
    let key = DataKey::Balance(addr.clone());
    if let Some(balance) = env.storage().persistent().get::<DataKey, i128>(&key) {
        env.storage()
            .persistent()
            .extend_ttl(&key, BALANCE_LIFETIME_THRESHOLD, BALANCE_BUMP_AMOUNT);
        balance
    } else {
        0
    }
}

pub fn write_balance(env: &Env, addr: &Address, amount: i128) {
    let key = DataKey::Balance(addr.clone());
    env.storage().persistent().set(&key, &amount);
    env.storage()
        .persistent()
        .extend_ttl(&key, BALANCE_LIFETIME_THRESHOLD, BALANCE_BUMP_AMOUNT);
}

pub fn receive_balance(env: &Env, addr: &Address, amount: i128) {
    let balance = read_balance(env, addr);
    write_balance(env, addr, balance + amount);
}

pub fn spend_balance(env: &Env, addr: &Address, amount: i128) {
    let balance = read_balance(env, addr);
    if balance < amount {
        panic!("insufficient balance");
    }
    write_balance(env, addr, balance - amount);
}
