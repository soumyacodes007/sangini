//! Unit tests for the Sangini Invoice Contract

#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> (TokenClient<'a>, StellarAssetClient<'a>) {
    let contract_address = env.register_stellar_asset_contract_v2(admin.clone());
    (
        TokenClient::new(env, &contract_address.address()),
        StellarAssetClient::new(env, &contract_address.address()),
    )
}

fn create_invoice_contract(env: &Env) -> SanginiInvoiceContractClient {
    let contract_id = env.register(SanginiInvoiceContract, ());
    SanginiInvoiceContractClient::new(env, &contract_id)
}

struct TestSetup<'a> {
    env: Env,
    contract: SanginiInvoiceContractClient<'a>,
    usdc: TokenClient<'a>,
    usdc_admin: StellarAssetClient<'a>,
    admin: Address,
    supplier: Address,
    buyer: Address,
    investor: Address,
    sub_vendor: Address,
}

impl<'a> TestSetup<'a> {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let supplier = Address::generate(&env);
        let buyer = Address::generate(&env);
        let investor = Address::generate(&env);
        let sub_vendor = Address::generate(&env);

        // Create USDC token
        let (usdc, usdc_admin) = create_token_contract(&env, &admin);

        // Create invoice contract
        let contract = create_invoice_contract(&env);

        // Initialize contract
        contract.initialize(
            &admin,
            &usdc.address,
            &1000,  // 10% base rate
            &2400,  // 24% penalty rate
            &30,    // 30 days grace
        );

        // Mint USDC to participants
        usdc_admin.mint(&buyer, &10_000_000_0000000);      // 10M USDC
        usdc_admin.mint(&investor, &1_000_000_0000000);    // 1M USDC

        Self {
            env,
            contract,
            usdc,
            usdc_admin,
            admin,
            supplier,
            buyer,
            investor,
            sub_vendor,
        }
    }

    fn create_sample_invoice(&self) -> String {
        let due_date = self.env.ledger().timestamp() + (90 * 24 * 60 * 60); // 90 days
        
        self.contract.mint_draft(
            &self.supplier,
            &self.buyer,
            &10_00_000_0000000,  // ₹10 Lakhs (10,000,000 with 7 decimals)
            &String::from_str(&self.env, "INR"),
            &due_date,
            &String::from_str(&self.env, "Auto parts supply Q4"),
            &String::from_str(&self.env, "PO-2024-1234"),
        )
    }
}

// ============================================================================
// PHASE 1: ORIGINATION & VERIFICATION TESTS
// ============================================================================

#[test]
fn test_mint_draft() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();

    let invoice = setup.contract.get_invoice(&invoice_id);
    
    assert_eq!(invoice.supplier, setup.supplier);
    assert_eq!(invoice.buyer, setup.buyer);
    assert_eq!(invoice.amount, 10_00_000_0000000);
    assert_eq!(invoice.status, InvoiceStatus::Draft);
    assert_eq!(invoice.total_tokens, 0); // Not minted yet
}

#[test]
fn test_approve_invoice() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();

    // Buyer approves - THE DIGITAL HANDSHAKE
    setup.contract.approve_invoice(&invoice_id, &setup.buyer);

    let invoice = setup.contract.get_invoice(&invoice_id);
    
    assert_eq!(invoice.status, InvoiceStatus::Verified);
    assert_eq!(invoice.total_tokens, 10_00_000_0000000); // Tokens minted
    assert!(invoice.buyer_signed_at > 0); // Cryptographic proof

    // Check supplier has all tokens
    let holding = setup.contract.get_holding(&invoice_id, &setup.supplier);
    assert_eq!(holding.amount, 10_00_000_0000000);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")] // Unauthorized
fn test_approve_invoice_wrong_buyer() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();

    // Wrong person tries to approve
    setup.contract.approve_invoice(&invoice_id, &setup.investor);
}

// ============================================================================
// PHASE 2: DEEP-TIER FINANCING TESTS
// ============================================================================

#[test]
fn test_transfer_tokens_to_sub_vendor() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();
    setup.contract.approve_invoice(&invoice_id, &setup.buyer);

    // Transfer 30% to sub-vendor
    let transfer_amount = 3_00_000_0000000; // 30% of 10L
    setup.contract.transfer_tokens(
        &invoice_id,
        &setup.supplier,
        &setup.sub_vendor,
        &transfer_amount,
    );

    // Check holdings
    let supplier_holding = setup.contract.get_holding(&invoice_id, &setup.supplier);
    let sub_vendor_holding = setup.contract.get_holding(&invoice_id, &setup.sub_vendor);

    assert_eq!(supplier_holding.amount, 7_00_000_0000000); // 70% remaining
    assert_eq!(sub_vendor_holding.amount, 3_00_000_0000000); // 30%
}

#[test]
fn test_invest_requires_kyc() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();
    setup.contract.approve_invoice(&invoice_id, &setup.buyer);

    // Try to invest without KYC - should fail
    let result = std::panic::catch_unwind(|| {
        setup.contract.invest(
            &invoice_id,
            &setup.investor,
            &1_00_000_0000000,
            &98_000_0000000, // 2% discount
        );
    });

    assert!(result.is_err()); // Should panic with KYCRequired
}

#[test]
fn test_invest_with_kyc() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();
    setup.contract.approve_invoice(&invoice_id, &setup.buyer);

    // Admin approves investor KYC
    setup.contract.set_investor_kyc(&setup.admin, &setup.investor, &true);

    // Now invest
    let token_amount = 1_00_000_0000000;  // 1L tokens
    let payment = 98_000_0000000;         // 2% discount

    setup.contract.invest(
        &invoice_id,
        &setup.investor,
        &token_amount,
        &payment,
    );

    // Check investor has tokens
    let holding = setup.contract.get_holding(&invoice_id, &setup.investor);
    assert_eq!(holding.amount, token_amount);

    // Check invoice is now FUNDED
    let invoice = setup.contract.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Funded);
}

// ============================================================================
// PHASE 3: SETTLEMENT TESTS
// ============================================================================

#[test]
fn test_settlement_distribution() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();
    setup.contract.approve_invoice(&invoice_id, &setup.buyer);

    // Setup: KYC investor and invest
    setup.contract.set_investor_kyc(&setup.admin, &setup.investor, &true);
    setup.contract.invest(
        &invoice_id,
        &setup.investor,
        &3_00_000_0000000,  // 30% of tokens
        &2_94_000_0000000,  // 2% discount
    );

    // Fast forward to due date
    setup.env.ledger().with_mut(|l| {
        l.timestamp = l.timestamp + (91 * 24 * 60 * 60); // 91 days
    });

    // Calculate settlement amount (with interest)
    let settlement = setup.contract.get_settlement_amount(&invoice_id);
    
    // Buyer settles
    setup.contract.settle(&invoice_id, &setup.buyer, &settlement);

    // Check invoice is settled
    let invoice = setup.contract.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Settled);
}

// ============================================================================
// DISPUTE TESTS
// ============================================================================

#[test]
fn test_raise_dispute() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();
    setup.contract.approve_invoice(&invoice_id, &setup.buyer);

    // Buyer raises dispute
    setup.contract.raise_dispute(
        &invoice_id,
        &setup.buyer,
        &String::from_str(&setup.env, "Goods were defective"),
    );

    // Check invoice is disputed
    let invoice = setup.contract.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Disputed);

    // Check dispute record
    let dispute = setup.contract.get_dispute(&invoice_id);
    assert_eq!(dispute.raised_by, setup.buyer);
    assert_eq!(dispute.resolution, DisputeResolution::Pending);
}

#[test]
fn test_resolve_dispute_valid_clawback() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();
    setup.contract.approve_invoice(&invoice_id, &setup.buyer);

    // Setup investor
    setup.contract.set_investor_kyc(&setup.admin, &setup.investor, &true);
    setup.contract.invest(
        &invoice_id,
        &setup.investor,
        &1_00_000_0000000,
        &98_000_0000000,
    );

    // Buyer raises dispute
    setup.contract.raise_dispute(
        &invoice_id,
        &setup.buyer,
        &String::from_str(&setup.env, "Goods defective"),
    );

    // Admin resolves dispute as VALID (clawback)
    setup.contract.resolve_dispute(&invoice_id, &setup.admin, &true);

    // Investor should have no tokens (clawback executed)
    let result = std::panic::catch_unwind(|| {
        setup.contract.get_holding(&invoice_id, &setup.investor);
    });
    assert!(result.is_err()); // Holding not found
}

#[test]
fn test_resolve_dispute_invalid() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();
    setup.contract.approve_invoice(&invoice_id, &setup.buyer);

    setup.contract.raise_dispute(
        &invoice_id,
        &setup.buyer,
        &String::from_str(&setup.env, "Testing"),
    );

    // Admin resolves dispute as INVALID (unfreeze)
    setup.contract.resolve_dispute(&invoice_id, &setup.admin, &false);

    // Invoice should be back to FUNDED
    let invoice = setup.contract.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Funded);
}

// ============================================================================
// REVOCATION TESTS
// ============================================================================

#[test]
fn test_revoke_draft() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();

    // Supplier revokes draft
    setup.contract.revoke(&invoice_id, &setup.supplier);

    let invoice = setup.contract.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Revoked);
}

#[test]
fn test_revoke_stale_verified() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();
    setup.contract.approve_invoice(&invoice_id, &setup.buyer);

    // Fast forward past due date
    setup.env.ledger().with_mut(|l| {
        l.timestamp = l.timestamp + (100 * 24 * 60 * 60); // 100 days
    });

    // Supplier revokes stale invoice
    setup.contract.revoke(&invoice_id, &setup.supplier);

    let invoice = setup.contract.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Revoked);
}

// ============================================================================
// STATUS CHECK TESTS
// ============================================================================

#[test]
fn test_check_status_overdue() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();
    setup.contract.approve_invoice(&invoice_id, &setup.buyer);

    // Fast forward past due date
    setup.env.ledger().with_mut(|l| {
        l.timestamp = l.timestamp + (91 * 24 * 60 * 60);
    });

    let status = setup.contract.check_status(&invoice_id);
    assert_eq!(status, InvoiceStatus::Overdue);
}

#[test]
fn test_check_status_defaulted() {
    let setup = TestSetup::new();
    let invoice_id = setup.create_sample_invoice();
    setup.contract.approve_invoice(&invoice_id, &setup.buyer);

    // Fast forward past grace period (90 + 30 days)
    setup.env.ledger().with_mut(|l| {
        l.timestamp = l.timestamp + (121 * 24 * 60 * 60);
    });

    let status = setup.contract.check_status(&invoice_id);
    assert_eq!(status, InvoiceStatus::Defaulted);
}

// ============================================================================
// KYC TESTS
// ============================================================================

#[test]
fn test_kyc_status() {
    let setup = TestSetup::new();

    // Initially not approved
    assert!(!setup.contract.is_kyc_approved(&setup.investor));

    // Admin approves
    setup.contract.set_investor_kyc(&setup.admin, &setup.investor, &true);
    assert!(setup.contract.is_kyc_approved(&setup.investor));

    // Admin revokes
    setup.contract.set_investor_kyc(&setup.admin, &setup.investor, &false);
    assert!(!setup.contract.is_kyc_approved(&setup.investor));
}
