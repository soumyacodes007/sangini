//! Type definitions for the Sangini Invoice Contract

use soroban_sdk::{contracttype, Address, String};

/// Invoice lifecycle states
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum InvoiceStatus {
    Draft,      // Created by supplier, awaiting buyer approval
    Verified,   // Approved by buyer, tokens minted
    Funded,     // Investors have purchased tokens
    Overdue,    // Past due date, penalty applies
    Settled,    // Buyer paid, funds distributed
    Defaulted,  // Past grace period, no payment
    Disputed,   // Buyer raised dispute, frozen
    Revoked,    // Stale invoice revoked by supplier
}

/// Dispute resolution outcomes
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum DisputeResolution {
    Pending,    // Awaiting admin decision
    Valid,      // Dispute upheld, clawback executed
    Invalid,    // Dispute rejected, invoice unfrozen
}

/// Main invoice data structure
#[derive(Clone, Debug)]
#[contracttype]
pub struct Invoice {
    pub id: String,
    
    // Parties
    pub supplier: Address,       // The Originator (MSME)
    pub buyer: Address,          // The Obligor (Large Corporate)
    
    // Financial details
    pub amount: i128,            // Invoice amount in base units (7 decimals)
    pub currency: String,        // Currency code (e.g., "INR", "USD")
    
    // Dates (Unix timestamps)
    pub created_at: u64,
    pub due_date: u64,
    pub verified_at: u64,        // 0 if not verified
    pub settled_at: u64,         // 0 if not settled
    
    // Status
    pub status: InvoiceStatus,
    
    // Token details (populated after verification)
    pub token_symbol: String,    // e.g., "SNG-INV-1001"
    pub total_tokens: i128,      // 1:1 with amount
    
    // Metadata
    pub description: String,
    pub purchase_order: String,
    
    // Settlement tracking
    pub repayment_received: i128,
    
    // Buyer signature timestamp (0 if not signed)
    pub buyer_signed_at: u64,
}

/// Dispute data
#[derive(Clone, Debug)]
#[contracttype]
pub struct Dispute {
    pub invoice_id: String,
    pub raised_by: Address,      // Buyer address
    pub reason: String,
    pub raised_at: u64,          // Unix timestamp
    pub resolution: DisputeResolution,
    pub resolved_at: u64,        // 0 if not resolved
}

/// Token holding for an address
#[derive(Clone, Debug)]
#[contracttype]
pub struct TokenHolding {
    pub invoice_id: String,
    pub holder: Address,
    pub amount: i128,            // Number of tokens held
    pub acquired_at: u64,        // Unix timestamp
    pub acquired_price: i128,    // Price paid (for discount tracking)
}

/// Rate configuration for interest and penalties
#[derive(Clone, Debug)]
#[contracttype]
pub struct RateConfig {
    pub base_interest_rate: u32,    // Basis points (1000 = 10%)
    pub penalty_rate: u32,          // Basis points (2400 = 24%)
    pub grace_period_days: u32,     // Days after due date before defaulted
}

impl Default for RateConfig {
    fn default() -> Self {
        RateConfig {
            base_interest_rate: 1000,    // 10%
            penalty_rate: 2400,          // 24%
            grace_period_days: 30,
        }
    }
}

/// Investment record
#[derive(Clone, Debug)]
#[contracttype]
pub struct Investment {
    pub id: String,
    pub invoice_id: String,
    pub investor: Address,
    pub token_amount: i128,
    pub invested_amount: i128,   // USDC paid
    pub discount_rate: u32,      // Basis points
    pub invested_at: u64,
    pub settled_amount: i128,    // 0 if not settled
    pub settled_at: u64,         // 0 if not settled
}

/// Token transfer record
#[derive(Clone, Debug)]
#[contracttype]
pub struct TokenTransfer {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub transferred_at: u64,
}
