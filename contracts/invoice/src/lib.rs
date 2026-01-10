//! Sangini Invoice Contract
//! 
//! Features: Dutch auction, Partial funding, Insurance pool, Secondary market

#![no_std]

mod types;
mod storage;
mod events;
mod errors;

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec, token::TokenClient};

use types::{Invoice, InvoiceStatus, Dispute, DisputeResolution, TokenHolding, SellOrder, OrderStatus};
use storage::{get_invoice, set_invoice, get_admin, set_admin, set_token_holding, remove_token_holding, get_kyc_status, set_kyc_status, get_rate_config, set_rate_config};
use errors::ContractError;
use events::InvoiceEvents;

pub use types::RateConfig;

#[contract]
pub struct SanginiInvoiceContract;

#[contractimpl]
impl SanginiInvoiceContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        payment_token: Address,
        base_interest_rate: u32,
        penalty_rate: u32,
        grace_period_days: u32,
        insurance_cut_bps: u32,
    ) -> Result<(), ContractError> {
        if storage::has_admin(&env) {
            return Err(ContractError::AlreadyInitialized);
        }
        set_admin(&env, &admin);
        storage::set_usdc_token(&env, &payment_token);
        let rate_config = RateConfig {
            base_interest_rate,
            penalty_rate,
            grace_period_days,
            default_auction_duration: 604800,
            default_price_drop_rate: 50,
            default_max_discount: 1500,
            insurance_cut_bps,
        };
        set_rate_config(&env, &rate_config);
        Ok(())
    }

    pub fn mint_draft(
        env: Env,
        supplier: Address,
        buyer: Address,
        amount: i128,
        currency: String,
        due_date: u64,
        description: String,
        purchase_order: String,
        document_hash: String,
    ) -> Result<String, ContractError> {
        supplier.require_auth();
        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }
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
            tokens_sold: 0,
            tokens_remaining: 0,
            description,
            purchase_order,
            document_hash,
            repayment_received: 0,
            buyer_signed_at: 0,
            auction_start: 0,
            auction_end: 0,
            start_price: 0,
            min_price: 0,
            price_drop_rate: 0,
        };
        set_invoice(&env, &invoice_id, &invoice);
        InvoiceEvents::invoice_created(&env, &invoice_id, &supplier, &buyer, amount);
        Ok(invoice_id)
    }


    pub fn approve_invoice(env: Env, invoice_id: String, buyer: Address) -> Result<(), ContractError> {
        buyer.require_auth();
        let mut invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        if invoice.buyer != buyer { return Err(ContractError::Unauthorized); }
        if invoice.status != InvoiceStatus::Draft { return Err(ContractError::InvalidStatus); }
        
        invoice.status = InvoiceStatus::Verified;
        invoice.verified_at = env.ledger().timestamp();
        invoice.buyer_signed_at = env.ledger().timestamp();
        invoice.token_symbol = Self::generate_token_symbol(&env, &invoice_id);
        invoice.total_tokens = invoice.amount;
        invoice.tokens_sold = 0;
        invoice.tokens_remaining = invoice.amount;
        set_invoice(&env, &invoice_id, &invoice);

        let holding = TokenHolding {
            invoice_id: invoice_id.clone(),
            holder: invoice.supplier.clone(),
            amount: invoice.total_tokens,
            acquired_at: env.ledger().timestamp(),
            acquired_price: invoice.amount,
        };
        set_token_holding(&env, &invoice_id, &invoice.supplier, &holding);
        InvoiceEvents::invoice_verified(&env, &invoice_id, &buyer, invoice.total_tokens);
        Ok(())
    }

    pub fn start_auction(env: Env, invoice_id: String, supplier: Address, duration_hours: u64, max_discount_bps: u32) -> Result<(), ContractError> {
        supplier.require_auth();
        let mut invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        if invoice.status != InvoiceStatus::Verified { return Err(ContractError::InvalidStatus); }
        if invoice.supplier != supplier { return Err(ContractError::Unauthorized); }
        if duration_hours == 0 || max_discount_bps > 5000 { return Err(ContractError::InvalidAuctionParams); }

        let now = env.ledger().timestamp();
        let rate_config = get_rate_config(&env);
        invoice.auction_start = now;
        invoice.auction_end = now + (duration_hours * 3600);
        invoice.start_price = invoice.amount;
        invoice.min_price = invoice.amount - (invoice.amount * max_discount_bps as i128 / 10000);
        invoice.price_drop_rate = rate_config.default_price_drop_rate;
        invoice.status = InvoiceStatus::Funding;
        set_invoice(&env, &invoice_id, &invoice);
        InvoiceEvents::auction_started(&env, &invoice_id, invoice.auction_end, invoice.start_price, invoice.min_price);
        Ok(())
    }

    pub fn get_current_price(env: Env, invoice_id: String) -> Result<i128, ContractError> {
        let invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        if invoice.auction_start == 0 { return Err(ContractError::AuctionNotStarted); }
        let now = env.ledger().timestamp();
        if now >= invoice.auction_end { return Ok(invoice.min_price); }
        let hours_elapsed = (now - invoice.auction_start) / 3600;
        let total_drop = (invoice.start_price * invoice.price_drop_rate as i128 * hours_elapsed as i128) / 10000;
        Ok((invoice.start_price - total_drop).max(invoice.min_price))
    }

    pub fn get_available_tokens(env: Env, invoice_id: String) -> Result<i128, ContractError> {
        let invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        Ok(invoice.tokens_remaining)
    }


    pub fn invest(env: Env, invoice_id: String, investor: Address, token_amount: i128) -> Result<(), ContractError> {
        investor.require_auth();
        if !get_kyc_status(&env, &investor) { return Err(ContractError::KYCRequired); }
        
        let mut invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        if invoice.status != InvoiceStatus::Funding && invoice.status != InvoiceStatus::Verified {
            return Err(ContractError::InvalidStatus);
        }
        if token_amount > invoice.tokens_remaining { return Err(ContractError::InsufficientTokens); }

        let current_price = if invoice.auction_start > 0 {
            Self::get_current_price(env.clone(), invoice_id.clone())?
        } else { invoice.amount };
        let payment_amount = (token_amount * current_price) / invoice.total_tokens;

        let rate_config = get_rate_config(&env);
        let insurance_amount = (payment_amount * rate_config.insurance_cut_bps as i128) / 10000;
        let supplier_payment = payment_amount - insurance_amount;

        let payment_token = storage::get_usdc_token(&env);
        let token_client = TokenClient::new(&env, &payment_token);
        token_client.transfer(&investor, &env.current_contract_address(), &payment_amount);
        token_client.transfer(&env.current_contract_address(), &invoice.supplier, &supplier_payment);
        storage::add_to_insurance_pool(&env, insurance_amount);

        let supplier = invoice.supplier.clone();
        let mut supplier_holding = storage::get_token_holding(&env, &invoice_id, &supplier).ok_or(ContractError::InsufficientTokens)?;
        if supplier_holding.amount < token_amount { return Err(ContractError::InsufficientTokens); }
        supplier_holding.amount -= token_amount;
        if supplier_holding.amount == 0 {
            remove_token_holding(&env, &invoice_id, &supplier);
        } else {
            set_token_holding(&env, &invoice_id, &supplier, &supplier_holding);
        }

        let investor_holding = match storage::get_token_holding(&env, &invoice_id, &investor) {
            Some(mut existing) => { existing.amount += token_amount; existing.acquired_price += payment_amount; existing }
            None => TokenHolding { invoice_id: invoice_id.clone(), holder: investor.clone(), amount: token_amount, acquired_at: env.ledger().timestamp(), acquired_price: payment_amount }
        };
        set_token_holding(&env, &invoice_id, &investor, &investor_holding);

        invoice.tokens_sold += token_amount;
        invoice.tokens_remaining -= token_amount;
        if invoice.tokens_remaining == 0 {
            invoice.status = InvoiceStatus::Funded;
            InvoiceEvents::auction_ended(&env, &invoice_id, current_price);
        }
        set_invoice(&env, &invoice_id, &invoice);
        InvoiceEvents::investment_made(&env, &invoice_id, &investor, token_amount, payment_amount);
        Ok(())
    }

    pub fn claim_insurance(env: Env, invoice_id: String, investor: Address) -> Result<i128, ContractError> {
        investor.require_auth();
        let invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        if invoice.status != InvoiceStatus::Defaulted { return Err(ContractError::NotDefaulted); }
        if storage::is_insurance_claimed(&env, &invoice_id, &investor) { return Err(ContractError::AlreadyClaimed); }
        
        let holding = storage::get_token_holding(&env, &invoice_id, &investor).ok_or(ContractError::HoldingNotFound)?;
        let claim_amount = holding.acquired_price / 2;
        let pool_balance = storage::get_insurance_pool(&env);
        let actual_payout = claim_amount.min(pool_balance);
        if actual_payout == 0 { return Err(ContractError::InsufficientInsurancePool); }
        if !storage::withdraw_from_insurance_pool(&env, actual_payout) { return Err(ContractError::InsufficientInsurancePool); }

        let payment_token = storage::get_usdc_token(&env);
        TokenClient::new(&env, &payment_token).transfer(&env.current_contract_address(), &investor, &actual_payout);
        storage::set_insurance_claimed(&env, &invoice_id, &investor);
        InvoiceEvents::insurance_claimed(&env, &invoice_id, &investor, actual_payout);
        Ok(actual_payout)
    }

    pub fn get_insurance_pool_balance(env: Env) -> i128 { storage::get_insurance_pool(&env) }


    pub fn create_sell_order(env: Env, invoice_id: String, seller: Address, token_amount: i128, price_per_token: i128) -> Result<String, ContractError> {
        seller.require_auth();
        let holding = storage::get_token_holding(&env, &invoice_id, &seller).ok_or(ContractError::HoldingNotFound)?;
        if holding.amount < token_amount { return Err(ContractError::InsufficientTokens); }
        
        let order_id = Self::generate_order_id(&env);
        let order = SellOrder {
            id: order_id.clone(), invoice_id: invoice_id.clone(), seller: seller.clone(),
            token_amount, price_per_token, tokens_remaining: token_amount,
            created_at: env.ledger().timestamp(), status: OrderStatus::Open,
        };
        storage::set_sell_order(&env, &order_id, &order);
        storage::add_order_to_invoice(&env, &invoice_id, &order_id);
        InvoiceEvents::order_created(&env, &order_id, &invoice_id, &seller, token_amount, price_per_token);
        Ok(order_id)
    }

    pub fn fill_order(env: Env, order_id: String, buyer: Address, token_amount: i128) -> Result<(), ContractError> {
        buyer.require_auth();
        if !get_kyc_status(&env, &buyer) { return Err(ContractError::KYCRequired); }
        
        let mut order = storage::get_sell_order(&env, &order_id).ok_or(ContractError::OrderNotFound)?;
        if order.status != OrderStatus::Open && order.status != OrderStatus::PartiallyFilled { return Err(ContractError::OrderNotActive); }
        if token_amount > order.tokens_remaining { return Err(ContractError::InsufficientTokens); }

        let payment = token_amount * order.price_per_token;
        let payment_token = storage::get_usdc_token(&env);
        TokenClient::new(&env, &payment_token).transfer(&buyer, &order.seller, &payment);
        Self::internal_transfer_tokens(&env, &order.invoice_id, &order.seller, &buyer, token_amount)?;

        order.tokens_remaining -= token_amount;
        order.status = if order.tokens_remaining == 0 { OrderStatus::Filled } else { OrderStatus::PartiallyFilled };
        storage::set_sell_order(&env, &order_id, &order);
        InvoiceEvents::order_filled(&env, &order_id, &buyer, token_amount, payment);
        Ok(())
    }

    pub fn cancel_order(env: Env, order_id: String, seller: Address) -> Result<(), ContractError> {
        seller.require_auth();
        let mut order = storage::get_sell_order(&env, &order_id).ok_or(ContractError::OrderNotFound)?;
        if order.seller != seller { return Err(ContractError::Unauthorized); }
        if order.status == OrderStatus::Filled { return Err(ContractError::OrderAlreadyFilled); }
        order.status = OrderStatus::Cancelled;
        storage::set_sell_order(&env, &order_id, &order);
        InvoiceEvents::order_cancelled(&env, &order_id);
        Ok(())
    }

    pub fn get_order(env: Env, order_id: String) -> Result<SellOrder, ContractError> {
        storage::get_sell_order(&env, &order_id).ok_or(ContractError::OrderNotFound)
    }

    pub fn get_open_orders(env: Env, invoice_id: String) -> Vec<SellOrder> {
        let order_ids = storage::get_orders_for_invoice(&env, &invoice_id);
        let mut open_orders = Vec::new(&env);
        for id in order_ids.iter() {
            if let Some(order) = storage::get_sell_order(&env, &id) {
                if order.status == OrderStatus::Open || order.status == OrderStatus::PartiallyFilled {
                    open_orders.push_back(order);
                }
            }
        }
        open_orders
    }


    pub fn transfer_tokens(env: Env, invoice_id: String, from: Address, to: Address, amount: i128) -> Result<(), ContractError> {
        from.require_auth();
        let invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        if invoice.status != InvoiceStatus::Verified && invoice.status != InvoiceStatus::Funded && invoice.status != InvoiceStatus::Funding {
            return Err(ContractError::InvalidStatus);
        }
        Self::internal_transfer_tokens(&env, &invoice_id, &from, &to, amount)?;
        InvoiceEvents::token_transfer(&env, &invoice_id, &from, &to, amount);
        Ok(())
    }

    pub fn check_status(env: Env, invoice_id: String) -> Result<InvoiceStatus, ContractError> {
        let mut invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        let current_time = env.ledger().timestamp();
        let rate_config = get_rate_config(&env);

        if invoice.status == InvoiceStatus::Verified || invoice.status == InvoiceStatus::Funded || 
           invoice.status == InvoiceStatus::Funding || invoice.status == InvoiceStatus::Overdue {
            if invoice.repayment_received == 0 {
                let grace_period_seconds = (rate_config.grace_period_days as u64) * 86400;
                if current_time > invoice.due_date + grace_period_seconds {
                    invoice.status = InvoiceStatus::Defaulted;
                    set_invoice(&env, &invoice_id, &invoice);
                    InvoiceEvents::invoice_defaulted(&env, &invoice_id);
                } else if current_time > invoice.due_date && invoice.status != InvoiceStatus::Overdue {
                    invoice.status = InvoiceStatus::Overdue;
                    set_invoice(&env, &invoice_id, &invoice);
                }
            }
        }
        Ok(invoice.status)
    }

    pub fn settle(env: Env, invoice_id: String, buyer: Address, payment_amount: i128) -> Result<(), ContractError> {
        buyer.require_auth();
        let mut invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        if invoice.buyer != buyer { return Err(ContractError::Unauthorized); }
        if invoice.status != InvoiceStatus::Funded && invoice.status != InvoiceStatus::Overdue && invoice.status != InvoiceStatus::Verified && invoice.status != InvoiceStatus::Funding {
            return Err(ContractError::InvalidStatus);
        }
        if invoice.status == InvoiceStatus::Disputed { return Err(ContractError::InvoiceDisputed); }

        let required_payment = Self::calculate_settlement_amount(&env, &invoice);
        if payment_amount < required_payment { return Err(ContractError::InsufficientPayment); }

        let payment_token = storage::get_usdc_token(&env);
        let token_client = TokenClient::new(&env, &payment_token);
        token_client.transfer(&buyer, &env.current_contract_address(), &payment_amount);
        Self::distribute_settlement(&env, &invoice_id, payment_amount)?;

        invoice.status = InvoiceStatus::Settled;
        invoice.settled_at = env.ledger().timestamp();
        invoice.repayment_received = payment_amount;
        set_invoice(&env, &invoice_id, &invoice);
        InvoiceEvents::invoice_settled(&env, &invoice_id, payment_amount);
        Ok(())
    }


    pub fn raise_dispute(env: Env, invoice_id: String, buyer: Address, reason: String) -> Result<(), ContractError> {
        buyer.require_auth();
        let mut invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        if invoice.buyer != buyer { return Err(ContractError::Unauthorized); }
        if invoice.status != InvoiceStatus::Verified && invoice.status != InvoiceStatus::Funded && 
           invoice.status != InvoiceStatus::Funding && invoice.status != InvoiceStatus::Overdue {
            return Err(ContractError::InvalidStatus);
        }
        let dispute = Dispute {
            invoice_id: invoice_id.clone(), raised_by: buyer.clone(), reason,
            raised_at: env.ledger().timestamp(), resolution: DisputeResolution::Pending, resolved_at: 0,
        };
        storage::set_dispute(&env, &invoice_id, &dispute);
        invoice.status = InvoiceStatus::Disputed;
        set_invoice(&env, &invoice_id, &invoice);
        InvoiceEvents::dispute_raised(&env, &invoice_id, &buyer);
        Ok(())
    }

    pub fn resolve_dispute(env: Env, invoice_id: String, admin: Address, is_valid: bool) -> Result<(), ContractError> {
        admin.require_auth();
        if get_admin(&env) != admin { return Err(ContractError::Unauthorized); }
        let mut invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        if invoice.status != InvoiceStatus::Disputed { return Err(ContractError::InvalidStatus); }
        let mut dispute = storage::get_dispute(&env, &invoice_id).ok_or(ContractError::DisputeNotFound)?;

        if is_valid {
            Self::execute_clawback(&env, &invoice_id)?;
            dispute.resolution = DisputeResolution::Valid;
        } else {
            dispute.resolution = DisputeResolution::Invalid;
            invoice.status = InvoiceStatus::Funded;
        }
        dispute.resolved_at = env.ledger().timestamp();
        storage::set_dispute(&env, &invoice_id, &dispute);
        set_invoice(&env, &invoice_id, &invoice);
        InvoiceEvents::dispute_resolved(&env, &invoice_id, is_valid);
        Ok(())
    }

    pub fn revoke(env: Env, invoice_id: String, supplier: Address) -> Result<(), ContractError> {
        supplier.require_auth();
        let mut invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        if invoice.supplier != supplier { return Err(ContractError::Unauthorized); }
        let current_time = env.ledger().timestamp();
        let can_revoke = match invoice.status {
            InvoiceStatus::Draft => true,
            InvoiceStatus::Verified => current_time > invoice.due_date,
            _ => false,
        };
        if !can_revoke { return Err(ContractError::CannotRevoke); }
        storage::clear_token_holdings(&env, &invoice_id);
        invoice.status = InvoiceStatus::Revoked;
        set_invoice(&env, &invoice_id, &invoice);
        InvoiceEvents::invoice_revoked(&env, &invoice_id);
        Ok(())
    }

    pub fn set_investor_kyc(env: Env, admin: Address, investor: Address, approved: bool) -> Result<(), ContractError> {
        admin.require_auth();
        if get_admin(&env) != admin { return Err(ContractError::Unauthorized); }
        set_kyc_status(&env, &investor, approved);
        InvoiceEvents::kyc_updated(&env, &investor, approved);
        Ok(())
    }

    pub fn set_relayer(env: Env, admin: Address, relayer: Address, authorized: bool) -> Result<(), ContractError> {
        admin.require_auth();
        if get_admin(&env) != admin { return Err(ContractError::Unauthorized); }
        storage::set_authorized_relayer(&env, &relayer, authorized);
        Ok(())
    }

    pub fn is_kyc_approved(env: Env, investor: Address) -> bool { get_kyc_status(&env, &investor) }
    pub fn get_invoice(env: Env, invoice_id: String) -> Result<Invoice, ContractError> { get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound) }
    pub fn get_holding(env: Env, invoice_id: String, holder: Address) -> Result<TokenHolding, ContractError> { storage::get_token_holding(&env, &invoice_id, &holder).ok_or(ContractError::HoldingNotFound) }
    pub fn get_dispute(env: Env, invoice_id: String) -> Result<Dispute, ContractError> { storage::get_dispute(&env, &invoice_id).ok_or(ContractError::DisputeNotFound) }
    pub fn get_settlement_amount(env: Env, invoice_id: String) -> Result<i128, ContractError> { let invoice = get_invoice(&env, &invoice_id).ok_or(ContractError::InvoiceNotFound)?; Ok(Self::calculate_settlement_amount(&env, &invoice)) }
    pub fn verify_document(env: Env, invoice_id: String, document_hash: String) -> bool { get_invoice(&env, &invoice_id).map(|inv| inv.document_hash == document_hash).unwrap_or(false) }


    // ========================================================================
    // INTERNAL HELPERS
    // ========================================================================

    fn generate_invoice_id(env: &Env) -> String {
        let counter = storage::get_invoice_counter(env);
        storage::set_invoice_counter(env, counter + 1);
        let num = counter + 1001;
        let mut digits = [0u8; 4];
        let mut n = num;
        for i in (0..4).rev() { digits[i] = b'0' + (n % 10) as u8; n /= 10; }
        let mut id_bytes = [0u8; 8];
        id_bytes[0] = b'I'; id_bytes[1] = b'N'; id_bytes[2] = b'V'; id_bytes[3] = b'-';
        id_bytes[4] = digits[0]; id_bytes[5] = digits[1]; id_bytes[6] = digits[2]; id_bytes[7] = digits[3];
        String::from_str(env, core::str::from_utf8(&id_bytes).unwrap())
    }

    fn generate_order_id(env: &Env) -> String {
        let counter = storage::get_order_counter(env);
        storage::set_order_counter(env, counter + 1);
        let num = counter + 1;
        let mut digits = [0u8; 4];
        let mut n = num;
        for i in (0..4).rev() { digits[i] = b'0' + (n % 10) as u8; n /= 10; }
        let mut id_bytes = [0u8; 8];
        id_bytes[0] = b'O'; id_bytes[1] = b'R'; id_bytes[2] = b'D'; id_bytes[3] = b'-';
        id_bytes[4] = digits[0]; id_bytes[5] = digits[1]; id_bytes[6] = digits[2]; id_bytes[7] = digits[3];
        String::from_str(env, core::str::from_utf8(&id_bytes).unwrap())
    }

    fn generate_token_symbol(env: &Env, _invoice_id: &String) -> String { String::from_str(env, "SNG-") }

    fn calculate_settlement_amount(env: &Env, invoice: &Invoice) -> i128 {
        let current_time = env.ledger().timestamp();
        let rate_config = get_rate_config(env);
        let base_amount = invoice.amount;
        let days_since_creation = (current_time - invoice.created_at) / 86400;
        let interest_rate = if current_time > invoice.due_date { rate_config.penalty_rate } else { rate_config.base_interest_rate };
        let interest = (base_amount * (interest_rate as i128) * (days_since_creation as i128)) / (10000 * 365);
        base_amount + interest
    }

    fn distribute_settlement(env: &Env, invoice_id: &String, total_amount: i128) -> Result<(), ContractError> {
        let invoice = get_invoice(env, invoice_id).ok_or(ContractError::InvoiceNotFound)?;
        let payment_token = storage::get_usdc_token(env);
        let token_client = TokenClient::new(env, &payment_token);
        let holders = storage::get_all_holders(env, invoice_id);
        let total_tokens = invoice.total_tokens;
        for holder_address in holders.iter() {
            if let Some(holding) = storage::get_token_holding(env, invoice_id, &holder_address) {
                let share = (holding.amount * total_amount) / total_tokens;
                token_client.transfer(&env.current_contract_address(), &holder_address, &share);
                remove_token_holding(env, invoice_id, &holder_address);
                InvoiceEvents::settlement_distributed(env, invoice_id, &holder_address, share);
            }
        }
        Ok(())
    }

    fn execute_clawback(env: &Env, invoice_id: &String) -> Result<(), ContractError> {
        let holders = storage::get_all_holders(env, invoice_id);
        for holder_address in holders.iter() {
            if let Some(holding) = storage::get_token_holding(env, invoice_id, &holder_address) {
                remove_token_holding(env, invoice_id, &holder_address);
                InvoiceEvents::clawback_executed(env, invoice_id, &holder_address, holding.amount);
            }
        }
        Ok(())
    }

    fn internal_transfer_tokens(env: &Env, invoice_id: &String, from: &Address, to: &Address, amount: i128) -> Result<(), ContractError> {
        let mut from_holding = storage::get_token_holding(env, invoice_id, from).ok_or(ContractError::InsufficientTokens)?;
        if from_holding.amount < amount { return Err(ContractError::InsufficientTokens); }
        from_holding.amount -= amount;
        if from_holding.amount == 0 { remove_token_holding(env, invoice_id, from); } 
        else { set_token_holding(env, invoice_id, from, &from_holding); }

        let to_holding = match storage::get_token_holding(env, invoice_id, to) {
            Some(mut existing) => { existing.amount += amount; existing }
            None => TokenHolding { invoice_id: invoice_id.clone(), holder: to.clone(), amount, acquired_at: env.ledger().timestamp(), acquired_price: from_holding.acquired_price }
        };
        set_token_holding(env, invoice_id, to, &to_holding);
        Ok(())
    }
}

#[cfg(test)]
mod test;
