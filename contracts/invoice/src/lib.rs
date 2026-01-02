//! Sangini Invoice Contract
//! 
//! This contract manages the complete lifecycle of tokenized invoices
//! for the MSME Invoice Financing Marketplace.

#![no_std]

mod types;
mod storage;
mod events;
mod errors;

use soroban_sdk::{
    contract, contractimpl, Address, Env, String, Symbol, Vec,
    token::{self, TokenClient},
};

use types::{Invoice, InvoiceStatus, Dispute, DisputeResolution, TokenHolding};
use storage::{
    get_invoice, set_invoice, get_admin, set_admin, 
    get_token_holdings, set_token_holding, remove_token_holding,
    get_kyc_status, set_kyc_status, get_rate_config, set_rate_config,
    InvoiceKey, DataKey,
};
use errors::ContractError;
use events::InvoiceEvents;

pub use types::RateConfig;

#[contract]
pub struct SanginiInvoiceContract;

#[contractimpl]
impl SanginiInvoiceContract {
    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /// Initialize the contract with admin and token addresses
    pub fn initialize(
        env: Env,
        admin: Address,
        usdc_token: Address,
        base_interest_rate: u32,    // In basis points (1000 = 10%)
        penalty_rate: u32,          // In basis points (2400 = 24%)
        grace_period_days: u32,
    ) -> Result<(), ContractError> {
        // Ensure not already initialized
        if storage::has_admin(&env) {
            return Err(ContractError::AlreadyInitialized);
        }

        set_admin(&env, &admin);
        storage::set_usdc_token(&env, &usdc_token);
        
        let rate_config = RateConfig {
            base_interest_rate,
            penalty_rate,
            grace_period_days,
        };
        set_rate_config(&env, &rate_config);

        Ok(())
    }

    // ========================================================================
    // PHASE 1: ORIGINATION & VERIFICATION
    // ========================================================================

    /// Create a draft invoice (only supplier can call)
    /// Returns the invoice ID
    pub fn mint_draft(
        env: Env,
        supplier: Address,
        buyer: Address,
        amount: i128,
        currency: String,
        due_date: u64,              // Unix timestamp
        description: String,
        purchase_order: String,
    ) -> Result<String, ContractError> {
        // Require supplier authorization
        supplier.require_auth();

        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        // Generate invoice ID
        let invoice_id = Self::generate_invoice_id(&env);

        let invoice = Invoice {
            id: invoice_id.clone(),
            supplier: supplier.clone(),
            buyer: buyer.clone(),
            amount,
            currency,
            created_at: env.ledger().timestamp(),
            due_date,
            verified_at: 0,
            settled_at: 0,
            status: InvoiceStatus::Draft,
            token_symbol: String::from_str(&env, ""),
            total_tokens: 0,
            description,
            purchase_order,
            repayment_received: 0,
            buyer_signed_at: 0,
        };

        set_invoice(&env, &invoice_id, &invoice);

        // Emit event
        InvoiceEvents::invoice_created(&env, &invoice_id, &supplier, &buyer, amount);

        Ok(invoice_id)
    }

    /// Approve invoice (only buyer can call) - The Digital Handshake
    /// This cryptographically validates the debt via buyer's signature
    pub fn approve_invoice(
        env: Env,
        invoice_id: String,
        buyer: Address,
    ) -> Result<(), ContractError> {
        // Require buyer authorization - THIS IS THE CRYPTOGRAPHIC PROOF
        buyer.require_auth();

        let mut invoice = get_invoice(&env, &invoice_id)
            .ok_or(ContractError::InvoiceNotFound)?;

        // Verify the caller is the designated buyer
        if invoice.buyer != buyer {
            return Err(ContractError::Unauthorized);
        }

        // Can only approve drafts
        if invoice.status != InvoiceStatus::Draft {
            return Err(ContractError::InvalidStatus);
        }

        // Update invoice status
        invoice.status = InvoiceStatus::Verified;
        invoice.verified_at = env.ledger().timestamp();
        invoice.buyer_signed_at = env.ledger().timestamp();
        
        // Generate token symbol
        invoice.token_symbol = Self::generate_token_symbol(&env, &invoice_id);
        
        // Mint tokens 1:1 with invoice amount (using 7 decimals like Stellar)
        invoice.total_tokens = invoice.amount;

        set_invoice(&env, &invoice_id, &invoice);

        // Create initial token holding for supplier (100% of tokens)
        let holding = TokenHolding {
            invoice_id: invoice_id.clone(),
            holder: invoice.supplier.clone(),
            amount: invoice.total_tokens,
            acquired_at: env.ledger().timestamp(),
            acquired_price: invoice.amount, // Face value
        };
        set_token_holding(&env, &invoice_id, &invoice.supplier, &holding);

        // Emit event
        InvoiceEvents::invoice_verified(&env, &invoice_id, &buyer, invoice.total_tokens);

        Ok(())
    }

    // ========================================================================
    // PHASE 2: DEEP-TIER FINANCING
    // ========================================================================

    /// Transfer invoice tokens to another address (sub-vendor payment)
    pub fn transfer_tokens(
        env: Env,
        invoice_id: String,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), ContractError> {
        from.require_auth();

        // Check KYC for recipient if they are an investor
        // Sub-vendors inherit supplier status
        
        let invoice = get_invoice(&env, &invoice_id)
            .ok_or(ContractError::InvoiceNotFound)?;

        // Can only transfer verified or funded invoices
        if invoice.status != InvoiceStatus::Verified && invoice.status != InvoiceStatus::Funded {
            return Err(ContractError::InvalidStatus);
        }

        // Get sender's holding
        let mut from_holding = storage::get_token_holding(&env, &invoice_id, &from)
            .ok_or(ContractError::InsufficientTokens)?;

        if from_holding.amount < amount {
            return Err(ContractError::InsufficientTokens);
        }

        // Update sender's holding
        from_holding.amount -= amount;
        if from_holding.amount == 0 {
            remove_token_holding(&env, &invoice_id, &from);
        } else {
            set_token_holding(&env, &invoice_id, &from, &from_holding);
        }

        // Update or create recipient's holding
        let to_holding = match storage::get_token_holding(&env, &invoice_id, &to) {
            Some(mut existing) => {
                existing.amount += amount;
                existing
            }
            None => TokenHolding {
                invoice_id: invoice_id.clone(),
                holder: to.clone(),
                amount,
                acquired_at: env.ledger().timestamp(),
                acquired_price: from_holding.acquired_price, // Inherit price
            },
        };
        set_token_holding(&env, &invoice_id, &to, &to_holding);

        // Emit event
        InvoiceEvents::token_transfer(&env, &invoice_id, &from, &to, amount);

        Ok(())
    }

    /// Invest in an invoice (buy tokens at a discount)
    /// Only KYC-approved investors can call this
    pub fn invest(
        env: Env,
        invoice_id: String,
        investor: Address,
        token_amount: i128,
        payment_amount: i128,       // USDC amount investor is paying
    ) -> Result<(), ContractError> {
        investor.require_auth();

        // Check KYC status - AUTHORIZATION_REQUIRED equivalent
        if !get_kyc_status(&env, &investor) {
            return Err(ContractError::KYCRequired);
        }

        let mut invoice = get_invoice(&env, &invoice_id)
            .ok_or(ContractError::InvoiceNotFound)?;

        // Can only invest in verified invoices
        if invoice.status != InvoiceStatus::Verified && invoice.status != InvoiceStatus::Funded {
            return Err(ContractError::InvalidStatus);
        }

        // Transfer USDC from investor to contract
        let usdc_token = storage::get_usdc_token(&env);
        let token_client = TokenClient::new(&env, &usdc_token);
        token_client.transfer(&investor, &env.current_contract_address(), &payment_amount);

        // Find a seller (for demo, we'll use the supplier's tokens)
        // In production, this would be a marketplace mechanism
        let supplier = invoice.supplier.clone();
        let mut supplier_holding = storage::get_token_holding(&env, &invoice_id, &supplier)
            .ok_or(ContractError::InsufficientTokens)?;

        if supplier_holding.amount < token_amount {
            return Err(ContractError::InsufficientTokens);
        }

        // Transfer tokens from supplier to investor
        supplier_holding.amount -= token_amount;
        if supplier_holding.amount == 0 {
            remove_token_holding(&env, &invoice_id, &supplier);
        } else {
            set_token_holding(&env, &invoice_id, &supplier, &supplier_holding);
        }

        // Create investor holding
        let investor_holding = TokenHolding {
            invoice_id: invoice_id.clone(),
            holder: investor.clone(),
            amount: token_amount,
            acquired_at: env.ledger().timestamp(),
            acquired_price: payment_amount,
        };
        set_token_holding(&env, &invoice_id, &investor, &investor_holding);

        // Pay the supplier
        token_client.transfer(&env.current_contract_address(), &supplier, &payment_amount);

        // Update invoice status to FUNDED
        invoice.status = InvoiceStatus::Funded;
        set_invoice(&env, &invoice_id, &invoice);

        // Emit event
        InvoiceEvents::investment_made(&env, &invoice_id, &investor, token_amount, payment_amount);

        Ok(())
    }

    // ========================================================================
    // PHASE 3: SETTLEMENT
    // ========================================================================

    /// Check and update invoice status (auto-transitions to OVERDUE/DEFAULTED)
    pub fn check_status(
        env: Env,
        invoice_id: String,
    ) -> Result<InvoiceStatus, ContractError> {
        let mut invoice = get_invoice(&env, &invoice_id)
            .ok_or(ContractError::InvoiceNotFound)?;

        let current_time = env.ledger().timestamp();
        let rate_config = get_rate_config(&env);

        // Only check for time-based transitions on active invoices
        if invoice.status == InvoiceStatus::Verified || 
           invoice.status == InvoiceStatus::Funded ||
           invoice.status == InvoiceStatus::Overdue {
            
            if invoice.repayment_received == 0 {
                let grace_period_seconds = (rate_config.grace_period_days as u64) * 24 * 60 * 60;
                
                if current_time > invoice.due_date + grace_period_seconds {
                    // Past grace period - DEFAULTED
                    invoice.status = InvoiceStatus::Defaulted;
                    set_invoice(&env, &invoice_id, &invoice);
                    InvoiceEvents::invoice_defaulted(&env, &invoice_id);
                } else if current_time > invoice.due_date {
                    // Past due date but within grace - OVERDUE
                    if invoice.status != InvoiceStatus::Overdue {
                        invoice.status = InvoiceStatus::Overdue;
                        set_invoice(&env, &invoice_id, &invoice);
                    }
                }
            }
        }

        Ok(invoice.status)
    }

    /// Settle the invoice (buyer pays, funds distributed to token holders)
    pub fn settle(
        env: Env,
        invoice_id: String,
        buyer: Address,
        payment_amount: i128,
    ) -> Result<(), ContractError> {
        buyer.require_auth();

        let mut invoice = get_invoice(&env, &invoice_id)
            .ok_or(ContractError::InvoiceNotFound)?;

        // Verify caller is the buyer
        if invoice.buyer != buyer {
            return Err(ContractError::Unauthorized);
        }

        // Can only settle funded or overdue invoices
        if invoice.status != InvoiceStatus::Funded && 
           invoice.status != InvoiceStatus::Overdue &&
           invoice.status != InvoiceStatus::Verified {
            return Err(ContractError::InvalidStatus);
        }

        // Cannot settle disputed invoices
        if invoice.status == InvoiceStatus::Disputed {
            return Err(ContractError::InvoiceDisputed);
        }

        // Calculate required payment (with penalty if overdue)
        let required_payment = Self::calculate_settlement_amount(&env, &invoice);

        if payment_amount < required_payment {
            return Err(ContractError::InsufficientPayment);
        }

        // Transfer USDC from buyer to contract
        let usdc_token = storage::get_usdc_token(&env);
        let token_client = TokenClient::new(&env, &usdc_token);
        token_client.transfer(&buyer, &env.current_contract_address(), &payment_amount);

        // Distribute funds pro-rata to all token holders
        Self::distribute_settlement(&env, &invoice_id, payment_amount)?;

        // Update invoice status
        invoice.status = InvoiceStatus::Settled;
        invoice.settled_at = env.ledger().timestamp();
        invoice.repayment_received = payment_amount;
        set_invoice(&env, &invoice_id, &invoice);

        // Emit event
        InvoiceEvents::invoice_settled(&env, &invoice_id, payment_amount);

        Ok(())
    }

    // ========================================================================
    // DISPUTE MECHANISM
    // ========================================================================

    /// Raise a dispute on an invoice (only buyer can call)
    /// Freezes the invoice - settlement cannot happen
    pub fn raise_dispute(
        env: Env,
        invoice_id: String,
        buyer: Address,
        reason: String,
    ) -> Result<(), ContractError> {
        buyer.require_auth();

        let mut invoice = get_invoice(&env, &invoice_id)
            .ok_or(ContractError::InvoiceNotFound)?;

        // Verify caller is the buyer
        if invoice.buyer != buyer {
            return Err(ContractError::Unauthorized);
        }

        // Can only dispute verified or funded invoices
        if invoice.status != InvoiceStatus::Verified && 
           invoice.status != InvoiceStatus::Funded &&
           invoice.status != InvoiceStatus::Overdue {
            return Err(ContractError::InvalidStatus);
        }

        // Create dispute
        let dispute = Dispute {
            invoice_id: invoice_id.clone(),
            raised_by: buyer.clone(),
            reason,
            raised_at: env.ledger().timestamp(),
            resolution: DisputeResolution::Pending,
            resolved_at: 0,
        };
        storage::set_dispute(&env, &invoice_id, &dispute);

        // Freeze invoice
        invoice.status = InvoiceStatus::Disputed;
        set_invoice(&env, &invoice_id, &invoice);

        // Emit event
        InvoiceEvents::dispute_raised(&env, &invoice_id, &buyer);

        Ok(())
    }

    /// Resolve a dispute (only admin can call)
    /// If valid: executes clawback, burns tokens, returns remaining funds
    /// If invalid: unfreezes invoice
    pub fn resolve_dispute(
        env: Env,
        invoice_id: String,
        admin: Address,
        is_valid: bool,
    ) -> Result<(), ContractError> {
        admin.require_auth();

        // Verify caller is admin
        let stored_admin = get_admin(&env);
        if stored_admin != admin {
            return Err(ContractError::Unauthorized);
        }

        let mut invoice = get_invoice(&env, &invoice_id)
            .ok_or(ContractError::InvoiceNotFound)?;

        if invoice.status != InvoiceStatus::Disputed {
            return Err(ContractError::InvalidStatus);
        }

        let mut dispute = storage::get_dispute(&env, &invoice_id)
            .ok_or(ContractError::DisputeNotFound)?;

        if is_valid {
            // Dispute is valid - execute clawback
            // Burn all tokens and mark as resolved
            Self::execute_clawback(&env, &invoice_id)?;
            
            dispute.resolution = DisputeResolution::Valid;
            invoice.status = InvoiceStatus::Disputed; // Stays disputed but resolved
        } else {
            // Dispute is invalid - unfreeze
            dispute.resolution = DisputeResolution::Invalid;
            invoice.status = InvoiceStatus::Funded; // Return to previous state
        }

        dispute.resolved_at = env.ledger().timestamp();
        storage::set_dispute(&env, &invoice_id, &dispute);
        set_invoice(&env, &invoice_id, &invoice);

        // Emit event
        InvoiceEvents::dispute_resolved(&env, &invoice_id, is_valid);

        Ok(())
    }

    // ========================================================================
    // STALE INVOICE REVOCATION
    // ========================================================================

    /// Revoke a stale invoice (supplier can revoke if unsold past due date)
    pub fn revoke(
        env: Env,
        invoice_id: String,
        supplier: Address,
    ) -> Result<(), ContractError> {
        supplier.require_auth();

        let mut invoice = get_invoice(&env, &invoice_id)
            .ok_or(ContractError::InvoiceNotFound)?;

        // Verify caller is the supplier
        if invoice.supplier != supplier {
            return Err(ContractError::Unauthorized);
        }

        let current_time = env.ledger().timestamp();

        // Can revoke if:
        // 1. Still in DRAFT (not yet approved)
        // 2. VERIFIED but past due date and no investments
        let can_revoke = match invoice.status {
            InvoiceStatus::Draft => true,
            InvoiceStatus::Verified => {
                current_time > invoice.due_date
            }
            _ => false,
        };

        if !can_revoke {
            return Err(ContractError::CannotRevoke);
        }

        // Burn all tokens (remove holdings)
        storage::clear_token_holdings(&env, &invoice_id);

        // Update status
        invoice.status = InvoiceStatus::Revoked;
        set_invoice(&env, &invoice_id, &invoice);

        // Emit event
        InvoiceEvents::invoice_revoked(&env, &invoice_id);

        Ok(())
    }

    // ========================================================================
    // KYC / AUTHORIZATION
    // ========================================================================

    /// Set KYC status for an investor (only admin can call)
    /// Equivalent to Stellar's AUTHORIZATION_REQUIRED + SetTrustLineFlags
    pub fn set_investor_kyc(
        env: Env,
        admin: Address,
        investor: Address,
        approved: bool,
    ) -> Result<(), ContractError> {
        admin.require_auth();

        // Verify caller is admin
        let stored_admin = get_admin(&env);
        if stored_admin != admin {
            return Err(ContractError::Unauthorized);
        }

        set_kyc_status(&env, &investor, approved);

        // Emit event
        InvoiceEvents::kyc_updated(&env, &investor, approved);

        Ok(())
    }

    /// Check if an investor is KYC approved
    pub fn is_kyc_approved(env: Env, investor: Address) -> bool {
        get_kyc_status(&env, &investor)
    }

    // ========================================================================
    // VIEW FUNCTIONS
    // ========================================================================

    /// Get invoice details
    pub fn get_invoice(env: Env, invoice_id: String) -> Result<Invoice, ContractError> {
        get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)
    }

    /// Get token holding for an address
    pub fn get_holding(
        env: Env,
        invoice_id: String,
        holder: Address,
    ) -> Result<TokenHolding, ContractError> {
        storage::get_token_holding(&env, &invoice_id, &holder)
            .ok_or(ContractError::HoldingNotFound)
    }

    /// Get dispute details
    pub fn get_dispute(env: Env, invoice_id: String) -> Result<Dispute, ContractError> {
        storage::get_dispute(&env, &invoice_id).ok_or(ContractError::DisputeNotFound)
    }

    /// Calculate current settlement amount (including penalties)
    pub fn get_settlement_amount(env: Env, invoice_id: String) -> Result<i128, ContractError> {
        let invoice = get_invoice(&env, &invoice_id)
            .ok_or(ContractError::InvoiceNotFound)?;
        Ok(Self::calculate_settlement_amount(&env, &invoice))
    }

    // ========================================================================
    // INTERNAL HELPERS
    // ========================================================================

    fn generate_invoice_id(env: &Env) -> String {
        // Simple counter-based ID for demo
        let counter = storage::get_invoice_counter(env);
        storage::set_invoice_counter(env, counter + 1);
        
        // Format: "INV-1001", "INV-1002", etc.
        let mut id_bytes = [0u8; 10];
        id_bytes[0] = b'I';
        id_bytes[1] = b'N';
        id_bytes[2] = b'V';
        id_bytes[3] = b'-';
        
        let num = counter + 1001;
        let digits = Self::num_to_digits(num);
        id_bytes[4..4 + digits.len()].copy_from_slice(&digits);
        
        String::from_str(env, core::str::from_utf8(&id_bytes[..4 + digits.len()]).unwrap())
    }

    fn num_to_digits(mut num: u32) -> [u8; 6] {
        let mut digits = [0u8; 6];
        let mut i = 5;
        while num > 0 {
            digits[i] = b'0' + (num % 10) as u8;
            num /= 10;
            if i == 0 { break; }
            i -= 1;
        }
        let start = i + 1;
        let mut result = [0u8; 6];
        result[..6-start].copy_from_slice(&digits[start..]);
        result
    }

    fn generate_token_symbol(env: &Env, invoice_id: &String) -> String {
        // Format: "SNG-INV-1001"
        let prefix = String::from_str(env, "SNG-");
        // For simplicity, just use the invoice ID
        prefix
    }

    fn calculate_settlement_amount(env: &Env, invoice: &Invoice) -> i128 {
        let current_time = env.ledger().timestamp();
        let rate_config = get_rate_config(env);
        
        let base_amount = invoice.amount;
        
        // Calculate days elapsed
        let seconds_per_day = 86400u64;
        let days_since_creation = (current_time - invoice.created_at) / seconds_per_day;
        
        // Determine interest rate
        let interest_rate = if current_time > invoice.due_date {
            // Penalty rate applies
            rate_config.penalty_rate
        } else {
            rate_config.base_interest_rate
        };

        // Calculate interest (simple interest for demo)
        // interest = principal * rate * (days / 365)
        // Using basis points: rate is in 1/10000
        let interest = (base_amount * (interest_rate as i128) * (days_since_creation as i128)) 
            / (10000 * 365);

        base_amount + interest
    }

    fn distribute_settlement(
        env: &Env,
        invoice_id: &String,
        total_amount: i128,
    ) -> Result<(), ContractError> {
        let invoice = get_invoice(env, invoice_id)
            .ok_or(ContractError::InvoiceNotFound)?;
        
        let usdc_token = storage::get_usdc_token(env);
        let token_client = TokenClient::new(env, &usdc_token);

        // Get all token holders and calculate pro-rata distribution
        let holders = storage::get_all_holders(env, invoice_id);
        let total_tokens = invoice.total_tokens;

        for holder_address in holders.iter() {
            if let Some(holding) = storage::get_token_holding(env, invoice_id, &holder_address) {
                // Calculate share: (holding.amount / total_tokens) * total_amount
                let share = (holding.amount * total_amount) / total_tokens;
                
                // Transfer to holder
                token_client.transfer(
                    &env.current_contract_address(),
                    &holder_address,
                    &share,
                );

                // Burn tokens (remove holding)
                remove_token_holding(env, invoice_id, &holder_address);

                // Emit event
                InvoiceEvents::settlement_distributed(env, invoice_id, &holder_address, share);
            }
        }

        Ok(())
    }

    fn execute_clawback(env: &Env, invoice_id: &String) -> Result<(), ContractError> {
        // Get all token holders and burn their tokens
        let holders = storage::get_all_holders(env, invoice_id);

        for holder_address in holders.iter() {
            if let Some(holding) = storage::get_token_holding(env, invoice_id, &holder_address) {
                // Remove/burn the tokens
                remove_token_holding(env, invoice_id, &holder_address);
                
                // Emit clawback event
                InvoiceEvents::clawback_executed(env, invoice_id, &holder_address, holding.amount);
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod test;
