//! Events module for the Sangini Invoice Contract
//! Emits events for frontend real-time updates

use soroban_sdk::{symbol_short, Address, Env, String};

pub struct InvoiceEvents;

impl InvoiceEvents {
    /// Emitted when a new invoice draft is created
    pub fn invoice_created(
        env: &Env,
        invoice_id: &String,
        supplier: &Address,
        buyer: &Address,
        amount: i128,
    ) {
        env.events().publish(
            (symbol_short!("CREATED"), invoice_id.clone()),
            (supplier.clone(), buyer.clone(), amount),
        );
    }

    /// Emitted when buyer approves an invoice (Digital Handshake)
    pub fn invoice_verified(
        env: &Env,
        invoice_id: &String,
        buyer: &Address,
        tokens_minted: i128,
    ) {
        env.events().publish(
            (symbol_short!("VERIFIED"), invoice_id.clone()),
            (buyer.clone(), tokens_minted),
        );
    }

    /// Emitted when tokens are transferred between parties
    pub fn token_transfer(
        env: &Env,
        invoice_id: &String,
        from: &Address,
        to: &Address,
        amount: i128,
    ) {
        env.events().publish(
            (symbol_short!("TRANSFER"), invoice_id.clone()),
            (from.clone(), to.clone(), amount),
        );
    }

    /// Emitted when an investor purchases tokens
    pub fn investment_made(
        env: &Env,
        invoice_id: &String,
        investor: &Address,
        token_amount: i128,
        payment_amount: i128,
    ) {
        env.events().publish(
            (symbol_short!("INVESTED"), invoice_id.clone()),
            (investor.clone(), token_amount, payment_amount),
        );
    }

    /// Emitted when an invoice is settled
    pub fn invoice_settled(env: &Env, invoice_id: &String, amount: i128) {
        env.events().publish(
            (symbol_short!("SETTLED"), invoice_id.clone()),
            amount,
        );
    }

    /// Emitted when an invoice becomes defaulted
    pub fn invoice_defaulted(env: &Env, invoice_id: &String) {
        env.events().publish(
            (symbol_short!("DEFAULT"), invoice_id.clone()),
            true,
        );
    }

    /// Emitted when an invoice is revoked
    pub fn invoice_revoked(env: &Env, invoice_id: &String) {
        env.events().publish(
            (symbol_short!("REVOKED"), invoice_id.clone()),
            true,
        );
    }

    /// Emitted when a dispute is raised
    pub fn dispute_raised(env: &Env, invoice_id: &String, buyer: &Address) {
        env.events().publish(
            (symbol_short!("DISPUTE"), invoice_id.clone()),
            buyer.clone(),
        );
    }

    /// Emitted when a dispute is resolved
    pub fn dispute_resolved(env: &Env, invoice_id: &String, is_valid: bool) {
        env.events().publish(
            (symbol_short!("RESOLVED"), invoice_id.clone()),
            is_valid,
        );
    }

    /// Emitted when KYC status is updated
    pub fn kyc_updated(env: &Env, investor: &Address, approved: bool) {
        env.events().publish(
            (symbol_short!("KYC"),),
            (investor.clone(), approved),
        );
    }

    /// Emitted when settlement is distributed to a holder
    pub fn settlement_distributed(
        env: &Env,
        invoice_id: &String,
        holder: &Address,
        amount: i128,
    ) {
        env.events().publish(
            (symbol_short!("PAYOUT"), invoice_id.clone()),
            (holder.clone(), amount),
        );
    }

    /// Emitted when clawback is executed on tokens
    pub fn clawback_executed(
        env: &Env,
        invoice_id: &String,
        holder: &Address,
        amount: i128,
    ) {
        env.events().publish(
            (symbol_short!("CLAWBACK"), invoice_id.clone()),
            (holder.clone(), amount),
        );
    }
}
