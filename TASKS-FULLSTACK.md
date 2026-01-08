# FULL STACK DEV TASKS

## Owner: Full Stack Developer
## Timeline: ~8-10 days of work

---

# PHASE 0: CLEANUP (Day 1 Morning)

## Task 0.1: Create Environment Variables
**New Files:** `.env.local`, `.env.example`

Create `.env.example` with all config:
```env
# Network
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Contracts (get from Contract Dev after deploy)
NEXT_PUBLIC_INVOICE_CONTRACT=

# Database
DATABASE_URL="file:./dev.db"

# Auth
NEXTAUTH_SECRET=generate-random-secret
NEXTAUTH_URL=http://localhost:3000

# Relayer (for meta-tx)
RELAYER_SECRET_KEY=S...
RELAYER_PUBLIC_KEY=G...

# IPFS
PINATA_API_KEY=
PINATA_SECRET_KEY=

# Encryption (for custodial wallets)
WALLET_ENCRYPTION_KEY=generate-32-byte-key
```

---

## Task 0.2: Update Config to Use Env Vars
**File:** `src/lib/contracts/config.ts`

Replace all hardcoded values with `process.env.NEXT_PUBLIC_*`

Delete `TEST_ACCOUNTS` entirely.

---

# PHASE 1: DATABASE SETUP (Day 1)

## Task 1.1: Initialize Prisma
```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider sqlite
```

---

## Task 1.2: Create Database Schema
**File:** `prisma/schema.prisma`

Models needed:
- `User` - email, walletAddress, custodialKeys (encrypted), userType, kycStatus
- `Invoice` - mirrors on-chain data, cached for fast queries
- `Investment` - who invested how much in which invoice
- `SellOrder` - secondary market orders
- `InsurancePool` - track pool balance
- `InsuranceClaim` - claim records

Key relationships:
- User has many Invoices (as supplier)
- User has many Invoices (as buyer)
- User has many Investments
- Invoice has many Investments
- Invoice has many SellOrders

---

## Task 1.3: Create Prisma Client
**File:** `src/lib/db.ts`

Standard Prisma singleton pattern for Next.js.

---

## Task 1.4: Generate & Push Schema
```bash
npx prisma generate
npx prisma db push
```

---

# PHASE 2: AUTHENTICATION (Day 2-3)

## Task 2.1: Install Auth Dependencies
```bash
npm install next-auth @auth/prisma-adapter
npm install bcryptjs
npm install -D @types/bcryptjs
```

---

## Task 2.2: Create NextAuth Config
**File:** `src/lib/auth.ts` or `src/app/api/auth/[...nextauth]/route.ts`

Two auth methods:

**1. Wallet Auth (for Suppliers/Investors)**
- User signs message with Freighter
- Backend verifies signature
- Creates/returns session

**2. Email Auth (for Buyers)**
- Email + password
- Standard credentials provider
- Creates custodial wallet on signup

Config structure:
```typescript
// Providers:
// 1. CredentialsProvider for email/password
// 2. Custom provider for wallet signature

// Callbacks:
// - jwt: Add userId, userType to token
// - session: Expose userId, userType, walletAddress

// Events:
// - createUser: Generate custodial wallet for buyers
```

---

## Task 2.3: Create Wallet Auth API
**File:** `src/app/api/auth/wallet/route.ts`

Flow:
1. Frontend requests nonce for wallet address
2. Backend generates & stores nonce
3. Frontend signs nonce with Freighter
4. Backend verifies signature
5. Backend creates/finds user, returns session

Endpoints:
- `POST /api/auth/wallet/nonce` - Get nonce to sign
- `POST /api/auth/wallet/verify` - Verify signature, get session

---

## Task 2.4: Create User Registration API
**File:** `src/app/api/auth/register/route.ts`

For email-based buyers:
1. Validate email, password
2. Hash password
3. Generate custodial Stellar keypair
4. Encrypt private key with `WALLET_ENCRYPTION_KEY`
5. Store user with encrypted custodial keys
6. Return success

---

## Task 2.5: Create Custodial Wallet Utils
**File:** `src/lib/custodial.ts`

Functions:
- `generateCustodialWallet()` - Create new Stellar keypair
- `encryptPrivateKey(secret, encryptionKey)` - AES encrypt
- `decryptPrivateKey(encrypted, encryptionKey)` - AES decrypt
- `signWithCustodialWallet(userId, transaction)` - Decrypt key, sign tx

Use `crypto` module for encryption (AES-256-GCM).

---

## Task 2.6: Create Auth Middleware
**File:** `src/lib/auth-middleware.ts`

Helper to protect API routes:
```typescript
export async function requireAuth(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function requireUserType(request: Request, types: UserType[]) {
  const session = await requireAuth(request);
  if (!types.includes(session.user.userType)) {
    throw new Error('Forbidden');
  }
  return session;
}
```

---

# PHASE 3: META-TX RELAYER (Day 3-4)

## Why
Buyers don't have wallets. Backend signs transactions for them using custodial keys.

## Task 3.1: Create Relayer Wallet Setup
**File:** `src/lib/relayer.ts`

The relayer wallet pays gas fees. Needs to be funded.

```typescript
// Load relayer keypair from env
// Functions:
// - getRelayerKeypair()
// - getRelayerBalance() - Check XLM balance
// - fundRelayerIfNeeded() - Alert if low
```

---

## Task 3.2: Create Transaction Builder Utils
**File:** `src/lib/stellar/transaction.ts`

Functions to build Soroban transactions:
- `buildInvoiceApprovalTx(invoiceId, buyerAddress)` - Build approve_invoice call
- `buildSettlementTx(invoiceId, buyerAddress, amount)` - Build settle call
- `submitTransaction(signedTx)` - Submit to network, wait for result

---

## Task 3.3: Create Meta-TX API for Buyer Actions
**File:** `src/app/api/invoices/[id]/approve/route.ts`

Flow:
1. Verify user is authenticated buyer
2. Verify user is the buyer for this invoice
3. Get user's custodial private key (decrypt)
4. Build approve_invoice transaction
5. Sign with custodial key
6. Submit to network
7. Update DB cache
8. Return result

```typescript
export async function POST(request: Request, { params }) {
  const session = await requireUserType(request, ['BUYER']);
  const invoiceId = params.id;
  
  // Verify this user is the buyer
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }});
  if (invoice.buyerId !== session.user.id) {
    return Response.json({ error: 'Not your invoice' }, { status: 403 });
  }
  
  // Get custodial wallet
  const user = await prisma.user.findUnique({ where: { id: session.user.id }});
  const privateKey = decryptPrivateKey(user.custodialSecret, process.env.WALLET_ENCRYPTION_KEY);
  
  // Build and sign transaction
  const tx = await buildInvoiceApprovalTx(invoiceId, user.custodialPubKey);
  const keypair = Keypair.fromSecret(privateKey);
  tx.sign(keypair);
  
  // Submit
  const result = await submitTransaction(tx);
  
  // Update DB
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'VERIFIED', verifiedAt: new Date(), verifyTxHash: result.hash }
  });
  
  return Response.json({ success: true, txHash: result.hash });
}
```

---

## Task 3.4: Create Settlement API
**File:** `src/app/api/invoices/[id]/settle/route.ts`

Same pattern as approve:
1. Auth check
2. Build settle transaction
3. Sign with custodial key
4. Submit
5. Update DB

---

## Task 3.5: Fund Custodial Wallets on Creation
When creating a buyer account, their custodial wallet needs minimum XLM for account activation.

Options:
1. Relayer funds each new custodial wallet with 1 XLM
2. Use sponsored reserves (more complex)

Go with option 1 for simplicity.

In registration flow, after creating custodial keypair:
```typescript
// Fund new account from relayer
await fundAccount(custodialPublicKey, '1'); // 1 XLM minimum
```

---

# PHASE 4: INVOICE APIs (Day 4-5)

## Task 4.1: Create Invoice List API
**File:** `src/app/api/invoices/route.ts`

`GET /api/invoices` - List invoices with filters

Query params:
- `status` - Filter by status
- `role` - 'supplier' | 'buyer' | 'investor' - Filter by user's role
- `page`, `limit` - Pagination

Returns invoices from DB (cached), not chain.

---

## Task 4.2: Create Invoice Detail API
**File:** `src/app/api/invoices/[id]/route.ts`

`GET /api/invoices/:id` - Get single invoice with all details

Include:
- Invoice data
- Auction status & current price
- Token holders
- Open sell orders
- Investment history

---

## Task 4.3: Create Invoice Mint API
**File:** `src/app/api/invoices/route.ts`

`POST /api/invoices` - Create new invoice

For suppliers (have real wallets):
1. Validate input
2. Return transaction XDR for frontend to sign
3. Frontend signs with Freighter
4. Frontend submits
5. Frontend calls `POST /api/invoices/confirm` with txHash

For tracking:
```typescript
// After successful mint, save to DB
await prisma.invoice.create({
  data: {
    id: invoiceIdFromChain,
    supplierId: session.user.id,
    buyerId: buyerUserId, // Look up by wallet address
    amount: BigInt(amount),
    // ... rest
    createTxHash: txHash,
  }
});
```

---

## Task 4.4: Create Start Auction API
**File:** `src/app/api/invoices/[id]/auction/route.ts`

`POST /api/invoices/:id/auction` - Start auction

Body: `{ durationHours: 168, maxDiscountBps: 1500 }`

Returns XDR for supplier to sign.

---

## Task 4.5: Create Investment API
**File:** `src/app/api/invoices/[id]/invest/route.ts`

`POST /api/invoices/:id/invest` - Invest in invoice

Body: `{ tokenAmount: 1000000 }`

For investors (have real wallets):
1. Calculate current auction price
2. Return XDR for frontend to sign
3. After success, update DB

---

## Task 4.6: Create Invoice Sync Job
**File:** `src/lib/sync.ts`

Background job to sync DB with chain:
- Fetch recent contract events from Horizon
- Update invoice statuses
- Update token holdings
- Run periodically (cron) or on-demand

For MVP, can skip this and just update DB on each action.

---

# PHASE 5: SECONDARY MARKET APIs (Day 5-6)

## Task 5.1: Create Order List API
**File:** `src/app/api/orders/route.ts`

`GET /api/orders` - List orders

Query params:
- `invoiceId` - Filter by invoice
- `status` - 'open' | 'filled' | 'cancelled'
- `sellerId` - Filter by seller

---

## Task 5.2: Create Order API
**File:** `src/app/api/orders/route.ts`

`POST /api/orders` - Create sell order

Body: `{ invoiceId, tokenAmount, pricePerToken }`

Returns XDR for seller to sign.

After success, save to DB:
```typescript
await prisma.sellOrder.create({
  data: {
    id: orderIdFromChain,
    invoiceId,
    sellerId: session.user.id,
    tokenAmount: BigInt(tokenAmount),
    pricePerToken: BigInt(pricePerToken),
    status: 'OPEN',
  }
});
```

---

## Task 5.3: Create Fill Order API
**File:** `src/app/api/orders/[id]/fill/route.ts`

`POST /api/orders/:id/fill` - Fill (buy from) order

Body: `{ tokenAmount }` (can be partial)

Returns XDR for buyer to sign.

---

## Task 5.4: Create Cancel Order API
**File:** `src/app/api/orders/[id]/cancel/route.ts`

`POST /api/orders/:id/cancel` - Cancel order

Only seller can cancel. Returns XDR to sign.

---

# PHASE 6: IPFS UPLOAD (Day 6)

## Task 6.1: Install Pinata SDK
```bash
npm install @pinata/sdk
```

---

## Task 6.2: Create IPFS Upload API
**File:** `src/app/api/upload/route.ts`

`POST /api/upload` - Upload file to IPFS

Accept multipart form data with file.

```typescript
import pinataSDK from '@pinata/sdk';

const pinata = new pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_KEY
);

export async function POST(request: Request) {
  const session = await requireAuth(request);
  
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // Convert to buffer
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Upload to Pinata
  const result = await pinata.pinFileToIPFS(Readable.from(buffer), {
    pinataMetadata: { name: file.name }
  });
  
  return Response.json({
    cid: result.IpfsHash,
    url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`
  });
}
```

---

## Task 6.3: Create Document Verification API
**File:** `src/app/api/invoices/[id]/verify-document/route.ts`

`POST /api/invoices/:id/verify-document`

Body: `{ documentHash }`

Calls contract's `verify_document()` to check hash matches.

---

# PHASE 7: INSURANCE APIs (Day 7)

## Task 7.1: Create Insurance Pool API
**File:** `src/app/api/insurance/route.ts`

`GET /api/insurance` - Get pool balance

Calls contract's `get_insurance_pool_balance()`.

---

## Task 7.2: Create Insurance Claim API
**File:** `src/app/api/insurance/claim/route.ts`

`POST /api/insurance/claim`

Body: `{ invoiceId }`

For investors to claim insurance on defaulted invoices.

Returns XDR to sign.

---

# PHASE 8: KYC (Day 7-8)

## Option A: Simple Form (Quick)

## Task 8.1: Create KYC Submit API
**File:** `src/app/api/kyc/route.ts`

`POST /api/kyc` - Submit KYC data

Body: `{ fullName, country, accreditedInvestor: boolean }`

Store in user record, auto-approve (for demo).

Then call contract's `set_investor_kyc()` from admin wallet.

---

## Option B: World ID (Better)

## Task 8.2: Install World ID SDK
```bash
npm install @worldcoin/idkit
```

---

## Task 8.3: Create World ID Verification API
**File:** `src/app/api/kyc/worldid/route.ts`

`POST /api/kyc/worldid` - Verify World ID proof

Body: World ID proof object from frontend

1. Verify proof with World ID API
2. If valid, update user KYC status
3. Call contract's `set_investor_kyc()` from admin wallet

---

# PHASE 9: FINAL INTEGRATION (Day 8-9)

## Task 9.1: Create Dashboard Stats API
**File:** `src/app/api/stats/route.ts`

`GET /api/stats` - Dashboard statistics

Returns:
- Total invoices by status
- Total volume
- User's portfolio value
- Insurance pool balance

---

## Task 9.2: Create Transaction History API
**File:** `src/app/api/transactions/route.ts`

`GET /api/transactions` - User's transaction history

Query Horizon for user's transactions, filter by contract.

---

## Task 9.3: Error Handling Middleware
**File:** `src/lib/api-error.ts`

Consistent error responses:
```typescript
export class APIError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export function handleAPIError(error: unknown) {
  if (error instanceof APIError) {
    return Response.json({ error: error.message }, { status: error.statusCode });
  }
  console.error(error);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}
```

Wrap all API routes in try/catch with this handler.

---

## Task 9.4: Rate Limiting
**File:** `src/lib/rate-limit.ts`

Simple in-memory rate limiting for APIs:
- 100 requests/minute for authenticated users
- 20 requests/minute for unauthenticated

Use `lru-cache` or similar.

---

# API SUMMARY

## Auth APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Email registration (buyers) |
| POST | `/api/auth/wallet/nonce` | Get nonce for wallet auth |
| POST | `/api/auth/wallet/verify` | Verify wallet signature |
| GET | `/api/auth/session` | Get current session |

## Invoice APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices |
| POST | `/api/invoices` | Create invoice (returns XDR) |
| GET | `/api/invoices/:id` | Get invoice details |
| POST | `/api/invoices/:id/approve` | Approve invoice (meta-tx for buyers) |
| POST | `/api/invoices/:id/auction` | Start auction |
| POST | `/api/invoices/:id/invest` | Invest in invoice |
| POST | `/api/invoices/:id/settle` | Settle invoice (meta-tx for buyers) |

## Order APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create sell order |
| POST | `/api/orders/:id/fill` | Fill order |
| POST | `/api/orders/:id/cancel` | Cancel order |

## Other APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload to IPFS |
| GET | `/api/insurance` | Get pool balance |
| POST | `/api/insurance/claim` | Claim insurance |
| POST | `/api/kyc` | Submit KYC |
| GET | `/api/stats` | Dashboard stats |

---

# DEPENDENCIES

| Your Task | Needs From | Provides To |
|-----------|------------|-------------|
| DB Schema | Nothing | Frontend needs types |
| Auth | Nothing | All APIs need auth |
| Invoice APIs | Contract address | Frontend |
| Meta-tx | Contract deployed | Buyer flows |
| IPFS | Pinata account | Frontend upload |

---

# TECH STACK

- **Framework:** Next.js 16 API Routes
- **Database:** Prisma + SQLite (upgrade to Postgres for prod)
- **Auth:** NextAuth.js
- **Blockchain:** @stellar/stellar-sdk
- **IPFS:** Pinata
- **Encryption:** Node crypto (AES-256-GCM)

---

# COORDINATION WITH TEAM

1. **Day 1:** Get contract address from Contract Dev after deploy
2. **Day 2-3:** Share auth endpoints with Frontend Dev
3. **Day 4:** Share API types/interfaces with Frontend Dev
4. **Day 6:** Test full flow with Frontend Dev
5. **Day 8:** Integration testing with everyone
