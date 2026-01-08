# FRONTEND DEV TASKS

## Owner: Frontend Developer
## Timeline: ~7-8 days of work

---

# PHASE 0: CLEANUP (Day 1)

## Task 0.1: Remove Demo Mode from Store
**File:** `src/lib/store.ts`

Delete:
- `INITIAL_INVOICES` array
- `isDemoMode` state
- `demoRole` state  
- `setDemoRole` function

Change `invoices` initial state to empty array.

---

## Task 0.2: Delete Role Switcher
**File:** `src/components/dashboard/role-switcher.tsx`

Delete entire file.

---

## Task 0.3: Update Sidebar
**File:** `src/components/dashboard/sidebar.tsx`

- Remove RoleSwitcher import and component
- Remove demoRole usage
- Show routes based on actual user type from session
- Add user info display (email or wallet address)

---

## Task 0.4: Fix Dashboard Page
**File:** `src/app/dashboard/page.tsx`

- Remove demoRole references
- Show generic dashboard or role-specific based on session
- Add loading state while fetching data

---

## Task 0.5: Fix Hardcoded Values
**Files:** Various

- Fix hardcoded date in create page (use dynamic 90 days from now)
- Remove hardcoded buyer address
- Remove TEST_ACCOUNTS references

---

## Task 0.6: Fix Reject Button
**File:** `src/app/dashboard/requests/page.tsx`

Add onClick handler that calls API to reject invoice.

---

## Task 0.7: Add Mobile Sidebar
**File:** `src/components/dashboard/sidebar.tsx`

Currently hidden on mobile. Add:
- Hamburger menu button
- Slide-out drawer for mobile
- Use Radix Dialog or Sheet component

---

# PHASE 1: AUTH UI (Day 1-2)

## Task 1.1: Create Login Page
**File:** `src/app/login/page.tsx`

Two login options:

**Tab 1: Wallet Login (Suppliers/Investors)**
- "Connect Wallet" button
- On click: Request nonce from API → Sign with Freighter → Verify → Redirect to dashboard

**Tab 2: Email Login (Buyers)**
- Email + Password form
- Submit to NextAuth credentials
- Redirect to dashboard

Use Tabs component from shadcn/ui.

---

## Task 1.2: Create Register Page
**File:** `src/app/register/page.tsx`

For buyers only (suppliers/investors just connect wallet):
- Email
- Password
- Confirm Password
- Company Name (optional)
- Submit → Create account → Auto login → Redirect

---

## Task 1.3: Update Wallet Connect Component
**File:** `src/components/dashboard/wallet-connect.tsx`

Current: Just connects Freighter
New: 
- If not logged in → Show "Login" button → Go to /login
- If logged in with wallet → Show connected state
- If logged in with email → Show email + custodial wallet indicator

---

## Task 1.4: Create Auth Context/Hook
**File:** `src/hooks/useAuth.ts`

Wrapper around NextAuth's useSession:
```typescript
export function useAuth() {
  const { data: session, status } = useSession();
  
  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    userType: session?.user?.userType,
    walletAddress: session?.user?.walletAddress,
  };
}
```

---

## Task 1.5: Create Protected Route Wrapper
**File:** `src/components/auth/protected-route.tsx`

```typescript
export function ProtectedRoute({ children, allowedTypes }) {
  const { isAuthenticated, isLoading, userType } = useAuth();
  const router = useRouter();
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }
  if (allowedTypes && !allowedTypes.includes(userType)) {
    return <AccessDenied />;
  }
  
  return children;
}
```

---

## Task 1.6: Add Auth to Dashboard Layout
**File:** `src/app/dashboard/layout.tsx`

Wrap with SessionProvider and ProtectedRoute.

---

# PHASE 2: INVOICE FLOWS (Day 2-3)

## Task 2.1: Update Invoice List to Fetch from API
**File:** `src/lib/store.ts` or new hook

Replace mock data with API call:
```typescript
// New hook: src/hooks/useInvoices.ts
export function useInvoices(filters) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`/api/invoices?${new URLSearchParams(filters)}`)
      .then(res => res.json())
      .then(data => {
        setInvoices(data.invoices);
        setLoading(false);
      });
  }, [filters]);
  
  return { invoices, loading };
}
```

---

## Task 2.2: Create Invoice Detail Page
**File:** `src/app/dashboard/invoices/[id]/page.tsx`

New page showing:
- Invoice details (amount, dates, status, parties)
- Document viewer (if has IPFS hash)
- Auction status (if active) with current price
- Token holders list
- Investment history
- Action buttons based on status and user role

---

## Task 2.3: Update Create Invoice Page
**File:** `src/app/dashboard/create/page.tsx`

Add:
- Document upload field (calls /api/upload)
- Show uploaded document preview
- On submit: Call API → Get XDR → Sign with Freighter → Submit
- Show success with invoice ID and tx hash

---

## Task 2.4: Add Document Upload Component
**File:** `src/components/ui/file-upload.tsx`

- Drag & drop zone
- File type validation (PDF, images)
- Upload progress indicator
- Preview after upload
- Returns IPFS CID

---

## Task 2.5: Update Requests Page (Buyer Approvals)
**File:** `src/app/dashboard/requests/page.tsx`

- Fetch pending invoices from API (where user is buyer)
- Approve button calls `/api/invoices/:id/approve` (meta-tx, no wallet needed)
- Reject button calls reject API
- Show loading state during transaction
- Show success/error toast

Key difference: Buyers don't sign with Freighter. API handles it.

---

## Task 2.6: Create Invoice Document Viewer
**File:** `src/components/invoice/document-viewer.tsx`

- Takes IPFS CID as prop
- Loads from Pinata gateway
- PDF viewer or image display
- "Verify on Chain" button to check hash matches

---

# PHASE 3: AUCTION UI (Day 3-4)

## Task 3.1: Create Auction Card Component
**File:** `src/components/invoice/auction-card.tsx`

Shows:
- Current price (updates in real-time or on refresh)
- Time remaining
- Price drop rate
- Min price (max discount)
- "Invest" button

Visual:
- Progress bar showing price drop
- Countdown timer
- Price in large text

---

## Task 3.2: Create Start Auction Modal
**File:** `src/components/invoice/start-auction-modal.tsx`

For suppliers to start auction on verified invoice:
- Duration selector (1 day, 3 days, 7 days, custom)
- Max discount slider (5%, 10%, 15%, 20%)
- Preview of price schedule
- Confirm button → Sign with Freighter

---

## Task 3.3: Update Marketplace Page
**File:** `src/app/dashboard/market/page.tsx`

Complete rewrite:
- Fetch invoices with status = FUNDING (auction active)
- Show auction cards in grid
- Filter by: discount range, time remaining, amount
- Sort by: discount, time remaining, amount
- Click card → Go to invoice detail page

---

## Task 3.4: Create Investment Modal
**File:** `src/components/invoice/invest-modal.tsx`

When investor clicks "Invest":
- Show current auction price
- Input for token amount (with max = available tokens)
- Calculate total cost
- Show estimated return at maturity
- Confirm → Sign with Freighter → Submit

---

## Task 3.5: Add Real-Time Price Updates
**File:** `src/hooks/useAuctionPrice.ts`

Poll or calculate current price:
```typescript
export function useAuctionPrice(invoice) {
  const [price, setPrice] = useState(invoice.startPrice);
  
  useEffect(() => {
    // Calculate price based on time elapsed
    const interval = setInterval(() => {
      const elapsed = Date.now() - invoice.auctionStart;
      const hoursElapsed = elapsed / (1000 * 60 * 60);
      const drop = invoice.startPrice * invoice.priceDropRate * hoursElapsed / 10000;
      const newPrice = Math.max(invoice.startPrice - drop, invoice.minPrice);
      setPrice(newPrice);
    }, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, [invoice]);
  
  return price;
}
```

---

# PHASE 4: SECONDARY MARKET UI (Day 4-5)

## Task 4.1: Create Order Book Component
**File:** `src/components/market/order-book.tsx`

Shows sell orders for an invoice:
- Table: Seller, Amount, Price, Total, Action
- Sort by price (lowest first)
- "Buy" button on each row

---

## Task 4.2: Create Sell Order Modal
**File:** `src/components/market/create-order-modal.tsx`

For token holders to create sell orders:
- Show current holdings
- Input: Token amount to sell
- Input: Price per token
- Calculate total value
- Confirm → Sign with Freighter

---

## Task 4.3: Create Buy Order Modal
**File:** `src/components/market/fill-order-modal.tsx`

When clicking "Buy" on an order:
- Show order details
- Input: Amount to buy (can be partial)
- Calculate total cost
- Confirm → Sign with Freighter

---

## Task 4.4: Create Portfolio Page
**File:** `src/app/dashboard/portfolio/page.tsx`

New page for investors showing:
- Token holdings by invoice
- Current value vs purchase price
- P&L calculation
- "Sell" button for each holding → Opens sell order modal

---

## Task 4.5: Add Order Management to Invoice Detail
**File:** Update `src/app/dashboard/invoices/[id]/page.tsx`

Add tabs or sections:
- Overview (existing)
- Order Book (new) - shows all open orders
- My Holdings (new) - if user has tokens
- My Orders (new) - user's open sell orders with cancel button

---

## Task 4.6: Create My Orders Page
**File:** `src/app/dashboard/orders/page.tsx`

List user's sell orders:
- Status (Open, Partially Filled, Filled, Cancelled)
- Cancel button for open orders
- Fill history for partially filled

---

# PHASE 5: INSURANCE & SETTLEMENT UI (Day 5-6)

## Task 5.1: Create Insurance Pool Display
**File:** `src/components/dashboard/insurance-pool.tsx`

Small card showing:
- Total pool balance
- "Protected by Insurance Pool" badge on invoices

---

## Task 5.2: Create Insurance Claim UI
**File:** `src/components/invoice/claim-insurance.tsx`

For defaulted invoices where user has holdings:
- Show: "This invoice has defaulted"
- Show: "You can claim up to 50% of your investment"
- Calculate claim amount
- "Claim Insurance" button → Sign → Submit

---

## Task 5.3: Create Settlement UI for Buyers
**File:** `src/app/dashboard/settlements/page.tsx`

For buyers to settle funded invoices:
- List invoices where user is buyer and status = FUNDED
- Show amount due (with interest calculation)
- "Pay Now" button → Calls meta-tx API (no wallet needed)
- Show payment confirmation

---

## Task 5.4: Update Invoice Status Badges
**File:** `src/components/ui/status-badge.tsx`

Add visual distinction for all statuses:
- Draft: Gray
- Verified: Blue
- Funding: Yellow/Amber (auction active)
- Funded: Green
- Overdue: Orange
- Settled: Green with checkmark
- Defaulted: Red
- Disputed: Purple

---

## Task 5.5: Add Settlement Amount Calculator
**File:** `src/hooks/useSettlementAmount.ts`

Calculate current settlement amount including interest:
```typescript
export function useSettlementAmount(invoice) {
  // Base amount + interest based on time elapsed
  // Use penalty rate if overdue
  // Return formatted amount
}
```

---

# PHASE 6: KYC UI (Day 6)

## Task 6.1: Create KYC Gate Component
**File:** `src/components/kyc/kyc-gate.tsx`

Wraps investment actions:
```typescript
export function KYCGate({ children }) {
  const { user } = useAuth();
  
  if (user.kycStatus === 'APPROVED') {
    return children;
  }
  
  return <KYCPrompt />;
}
```

---

## Task 6.2: Create KYC Form (Simple Option)
**File:** `src/components/kyc/kyc-form.tsx`

Simple form:
- Full Name
- Country (dropdown)
- Checkbox: "I confirm I am an accredited investor"
- Submit → API → Auto-approve for demo

---

## Task 6.3: Create World ID Integration (Better Option)
**File:** `src/components/kyc/world-id-verify.tsx`

Using @worldcoin/idkit:
```typescript
import { IDKitWidget } from '@worldcoin/idkit';

export function WorldIDVerify() {
  const handleVerify = async (proof) => {
    await fetch('/api/kyc/worldid', {
      method: 'POST',
      body: JSON.stringify(proof),
    });
    // Refresh user session
  };
  
  return (
    <IDKitWidget
      app_id="app_..."
      action="verify-investor"
      onSuccess={handleVerify}
    >
      {({ open }) => <Button onClick={open}>Verify with World ID</Button>}
    </IDKitWidget>
  );
}
```

---

## Task 6.4: Add KYC Status to Profile
**File:** `src/app/dashboard/profile/page.tsx`

New page showing:
- User info (email or wallet)
- KYC status with badge
- "Complete KYC" button if pending
- User type

---

# PHASE 7: POLISH & UX (Day 7-8)

## Task 7.1: Add Loading States Everywhere
Every page/component that fetches data needs:
- Skeleton loaders while loading
- Empty states when no data
- Error states with retry button

---

## Task 7.2: Add Toast Notifications
**File:** Update `src/components/ui/toast.tsx`

Ensure all actions show feedback:
- Transaction submitted
- Transaction confirmed
- Transaction failed (with error message)
- Copy to clipboard
- etc.

---

## Task 7.3: Add Transaction Status Modal
**File:** `src/components/ui/transaction-modal.tsx`

When submitting blockchain transactions:
1. "Waiting for signature..." (Freighter popup)
2. "Submitting transaction..."
3. "Confirming..." with spinner
4. Success with tx hash link to explorer
5. Or error with message

---

## Task 7.4: Add Responsive Design
Check all pages on:
- Mobile (375px)
- Tablet (768px)
- Desktop (1024px+)

Fix any layout issues.

---

## Task 7.5: Add Error Boundaries
**File:** `src/components/error-boundary.tsx`

Wrap main sections to catch React errors gracefully.

---

## Task 7.6: Add Confirmation Dialogs
Before destructive actions:
- Cancel order: "Are you sure?"
- Reject invoice: "Are you sure?"

---

## Task 7.7: Improve Form Validation
All forms should have:
- Client-side validation
- Clear error messages
- Disabled submit until valid

Use react-hook-form + zod for validation.

---

## Task 7.8: Add Keyboard Shortcuts
Nice to have:
- `Cmd+K` - Search invoices
- `Esc` - Close modals

---

# PAGE SUMMARY

## New Pages to Create
| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Wallet + Email login |
| Register | `/register` | Email registration for buyers |
| Invoice Detail | `/dashboard/invoices/[id]` | Full invoice view |
| Portfolio | `/dashboard/portfolio` | Investor holdings |
| My Orders | `/dashboard/orders` | User's sell orders |
| Settlements | `/dashboard/settlements` | Buyer payment page |
| Profile | `/dashboard/profile` | User info + KYC |

## Pages to Update
| Page | Changes |
|------|---------|
| Dashboard | Remove demo, add real stats |
| Create Invoice | Add document upload |
| Requests | Use API, meta-tx for approve |
| Marketplace | Complete rewrite with auctions |
| Admin | Keep for KYC management |

## New Components to Create
| Component | Purpose |
|-----------|---------|
| `file-upload.tsx` | IPFS document upload |
| `document-viewer.tsx` | View invoice PDFs |
| `auction-card.tsx` | Auction status display |
| `start-auction-modal.tsx` | Start auction form |
| `invest-modal.tsx` | Investment form |
| `order-book.tsx` | Secondary market orders |
| `create-order-modal.tsx` | Create sell order |
| `fill-order-modal.tsx` | Buy from order |
| `claim-insurance.tsx` | Insurance claim UI |
| `kyc-form.tsx` | KYC submission |
| `world-id-verify.tsx` | World ID integration |
| `transaction-modal.tsx` | Tx status display |
| `status-badge.tsx` | Invoice status badges |

---

# DEPENDENCIES

| Your Task | Needs From | Provides To |
|-----------|------------|-------------|
| Auth UI | Full Stack auth APIs | All pages |
| Invoice flows | Full Stack invoice APIs | - |
| Auction UI | Contract auction functions | - |
| Order book | Full Stack order APIs | - |
| Document upload | Full Stack IPFS API | - |

---

# COORDINATION

1. **Day 1:** Cleanup can start immediately
2. **Day 2:** Need auth API endpoints from Full Stack
3. **Day 3:** Need invoice API endpoints
4. **Day 4:** Need order API endpoints
5. **Day 6:** Integration testing with Full Stack
6. **Day 8:** Final polish and bug fixes

---

# DESIGN NOTES

Keep existing design system (shadcn/ui + Tailwind).

Color meanings:
- Primary (white/light): Main actions
- Emerald/Green: Success, verified, funded
- Amber/Yellow: Pending, auction active
- Red: Error, defaulted, rejected
- Blue: Info, investor actions
- Purple: Disputed

Maintain dark theme throughout.
