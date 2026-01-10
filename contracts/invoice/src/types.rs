//! Type definitions for the Sangini Invoice Contract

use soroban_sdk::{contracttype, Address, String};

/// Invoice lifecycle states
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum InvoiceStatus {
    Draft,      // Created by supplier, awaiting buyer approval
    Verified,   // Approved by buyer, tokens minted
    Funding,    // Auction is active, accepting investments
    Funded,     // All tokens sold, awaiting settlement
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

/// Order status for secondary market
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum OrderStatus {
    Open,
    PartiallyFilled,
    Filled,
    Cancelled,
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
    pub currency: String,        // Currency code (e.g., "XLM", "USDC")
    
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
    pub tokens_sold: i128,       // How many tokens have been purchased
    pub tokens_remaining: i128,  // total_tokens - tokens_sold
    
    // Metadata
    pub description: String,
    pub purchase_order: String,
    pub document_hash: String,   // IPFS CID for invoice document
    
    // Settlement tracking
    pub repayment_received: i128,
    
    // Buyer signature timestamp (0 if not signed)
    pub buyer_signed_at: u64,
    
    // Dutch Auction fields
    pub auction_start: u64,      // Unix timestamp when auction starts
    pub auction_end: u64,        // Unix timestamp when auction ends
    pub start_price: i128,       // Starting price (face value, 0% discount)
    pub min_price: i128,         // Minimum price supplier accepts (max discount)
    pub price_drop_rate: u32,    // Basis points drop per hour (e.g., 50 = 0.5%/hour)
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
    pub base_interest_rate: u32,       // Basis points (1000 = 10%)
    pub penalty_rate: u32,             // Basis points (2400 = 24%)
    pub grace_period_days: u32,        // Days after due date before defaulted
    pub default_auction_duration: u64, // Default auction duration in seconds (7 days)
    pub default_price_drop_rate: u32,  // Default basis points drop per hour
    pub default_max_discount: u32,     // Default max discount in basis points
    pub insurance_cut_bps: u32,        // Basis points taken for insurance (500 = 5%)
}

impl Default for RateConfig {
    fn default() -> Self {
        RateConfig {
            base_interest_rate: 1000,           // 10%
            penalty_rate: 2400,                 // 24%
            grace_period_days: 30,
            default_auction_duration: 604800,   // 7 days in seconds
            default_price_drop_rate: 50,        // 0.5% per hour
            default_max_discount: 1500,         // 15% max discount
            insurance_cut_bps: 500,             // 5% insurance cut
        }
    }
}

/// Sell order for secondary market
#[derive(Clone, Debug)]
#[contracttype]
pub struct SellOrder {
    pub id: String,
    pub invoice_id: String,
    pub seller: Address,
    pub token_amount: i128,
    pub price_per_token: i128,   // Price per token in payment currency
    pub tokens_remaining: i128,  // For partial fills
    pub created_at: u64,
    pub status: OrderStatus,
}

/// Investment record
#[derive(Clone, Debug)]
#[contracttype]
pub struct Investment {
    pub id: String,
    pub invoice_id: String,
    pub investor: Address,
    pub token_amount: i128,
    pub invested_amount: i128,   // Payment amount
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
