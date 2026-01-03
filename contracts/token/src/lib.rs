//! Sangini Token Contract
//! 
//! A custom Soroban token implementation for fractional invoice tokens
//! with AUTHORIZATION_REQUIRED and CLAWBACK support.

#![no_std]

mod admin;
mod allowance;
mod balance;
mod contract;
mod metadata;
mod storage_types;

pub use contract::SanginiTokenContract;
pub use contract::SanginiTokenContractClient;
