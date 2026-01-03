//! Error types for the Sangini Invoice Contract

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    /// Contract has already been initialized
    AlreadyInitialized = 1,
    
    /// Caller is not authorized for this action
    Unauthorized = 2,
    
    /// Invoice not found
    InvoiceNotFound = 3,
    
    /// Invalid invoice status for this operation
    InvalidStatus = 4,
    
    /// Invalid amount (must be positive)
    InvalidAmount = 5,
    
    /// Insufficient tokens for transfer
    InsufficientTokens = 6,
    
    /// Investor KYC not approved
    KYCRequired = 7,
    
    /// Invoice is currently disputed
    InvoiceDisputed = 8,
    
    /// Payment amount is insufficient
    InsufficientPayment = 9,
    
    /// Cannot revoke invoice in current state
    CannotRevoke = 10,
    
    /// Dispute not found
    DisputeNotFound = 11,
    
    /// Token holding not found
    HoldingNotFound = 12,
}
