# Sangini Smart Contracts

Soroban smart contracts for the MSME Invoice Financing Marketplace on Stellar.

## Contracts

### 1. Invoice Contract (`contracts/invoice`)

The core contract managing the complete lifecycle of tokenized invoices.

#### Key Functions

| Function | Caller | Description |
|----------|--------|-------------|
| `mint_draft()` | Supplier | Create a new invoice draft |
| `approve_invoice()` | Buyer | Cryptographically approve the invoice (Digital Handshake) |
| `transfer_tokens()` | Token Holder | Transfer tokens to sub-vendors |
| `invest()` | Investor (KYC) | Purchase tokens at a discount |
| `settle()` | Buyer | Pay the invoice, distribute funds |
| `check_status()` | Anyone | Auto-update status to OVERDUE/DEFAULTED |
| `raise_dispute()` | Buyer | Freeze the invoice for dispute |
| `resolve_dispute()` | Admin | Resolve dispute (clawback if valid) |
| `revoke()` | Supplier | Revoke stale invoices |
| `set_investor_kyc()` | Admin | Approve/revoke investor KYC |

#### Invoice States

```
DRAFT → VERIFIED → FUNDED → SETTLED
                      ↓
                   OVERDUE → DEFAULTED
                      ↓
                  DISPUTED
                      
DRAFT → REVOKED (supplier can revoke draft)
VERIFIED → REVOKED (if stale and past due)
```

### 2. Token Contract (`contracts/token`)

Custom Soroban token with:
- **AUTHORIZATION_REQUIRED**: Investors must be KYC-approved to hold tokens
- **CLAWBACK**: Admin can burn tokens during dispute resolution
- SEP-41 compliant interface

#### Key Functions

| Function | Description |
|----------|-------------|
| `set_authorized()` | Set KYC/authorization status for an address |
| `clawback()` | Burn tokens from an address (disputes) |
| `transfer()` | Transfer tokens (requires both parties authorized) |

## Building

### Prerequisites

1. Install Rust: https://rustup.rs
2. Install Soroban CLI:
   ```bash
   cargo install --locked stellar-cli --features opt
   ```
3. Add WASM target:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

### Build Contracts

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

### Run Tests

```bash
cd contracts
cargo test
```

### Optimize WASM (for deployment)

```bash
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/sangini_invoice.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/sangini_token.wasm
```

## Deployment

### Testnet Deployment

```bash
# Configure Stellar CLI for testnet
stellar keys generate --global admin --network testnet

# Deploy invoice contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/sangini_invoice.wasm \
  --source admin \
  --network testnet

# Initialize contract
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- \
  initialize \
  --admin <ADMIN_ADDRESS> \
  --usdc_token <USDC_ADDRESS> \
  --base_interest_rate 1000 \
  --penalty_rate 2400 \
  --grace_period_days 30
```

## Rate Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `base_interest_rate` | 1000 (10%) | Annual interest rate in basis points |
| `penalty_rate` | 2400 (24%) | Penalty rate after due date |
| `grace_period_days` | 30 | Days after due date before DEFAULTED |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Invoice Contract                          │
├─────────────────────────────────────────────────────────────────┤
│  Storage                                                         │
│  ├── Invoices (id → Invoice)                                    │
│  ├── Token Holdings (invoice_id + holder → TokenHolding)        │
│  ├── Disputes (invoice_id → Dispute)                            │
│  ├── KYC Status (address → bool)                                │
│  └── Rate Config (singleton)                                     │
├─────────────────────────────────────────────────────────────────┤
│  Events                                                          │
│  ├── CREATED, VERIFIED, FUNDED, SETTLED, DEFAULT                │
│  ├── TRANSFER, INVESTED, PAYOUT                                 │
│  ├── DISPUTE, RESOLVED, CLAWBACK                                │
│  └── KYC                                                         │
└─────────────────────────────────────────────────────────────────┘
              │
              │ Uses USDC for settlements
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Stellar Asset (USDC)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Demo Scenario

1. **Supplier** creates invoice: ₹10L to Maruti, 90 days
2. **Buyer (Maruti)** approves → Tokens minted to Supplier
3. **Supplier** transfers 30% tokens to Sub-Vendor
4. **Admin** approves Investor KYC
5. **Investor** purchases tokens at 2% discount
6. Day 90: **Buyer** settles → Funds distributed pro-rata

### Edge Cases

- **Overdue**: Status auto-updates after due date, penalty rate kicks in
- **Default**: After grace period, marked as DEFAULTED
- **Dispute**: Buyer freezes invoice, Admin resolves, Clawback if valid
- **Revoke**: Supplier can revoke stale invoices
