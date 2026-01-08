# CONTRACT DEV TASKS

## Owner: You (Contract/Rust Dev)
## Timeline: ~7-8 days of work

---

# PHASE 0: CLEANUP (Day 1 Morning)

## Task 0.1: Delete Token Contract
**Why:** It's orphaned, not integrated, adds confusion

1. Delete entire `contracts/token/` folder
2. Update `contracts/Cargo.toml` - remove "token" from members
3. Run `cargo build` to verify nothing breaks

---

## Task 0.2: Run Clippy & Fix Warnings
```bash
cd contracts
cargo clippy --all-targets
```
Fix any warnings. Clean code before adding features.

---

# PHASE 1: PARTIAL FUNDING (Day 1-2)

## Why This First
Without partial funding, only whales can invest. Multiple investors per invoice is core functionality.

## Task 1.1: Update Invoice Struct
**File:** `contracts/invoice/src/types.rs`

Add to `Invoice` struct:
```rust
pub tokens_sold: i128,      // How many tokens have been purchased
pub tokens_remaining: i128, // total_tokens - tokens_sold
```

---

## Task 1.2: Update mint_draft to Initialize New Fields
**File:** `contracts/invoice/src/lib.rs`

In `mint_draft()`, set:
- `tokens_sold: 0`
- `tokens_remaining: 0` (will be set when verified)

---

## Task 1.3: Update approve_invoice to Set Token Fields
**File:** `contracts/invoice/src/lib.rs`

In `approve_invoice()`, after minting tokens:
```rust
invoice.total_tokens = invoice.amount;
invoice.tokens_sold = 0;
invoice.tokens_remaining = invoice.amount;
```

---

## Task 1.4: Modify invest() for Partial Purchases
**File:** `contracts/invoice/src/lib.rs`

Current `invest()` buys all tokens. Change to:

```rust
pub fn invest(
    env: Env,
    invoice_id: String,
    investor: Address,
    token_amount: i128,      // How many tokens to buy (can be partial)
    payment_amount: i128,
) -> Result<(), ContractError> {
    // ... existing checks ...
    
    // NEW: Check tokens available
    if token_amount > invoice.tokens_remaining {
        return Err(ContractError::InsufficientTokens);
    }
    
    // ... transfer payment ...
    
    // NEW: Update token counts
    invoice.tokens_sold += token_amount;
    invoice.tokens_remaining -= token_amount;
    
    // NEW: Only mark FUNDED when all tokens sold
    if invoice.tokens_remaining == 0 {
        invoice.status = InvoiceStatus::Funded;
    }
    
    // ... rest of function ...
}
```

---

## Task 1.5: Add View Function for Available Tokens
```rust
pub fn get_available_tokens(env: Env, invoice_id: String) -> Result<i128, ContractError> {
    let invoice = get_invoice(&env, &invoice_id)
        .ok_or(ContractError::InvoiceNotFound)?;
    Ok(invoice.tokens_remaining)
}
```

---

## Task 1.6: Update Tests for Partial Funding
**File:** `contracts/invoice/src/test.rs`

Add test:
```rust
#[test]
fn test_partial_funding_multiple_investors() {
    // Setup
    // Investor A buys 30%
    // Investor B buys 50%
    // Investor C buys 20%
    // Assert: All have correct holdings
    // Assert: Invoice status is FUNDED only after 100%
}
```

---

# PHASE 2: DUTCH AUCTION (Day 2-3)

## Why
Price discovery. Investors bid by accepting current price. Price drops over time until someone buys.

## Task 2.1: Add Auction Fields to Invoice Struct
**File:** `contracts/invoice/src/types.rs`

```rust
pub struct Invoice {
    // ... existing fields ...
    
    // Auction fields
    pub auction_start: u64,       // Unix timestamp when auction starts
    pub auction_end: u64,         // Unix timestamp when auction ends
    pub start_price: i128,        // Starting price (usually = amount, 0% discount)
    pub min_price: i128,          // Minimum price supplier accepts (max discount)
    pub price_drop_rate: u32,     // Basis points drop per hour (e.g., 50 = 0.5%/hour)
}
```

---

## Task 2.2: Add Auction Config to RateConfig
**File:** `contracts/invoice/src/types.rs`

```rust
pub struct RateConfig {
    // ... existing ...
    pub default_auction_duration: u64,  // Default: 7 days in seconds
    pub default_price_drop_rate: u32,   // Default: 50 basis points/hour
    pub default_max_discount: u32,      // Default: 1500 (15% max discount)
}
```

---

## Task 2.3: Create start_auction Function
**File:** `contracts/invoice/src/lib.rs`

```rust
/// Start auction for a verified invoice (only supplier can call)
pub fn start_auction(
    env: Env,
    invoice_id: String,
    supplier: Address,
    duration_hours: u64,        // How long auction runs
    max_discount_bps: u32,      // Max discount in basis points (1000 = 10%)
) -> Result<(), ContractError> {
    supplier.require_auth();
    
    let mut invoice = get_invoice(&env, &invoice_id)?;
    
    // Must be verified and supplier must own it
    if invoice.status != InvoiceStatus::Verified { return Err(...) }
    if invoice.supplier != supplier { return Err(Unauthorized) }
    
    let now = env.ledger().timestamp();
    let rate_config = get_rate_config(&env);
    
    invoice.auction_start = now;
    invoice.auction_end = now + (duration_hours * 3600);
    invoice.start_price = invoice.amount;  // Face value
    invoice.min_price = invoice.amount - (invoice.amount * max_discount_bps as i128 / 10000);
    invoice.price_drop_rate = rate_config.default_price_drop_rate;
    invoice.status = InvoiceStatus::Funding;  // New status for active auction
    
    set_invoice(&env, &invoice_id, &invoice);
    
    // Emit event
    InvoiceEvents::auction_started(&env, &invoice_id, invoice.auction_end);
    
    Ok(())
}
```

---

## Task 2.4: Create get_current_price Function
```rust
/// Calculate current auction price based on time elapsed
pub fn get_current_price(env: Env, invoice_id: String) -> Result<i128, ContractError> {
    let invoice = get_invoice(&env, &invoice_id)?;
    
    if invoice.auction_start == 0 {
        return Err(ContractError::AuctionNotStarted);
    }
    
    let now = env.ledger().timestamp();
    
    // If auction ended, return min price
    if now >= invoice.auction_end {
        return Ok(invoice.min_price);
    }
    
    // Calculate hours elapsed
    let hours_elapsed = (now - invoice.auction_start) / 3600;
    
    // Calculate price drop
    // drop = start_price * rate * hours / 10000
    let total_drop = (invoice.start_price * invoice.price_drop_rate as i128 * hours_elapsed as i128) / 10000;
    
    let current_price = invoice.start_price - total_drop;
    
    // Don't go below min price
    Ok(current_price.max(invoice.min_price))
}
```

---

## Task 2.5: Modify invest() to Use Auction Price
```rust
pub fn invest_at_auction(
    env: Env,
    invoice_id: String,
    investor: Address,
    token_amount: i128,
) -> Result<(), ContractError> {
    investor.require_auth();
    
    // KYC check
    if !get_kyc_status(&env, &investor) {
        return Err(ContractError::KYCRequired);
    }
    
    let invoice = get_invoice(&env, &invoice_id)?;
    
    // Must be in auction
    if invoice.status != InvoiceStatus::Funding {
        return Err(ContractError::AuctionNotActive);
    }
    
    // Get current price
    let current_price = Self::get_current_price(env.clone(), invoice_id.clone())?;
    
    // Calculate payment for requested tokens
    // payment = (token_amount / total_tokens) * current_price
    let payment_amount = (token_amount * current_price) / invoice.total_tokens;
    
    // ... rest of invest logic (transfer, update holdings, etc.) ...
}
```

---

## Task 2.6: Add New Invoice Status
**File:** `contracts/invoice/src/types.rs`

```rust
pub enum InvoiceStatus {
    Draft,
    Verified,
    Funding,    // NEW: Auction is active
    Funded,
    // ... rest ...
}
```

---

## Task 2.7: Add Auction Events
**File:** `contracts/invoice/src/events.rs`

```rust
pub fn auction_started(env: &Env, invoice_id: &String, end_time: u64) {
    env.events().publish(
        (symbol_short!("AUCTION"), invoice_id.clone()),
        end_time,
    );
}

pub fn auction_ended(env: &Env, invoice_id: &String, final_price: i128) {
    env.events().publish(
        (symbol_short!("AUCTEND"), invoice_id.clone()),
        final_price,
    );
}
```

---

## Task 2.8: Write Auction Tests
```rust
#[test]
fn test_auction_price_drops_over_time() {
    // Create invoice, verify, start auction
    // Check price at hour 0 = face value
    // Fast forward 10 hours
    // Check price has dropped correctly
    // Fast forward past end
    // Check price = min_price
}

#[test]
fn test_invest_at_auction_price() {
    // Start auction
    // Fast forward 5 hours
    // Investor buys at current price
    // Assert: Paid discounted amount
    // Assert: Got correct tokens
}
```

---

# PHASE 3: INSURANCE POOL (Day 4)

## Why
Investors need protection against defaults. Small % of each investment goes to pool, covers losses.

## Task 3.1: Add Insurance Storage
**File:** `contracts/invoice/src/storage.rs`

```rust
pub enum DataKey {
    // ... existing ...
    InsurancePool,              // i128 - total pool balance
    InsuranceCut,               // u32 - basis points taken from investments (500 = 5%)
}

pub fn get_insurance_pool(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::InsurancePool).unwrap_or(0)
}

pub fn add_to_insurance_pool(env: &Env, amount: i128) {
    let current = get_insurance_pool(env);
    env.storage().instance().set(&DataKey::InsurancePool, &(current + amount));
}

pub fn withdraw_from_insurance_pool(env: &Env, amount: i128) -> Result<(), ContractError> {
    let current = get_insurance_pool(env);
    if current < amount {
        return Err(ContractError::InsufficientInsurancePool);
    }
    env.storage().instance().set(&DataKey::InsurancePool, &(current - amount));
    Ok(())
}
```

---

## Task 3.2: Add Insurance Cut to Initialize
**File:** `contracts/invoice/src/lib.rs`

Update `initialize()` to accept insurance cut parameter:
```rust
pub fn initialize(
    env: Env,
    admin: Address,
    usdc_token: Address,
    base_interest_rate: u32,
    penalty_rate: u32,
    grace_period_days: u32,
    insurance_cut_bps: u32,     // NEW: e.g., 500 = 5%
) -> Result<(), ContractError> {
    // ... existing ...
    storage::set_insurance_cut(&env, insurance_cut_bps);
    Ok(())
}
```

---

## Task 3.3: Modify invest_at_auction to Take Insurance Cut
```rust
pub fn invest_at_auction(...) -> Result<(), ContractError> {
    // ... calculate payment_amount ...
    
    // Calculate insurance cut
    let insurance_cut_bps = storage::get_insurance_cut(&env);
    let insurance_amount = (payment_amount * insurance_cut_bps as i128) / 10000;
    let supplier_payment = payment_amount - insurance_amount;
    
    // Transfer from investor
    token_client.transfer(&investor, &env.current_contract_address(), &payment_amount);
    
    // Pay supplier (minus insurance cut)
    token_client.transfer(&env.current_contract_address(), &supplier, &supplier_payment);
    
    // Add to insurance pool
    storage::add_to_insurance_pool(&env, insurance_amount);
    
    // ... rest ...
}
```

---

## Task 3.4: Create claim_insurance Function
```rust
/// Claim insurance payout for defaulted invoice
pub fn claim_insurance(
    env: Env,
    invoice_id: String,
    investor: Address,
) -> Result<i128, ContractError> {
    investor.require_auth();
    
    let invoice = get_invoice(&env, &invoice_id)?;
    
    // Must be defaulted
    if invoice.status != InvoiceStatus::Defaulted {
        return Err(ContractError::NotDefaulted);
    }
    
    // Get investor's holding
    let holding = storage::get_token_holding(&env, &invoice_id, &investor)
        .ok_or(ContractError::HoldingNotFound)?;
    
    // Calculate claim: 50% of investment value
    let claim_amount = holding.acquired_price / 2;
    
    // Check pool has enough
    let pool_balance = storage::get_insurance_pool(&env);
    let actual_payout = claim_amount.min(pool_balance);
    
    if actual_payout == 0 {
        return Err(ContractError::InsufficientInsurancePool);
    }
    
    // Pay out
    storage::withdraw_from_insurance_pool(&env, actual_payout)?;
    let usdc = storage::get_usdc_token(&env);
    TokenClient::new(&env, &usdc).transfer(
        &env.current_contract_address(),
        &investor,
        &actual_payout
    );
    
    // Mark holding as claimed (burn tokens)
    storage::remove_token_holding(&env, &invoice_id, &investor);
    
    // Emit event
    InvoiceEvents::insurance_claimed(&env, &invoice_id, &investor, actual_payout);
    
    Ok(actual_payout)
}
```

---

## Task 3.5: Add View Function for Pool Balance
```rust
pub fn get_insurance_pool_balance(env: Env) -> i128 {
    storage::get_insurance_pool(&env)
}
```

---

## Task 3.6: Add New Error Types
**File:** `contracts/invoice/src/errors.rs`

```rust
pub enum ContractError {
    // ... existing ...
    InsufficientInsurancePool = 13,
    NotDefaulted = 14,
    AlreadyClaimed = 15,
}
```

---

## Task 3.7: Write Insurance Tests
```rust
#[test]
fn test_insurance_cut_taken_on_invest() {
    // Invest 100,000
    // Assert: Supplier got 95,000
    // Assert: Pool got 5,000
}

#[test]
fn test_claim_insurance_on_default() {
    // Create, verify, fund invoice
    // Fast forward past grace period
    // Call check_status (marks as defaulted)
    // Investor claims insurance
    // Assert: Got 50% back
    // Assert: Pool reduced
}
```

---

# PHASE 4: SECONDARY MARKET / ORDER BOOK (Day 5-6)

## Why
Investors need liquidity. Can't wait 90 days for settlement. Sell tokens to other investors.

## Task 4.1: Add SellOrder Struct
**File:** `contracts/invoice/src/types.rs`

```rust
#[derive(Clone, Debug)]
#[contracttype]
pub struct SellOrder {
    pub id: String,
    pub invoice_id: String,
    pub seller: Address,
    pub token_amount: i128,
    pub price_per_token: i128,  // In USDC stroops
    pub tokens_remaining: i128, // For partial fills
    pub created_at: u64,
    pub status: OrderStatus,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum OrderStatus {
    Open,
    PartiallyFilled,
    Filled,
    Cancelled,
}
```

---

## Task 4.2: Add Order Storage
**File:** `contracts/invoice/src/storage.rs`

```rust
pub enum DataKey {
    // ... existing ...
    SellOrder(String),                    // order_id -> SellOrder
    OrdersByInvoice(String),              // invoice_id -> Vec<String> (order IDs)
    OrderCounter,                         // u32 for generating order IDs
}

pub fn get_sell_order(env: &Env, order_id: &String) -> Option<SellOrder>
pub fn set_sell_order(env: &Env, order_id: &String, order: &SellOrder)
pub fn remove_sell_order(env: &Env, order_id: &String)
pub fn get_orders_for_invoice(env: &Env, invoice_id: &String) -> Vec<String>
pub fn add_order_to_invoice(env: &Env, invoice_id: &String, order_id: &String)
```

---

## Task 4.3: Create create_sell_order Function
```rust
/// Create a sell order for invoice tokens
pub fn create_sell_order(
    env: Env,
    invoice_id: String,
    seller: Address,
    token_amount: i128,
    price_per_token: i128,
) -> Result<String, ContractError> {
    seller.require_auth();
    
    // Verify seller has enough tokens
    let holding = storage::get_token_holding(&env, &invoice_id, &seller)
        .ok_or(ContractError::HoldingNotFound)?;
    
    if holding.amount < token_amount {
        return Err(ContractError::InsufficientTokens);
    }
    
    // Generate order ID
    let order_id = Self::generate_order_id(&env);
    
    let order = SellOrder {
        id: order_id.clone(),
        invoice_id: invoice_id.clone(),
        seller: seller.clone(),
        token_amount,
        price_per_token,
        tokens_remaining: token_amount,
        created_at: env.ledger().timestamp(),
        status: OrderStatus::Open,
    };
    
    storage::set_sell_order(&env, &order_id, &order);
    storage::add_order_to_invoice(&env, &invoice_id, &order_id);
    
    // Emit event
    InvoiceEvents::order_created(&env, &order_id, &invoice_id, &seller, token_amount, price_per_token);
    
    Ok(order_id)
}
```

---

## Task 4.4: Create fill_order Function
```rust
/// Buy tokens from a sell order (full or partial)
pub fn fill_order(
    env: Env,
    order_id: String,
    buyer: Address,
    token_amount: i128,  // Can be less than order amount (partial fill)
) -> Result<(), ContractError> {
    buyer.require_auth();
    
    // KYC check for buyer
    if !get_kyc_status(&env, &buyer) {
        return Err(ContractError::KYCRequired);
    }
    
    let mut order = storage::get_sell_order(&env, &order_id)
        .ok_or(ContractError::OrderNotFound)?;
    
    if order.status != OrderStatus::Open && order.status != OrderStatus::PartiallyFilled {
        return Err(ContractError::OrderNotActive);
    }
    
    if token_amount > order.tokens_remaining {
        return Err(ContractError::InsufficientTokens);
    }
    
    // Calculate payment
    let payment = token_amount * order.price_per_token;
    
    // Transfer USDC: buyer -> seller
    let usdc = storage::get_usdc_token(&env);
    TokenClient::new(&env, &usdc).transfer(&buyer, &order.seller, &payment);
    
    // Transfer tokens: seller -> buyer
    Self::internal_transfer_tokens(&env, &order.invoice_id, &order.seller, &buyer, token_amount)?;
    
    // Update order
    order.tokens_remaining -= token_amount;
    if order.tokens_remaining == 0 {
        order.status = OrderStatus::Filled;
    } else {
        order.status = OrderStatus::PartiallyFilled;
    }
    storage::set_sell_order(&env, &order_id, &order);
    
    // Emit event
    InvoiceEvents::order_filled(&env, &order_id, &buyer, token_amount, payment);
    
    Ok(())
}
```

---

## Task 4.5: Create cancel_order Function
```rust
pub fn cancel_order(
    env: Env,
    order_id: String,
    seller: Address,
) -> Result<(), ContractError> {
    seller.require_auth();
    
    let mut order = storage::get_sell_order(&env, &order_id)
        .ok_or(ContractError::OrderNotFound)?;
    
    if order.seller != seller {
        return Err(ContractError::Unauthorized);
    }
    
    if order.status == OrderStatus::Filled {
        return Err(ContractError::OrderAlreadyFilled);
    }
    
    order.status = OrderStatus::Cancelled;
    storage::set_sell_order(&env, &order_id, &order);
    
    InvoiceEvents::order_cancelled(&env, &order_id);
    
    Ok(())
}
```

---

## Task 4.6: Create View Functions for Orders
```rust
pub fn get_order(env: Env, order_id: String) -> Result<SellOrder, ContractError>

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
```

---

## Task 4.7: Add Order Events
**File:** `contracts/invoice/src/events.rs`

```rust
pub fn order_created(env, order_id, invoice_id, seller, amount, price)
pub fn order_filled(env, order_id, buyer, amount, payment)
pub fn order_cancelled(env, order_id)
```

---

## Task 4.8: Add New Errors
```rust
OrderNotFound = 16,
OrderNotActive = 17,
OrderAlreadyFilled = 18,
```

---

## Task 4.9: Write Order Book Tests
```rust
#[test]
fn test_create_and_fill_order() {
    // Investor A has tokens
    // A creates sell order
    // Investor B fills order
    // Assert: B has tokens, A has USDC
}

#[test]
fn test_partial_fill() {
    // Create order for 100 tokens
    // Buy 30 tokens
    // Assert: Order status = PartiallyFilled
    // Assert: 70 tokens remaining
}

#[test]
fn test_cancel_order() {
    // Create order
    // Cancel order
    // Try to fill -> should fail
}
```

---

# PHASE 5: IPFS DOCUMENT HASH (Day 7)

## Why
Real invoices have PDF documents. Store hash on-chain for verification.

## Task 5.1: Add Document Hash to Invoice
**File:** `contracts/invoice/src/types.rs`

```rust
pub struct Invoice {
    // ... existing ...
    pub document_hash: String,  // IPFS CID
}
```

---

## Task 5.2: Update mint_draft to Accept Document Hash
```rust
pub fn mint_draft(
    env: Env,
    supplier: Address,
    buyer: Address,
    amount: i128,
    currency: String,
    due_date: u64,
    description: String,
    purchase_order: String,
    document_hash: String,      // NEW: IPFS CID
) -> Result<String, ContractError> {
    // ... existing ...
    
    let invoice = Invoice {
        // ... existing fields ...
        document_hash,
    };
    
    // ...
}
```

---

## Task 5.3: Add Document Verification View
```rust
/// Verify document hash matches on-chain record
pub fn verify_document(
    env: Env,
    invoice_id: String,
    document_hash: String,
) -> bool {
    if let Some(invoice) = get_invoice(&env, &invoice_id) {
        invoice.document_hash == document_hash
    } else {
        false
    }
}
```

---

# PHASE 6: META-TX SUPPORT (Day 7-8)

## Why
Buyers won't use crypto wallets. Backend signs on their behalf.

## Task 6.1: Add Relayer Authorization
The contract already accepts any valid signature. But we need to track authorized relayers.

**File:** `contracts/invoice/src/storage.rs`

```rust
pub enum DataKey {
    // ... existing ...
    AuthorizedRelayer(Address),  // bool - can submit meta-tx
}

pub fn is_authorized_relayer(env: &Env, addr: &Address) -> bool
pub fn set_authorized_relayer(env: &Env, addr: &Address, authorized: bool)
```

---

## Task 6.2: Add set_relayer Admin Function
```rust
/// Authorize a relayer address (only admin)
pub fn set_relayer(
    env: Env,
    admin: Address,
    relayer: Address,
    authorized: bool,
) -> Result<(), ContractError> {
    admin.require_auth();
    
    let stored_admin = get_admin(&env);
    if stored_admin != admin {
        return Err(ContractError::Unauthorized);
    }
    
    storage::set_authorized_relayer(&env, &relayer, authorized);
    
    Ok(())
}
```

---

## Task 6.3: Alternative - Custodial Approach (Simpler)
Instead of meta-tx, backend holds custodial keys for buyers.

**No contract changes needed!**

Backend:
1. Creates Stellar keypair for each buyer
2. Stores encrypted private key
3. Signs transactions on buyer's behalf
4. Submits normally

This is simpler and works with existing contract.

**Recommendation:** Go with custodial approach. No contract changes needed.

---

# PHASE 7: FINAL TESTING & DEPLOYMENT (Day 8)

## Task 7.1: Run Full Test Suite
```bash
cd contracts
cargo test
```

All tests must pass.

---

## Task 7.2: Build Optimized WASM
```bash
cargo build --target wasm32-unknown-unknown --release
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/sangini_invoice.wasm
```

---

## Task 7.3: Deploy to Testnet
```bash
# Deploy new contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/sangini_invoice.wasm \
  --source admin \
  --network testnet

# Initialize with new parameters
stellar contract invoke \
  --id <NEW_CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- \
  initialize \
  --admin <ADMIN_ADDRESS> \
  --usdc_token <USDC_ADDRESS> \
  --base_interest_rate 1000 \
  --penalty_rate 2400 \
  --grace_period_days 30 \
  --insurance_cut_bps 500
```

---

## Task 7.4: Update Frontend Config
Give new contract address to Full Stack dev to update `.env`

---

## Task 7.5: Test Full Flow on Testnet
1. Mint invoice with document hash
2. Approve invoice
3. Start auction
4. Invest (partial)
5. Create sell order
6. Fill order
7. Settle
8. Verify insurance pool has funds

---

# SUMMARY: CONTRACT CHANGES

| File | Changes |
|------|---------|
| `types.rs` | Add auction fields, SellOrder struct, OrderStatus enum |
| `storage.rs` | Add insurance pool, sell orders, order lists |
| `errors.rs` | Add new error types |
| `events.rs` | Add auction, order, insurance events |
| `lib.rs` | Add all new functions |
| `test.rs` | Add tests for all new features |

## New Functions to Add
- `start_auction()`
- `get_current_price()`
- `invest_at_auction()`
- `get_available_tokens()`
- `claim_insurance()`
- `get_insurance_pool_balance()`
- `create_sell_order()`
- `fill_order()`
- `cancel_order()`
- `get_order()`
- `get_open_orders()`
- `verify_document()`
- `set_relayer()` (optional)

## Modified Functions
- `initialize()` - add insurance_cut param
- `mint_draft()` - add document_hash param
- `approve_invoice()` - set tokens_remaining
- `invest()` → `invest_at_auction()` - auction price + partial + insurance

---

# DEPENDENCIES ON OTHER TEAM MEMBERS

| Your Task | Blocked By | Blocks |
|-----------|------------|--------|
| All contract work | Nothing | Full Stack needs contract address |
| Deploy to testnet | Contract complete | Frontend can test |
| Document hash | Full Stack IPFS upload | - |

You can work independently. Just deploy and share contract address when ready.
