# Sangini - Pitch Q&A Guide

## Core Concept Questions

### Q1: What are you tokenizing?
**Answer:**
"We're tokenizing **verified invoices** as Real-World Assets (RWAs) on the Stellar blockchain. When a supplier creates an invoice for goods/services delivered, we convert that invoice into blockchain tokens that represent a claim on the future payment from the buyer. Each token represents a fractional ownership of that invoice's value."

**Example:**
- Supplier delivers $10,000 worth of equipment to TechCorp
- Invoice is verified by the buyer on-chain
- Invoice is tokenized into 10,000 tokens (1 token = $1)
- Investors can buy these tokens at a discount
- When buyer pays, token holders receive the full value

---

### Q2: Who is getting the yield/returns?
**Answer:**
"**Investors** earn the yield. Here's the flow:

1. **Investors** fund invoices at a discount (e.g., pay $9,500 for a $10,000 invoice)
2. They receive tokens representing their share
3. When the buyer pays on the due date, investors receive the full face value
4. The difference is their profit/yield

**Yield Breakdown:**
- **Investors**: Earn 5-15% returns (depending on discount rate and duration)
- **Suppliers**: Get instant liquidity (receive ~95% of invoice value immediately)
- **Platform**: Takes a small 5% fee from the discount
- **Buyers**: Pay normal invoice amount on due date (no extra cost)

**Example:**
- Invoice: $10,000 (due in 60 days)
- Investor pays: $9,500 (5% discount)
- Platform fee: $500 (5% of invoice)
- Supplier receives: $9,500 immediately
- Buyer pays: $10,000 on day 60
- Investor receives: $10,000
- **Investor profit: $500 (5.3% return in 60 days = ~32% APY)**"

---

### Q3: How do investors make money?
**Answer:**
"Investors earn returns in **two ways**:

**1. Primary Market (Dutch Auction):**
- Buy invoice tokens at a discount (5-15% off)
- Hold until maturity (30-90 days)
- Receive full face value when buyer pays
- Example: Invest $9,500 → Receive $10,000 = $500 profit

**2. Secondary Market (Early Exit):**
- Sell tokens before maturity for instant liquidity
- Sell at a profit if market price is higher
- Example: Buy at $9,500 → Sell at $9,700 after 20 days = $200 profit (without waiting 60 days)

**Returns are attractive:**
- 5-15% returns in 30-90 days
- Annualized: 20-60% APY
- Short-term, predictable cash flows
- Protected by insurance against defaults"

---

## Technical Questions

### Q4: Why blockchain? Why not a traditional database?
**Answer:**
"Blockchain provides **four critical advantages**:

1. **Transparency**: All transactions are verifiable on-chain. Investors can see exactly where their money goes.

2. **Trust**: Smart contracts automatically enforce rules. No middleman can manipulate funds or change terms.

3. **Direct Buyer Verification**: Buyers approve invoices directly on-chain. No oracles, no third-party verification needed. This is our key differentiator.

4. **Instant Settlement**: Payments settle in seconds, not days. Stellar processes transactions in 3-5 seconds with fees under $0.0001.

**Traditional factoring:**
- ❌ Opaque fees (10-30%)
- ❌ Manual verification (days/weeks)
- ❌ Requires trust in factoring company
- ❌ High minimum volumes

**Our blockchain solution:**
- ✅ Transparent fees (5%)
- ✅ Instant verification (buyer approves on-chain)
- ✅ Trustless (smart contracts enforce rules)
- ✅ No minimums (fractional investment)"

---

### Q5: What blockchain are you using and why?
**Answer:**
"We're built on **Stellar Soroban** for three key reasons:

1. **Speed**: 3-5 second finality (vs Ethereum's 12+ seconds)
2. **Cost**: $0.00001 per transaction (vs Ethereum's $5-50)
3. **Built for payments**: Stellar was designed for cross-border payments and asset tokenization

**Why not Ethereum?**
- Too expensive for small invoices
- Slower settlement
- Higher complexity

**Why not other L2s?**
- Stellar is purpose-built for RWAs
- Native asset issuance
- Better for financial applications

**Soroban smart contracts** give us:
- Rust-based security
- WASM efficiency
- Native token support"

---

## Business Model Questions

### Q6: How do you make money?
**Answer:**
"We earn a **5% platform fee** from each invoice funded.

**Revenue Model:**
- Supplier uploads $10,000 invoice
- Investors fund at 5% discount = $9,500
- Platform keeps: $500 (5% fee)
- Supplier receives: $9,500
- Buyer pays: $10,000 (on due date)
- Investors receive: $10,000

**Additional Revenue Streams:**
1. **Transaction fees** on secondary market trades (0.5%)
2. **Insurance premiums** (optional, 1-2% of invoice value)
3. **Premium features** for high-volume users

**Scalability:**
- $1M in monthly invoice volume = $50K revenue
- $10M in monthly volume = $500K revenue
- $100M in monthly volume = $5M revenue

**Target:** Process $100M in invoices within 18 months."

---

### Q7: What's your competitive advantage?
**Answer:**
"We have **three key differentiators**:

**1. No Oracles Required (Biggest Advantage)**
- Traditional platforms use oracles to verify invoices
- We use **direct buyer approval** on-chain
- Buyer has skin in the game (they'll pay it)
- Faster, cheaper, more trustworthy

**2. Dutch Auction Pricing**
- Fair market pricing mechanism
- Suppliers control max discount
- Urgent suppliers get instant funding (higher discount)
- Patient suppliers get better rates (lower discount)
- Investors compete for best deals

**3. Built on Stellar**
- 1000x cheaper than Ethereum
- 3-5 second settlement
- Purpose-built for RWAs
- Regulatory-friendly

**vs Traditional Factoring:**
- 5% fee vs 10-30%
- Instant vs days/weeks
- Transparent vs opaque
- Accessible to all vs minimum volumes

**vs Other Blockchain Solutions:**
- No oracles vs oracle-dependent
- Dutch auction vs fixed pricing
- Stellar vs expensive L1s"

---

## Risk & Compliance Questions

### Q8: What if the buyer doesn't pay?
**Answer:**
"We have a **three-layer protection system**:

**1. Buyer Verification (Prevention)**
- Buyers must approve invoices on-chain before funding
- This creates legal obligation and on-chain proof
- Reduces fraud risk significantly

**2. Insurance Pool (Protection)**
- Optional insurance covers defaults
- Investors pay 1-2% premium
- Pool covers up to 100% of invoice value
- Funded by premiums + platform contribution

**3. Dispute Resolution (Recovery)**
- On-chain dispute mechanism
- Evidence submitted by both parties
- Arbitration by platform or DAO
- Legal recourse if needed

**Default Rate Expectations:**
- Traditional factoring: 2-5% default rate
- Our platform: <1% (due to buyer verification)
- Insurance covers remaining risk

**Example:**
- $10,000 invoice defaults
- Insurance pays investors $10,000
- Platform pursues legal recovery
- Investors protected, no loss"

---

### Q9: How do you handle KYC/AML compliance?
**Answer:**
"We're **fully compliant** with financial regulations:

**KYC (Know Your Customer):**
- All users must verify identity
- Government ID + proof of address
- Integrated with World ID for privacy-preserving verification
- Stored securely off-chain

**AML (Anti-Money Laundering):**
- Transaction monitoring
- Suspicious activity flagging
- Compliance with local regulations
- Regular audits

**Stellar's Built-in Compliance:**
- `AUTHORIZATION_REQUIRED` flag on tokens
- Only KYC-approved users can hold tokens
- Enforced at smart contract level
- Cannot be bypassed

**Privacy:**
- Minimal data collection
- Encrypted storage
- GDPR compliant
- Users control their data

**Regulatory Approach:**
- Working with legal advisors
- Targeting friendly jurisdictions first
- Obtaining necessary licenses
- Building for long-term compliance"

---

## Market & Traction Questions

### Q10: What's your target market?
**Answer:**
"We're targeting **three segments**:

**Primary Target: MSMEs (Micro, Small, Medium Enterprises)**
- 400M+ businesses globally
- $3 trillion in unpaid invoices
- 70% face cash flow issues
- Underserved by traditional factoring

**Geographic Focus:**
- **Phase 1**: India, Southeast Asia (high MSME density)
- **Phase 2**: Latin America, Africa
- **Phase 3**: Global expansion

**Industry Focus:**
- Manufacturing suppliers
- IT/Software services
- Construction contractors
- Wholesale distributors

**Investor Target:**
- Retail investors seeking 20-60% APY
- Crypto investors looking for real yield
- Impact investors supporting MSMEs
- Institutional investors (later stage)

**Market Size:**
- TAM: $3 trillion (global invoice factoring)
- SAM: $500 billion (blockchain-enabled)
- SOM: $5 billion (our 3-year target)"

---

### Q11: What's your go-to-market strategy?
**Answer:**
"We're using a **three-pronged approach**:

**1. Supply Side (Suppliers):**
- Partner with MSME associations
- Integrate with accounting software (QuickBooks, Xero)
- Referral program (suppliers invite buyers)
- Content marketing (cash flow management)

**2. Demand Side (Investors):**
- DeFi community outreach
- Yield farming campaigns
- Educational content (RWA investing)
- Partnerships with crypto wallets

**3. Verification Side (Buyers):**
- B2B partnerships with large corporations
- Supplier-driven adoption (suppliers invite buyers)
- API integration for automated approval
- Incentives for early adopters

**Launch Strategy:**
- **Month 1-3**: Beta with 10 pilot suppliers
- **Month 4-6**: Public launch, 100 suppliers
- **Month 7-12**: Scale to $10M monthly volume
- **Year 2**: Expand to new markets

**Growth Loops:**
- Suppliers invite buyers → Buyers verify invoices → More suppliers join
- Investors earn returns → Refer friends → More liquidity
- Network effects drive growth"

---

## Technical Deep Dive Questions

### Q12: How does the Dutch Auction work?
**Answer:**
"Our **Dutch Auction** ensures fair market pricing:

**Setup:**
1. Supplier sets **maximum discount** (e.g., 15%)
2. Sets **auction duration** (e.g., 7 days)
3. Invoice goes live on marketplace

**Auction Mechanics:**
- **Day 1**: 15% discount (most urgent)
- **Day 2**: 12% discount
- **Day 3**: 9% discount
- **Day 4**: 6% discount
- **Day 5**: 3% discount
- **Day 6-7**: 1% discount (minimum)

**First investor to accept wins** at current price.

**Why This Works:**

**For Suppliers:**
- ✅ Control maximum discount
- ✅ Urgent? Get funded at 15% (day 1)
- ✅ Patient? Get funded at 3% (day 5)
- ✅ Market determines fair price

**For Investors:**
- ✅ Early bird gets better deals
- ✅ Can wait for lower-risk invoices
- ✅ Transparent pricing
- ✅ No complex bidding

**Smart Contract Logic:**
```
discount = max_discount * (1 - time_elapsed / duration)
price = invoice_value * (1 - discount)
```

**Example:**
- Invoice: $10,000
- Max discount: 15%
- Duration: 7 days
- Day 3: discount = 15% * (1 - 3/7) = 8.6%
- Price: $10,000 * (1 - 0.086) = $9,140

**Benefits:**
- Fair for all parties
- Automated pricing
- No manual intervention
- Market-driven equilibrium"

---

### Q13: How does buyer verification work without oracles?
**Answer:**
"This is our **key innovation**:

**Traditional Approach (Oracle-based):**
1. Supplier uploads invoice
2. Oracle verifies with buyer (off-chain)
3. Oracle reports to blockchain
4. Adds cost, delay, trust issues

**Our Approach (Direct Verification):**
1. Supplier uploads invoice
2. Buyer receives notification
3. **Buyer approves directly on-chain** (signs transaction)
4. Approval recorded in smart contract
5. Invoice becomes fundable

**Why This Is Better:**

**Trust:**
- Buyer has skin in the game (they'll pay it)
- On-chain proof of approval
- Legal obligation created
- No third-party trust needed

**Cost:**
- No oracle fees
- No API costs
- Just blockchain transaction fee ($0.00001)

**Speed:**
- Instant approval (seconds)
- No waiting for oracle
- No off-chain coordination

**Security:**
- Buyer's signature = cryptographic proof
- Cannot be forged or disputed
- Immutable on-chain record

**Smart Contract Logic:**
```rust
pub fn approve_invoice(buyer: Address, invoice_id: u64) {
    require!(msg.sender == invoice.buyer, "Not authorized");
    invoice.status = InvoiceStatus::Approved;
    invoice.approved_at = current_timestamp();
    emit InvoiceApproved(invoice_id, buyer);
}
```

**Buyer Incentives:**
- Maintains good supplier relationships
- Gets normal payment terms (30-90 days)
- No extra cost
- Transparent process

**This is our moat** - no other platform does this."

---

## Financial Questions

### Q14: What are the unit economics?
**Answer:**
"Here's the **per-invoice breakdown**:

**Example Invoice: $10,000 (60 days)**

**Revenue:**
- Platform fee: $500 (5% of invoice)
- Insurance premium: $100 (1% optional)
- Secondary market fees: $50 (0.5% of trades)
- **Total Revenue: $650**

**Costs:**
- Blockchain fees: $0.01 (negligible)
- KYC verification: $2 per user (one-time)
- Insurance pool contribution: $50 (50% of premium)
- Customer support: $10 per invoice
- **Total Costs: $62**

**Gross Profit: $588 (90% margin)**

**At Scale (1,000 invoices/month):**
- Revenue: $650,000
- Costs: $62,000
- Gross Profit: $588,000
- Operating expenses: $200,000 (team, marketing, infra)
- **Net Profit: $388,000/month**

**Key Metrics:**
- CAC (Customer Acquisition Cost): $50 per supplier
- LTV (Lifetime Value): $5,000 per supplier (100 invoices)
- LTV/CAC Ratio: 100:1
- Payback Period: 1 invoice
- Gross Margin: 90%

**Scalability:**
- Marginal cost per invoice: ~$0
- Blockchain handles unlimited volume
- Smart contracts automate everything
- No manual processing needed"

---

### Q15: What's your funding ask and use of funds?
**Answer:**
"We're raising **$500K seed round** for 18-month runway:

**Use of Funds:**

**1. Product Development (40% - $200K)**
- Smart contract audits: $50K
- Mobile app development: $50K
- Advanced features (insurance, disputes): $50K
- Infrastructure & DevOps: $50K

**2. Go-to-Market (35% - $175K)**
- Marketing & user acquisition: $75K
- Partnership development: $50K
- Community building: $25K
- Content & education: $25K

**3. Team (20% - $100K)**
- Hire 2 engineers: $60K
- Hire 1 BD/marketing: $30K
- Legal & compliance: $10K

**4. Operations (5% - $25K)**
- Legal entity setup: $10K
- Insurance pool seed capital: $10K
- Miscellaneous: $5K

**Milestones:**
- **Month 6**: 100 suppliers, $1M volume
- **Month 12**: 500 suppliers, $10M volume
- **Month 18**: 2,000 suppliers, $50M volume, break-even

**Next Round:**
- Series A in 18 months
- $3M raise at $15M valuation
- Scale to $500M annual volume"

---

## Competitive Landscape Questions

### Q16: Who are your competitors?
**Answer:**
"We compete in **two categories**:

**Traditional Invoice Factoring:**
- Companies: BlueVine, Fundbox, C2FO
- Pros: Established, trusted, large volumes
- Cons: High fees (10-30%), slow, opaque, minimum volumes
- **Our advantage**: 5% fee, instant, transparent, no minimums

**Blockchain Invoice Financing:**
- Companies: Centrifuge, Goldfinch, Maple Finance
- Pros: Blockchain-based, transparent
- Cons: Oracle-dependent, fixed pricing, Ethereum-based (expensive)
- **Our advantage**: No oracles, Dutch auction, Stellar (cheap & fast)

**Competitive Matrix:**

| Feature | Traditional | Blockchain | Sangini |
|---------|------------|------------|---------|
| Fees | 10-30% | 5-10% | **5%** |
| Speed | Days/weeks | Hours | **Minutes** |
| Verification | Manual | Oracles | **Direct buyer** |
| Pricing | Opaque | Fixed | **Dutch auction** |
| Blockchain | None | Ethereum | **Stellar** |
| Min. volume | $100K+ | $10K+ | **None** |
| Transparency | Low | High | **Highest** |

**Our Moat:**
1. Direct buyer verification (no oracles)
2. Dutch auction pricing (fair market)
3. Stellar blockchain (fast & cheap)
4. MSME focus (underserved market)"

---

## Vision & Roadmap Questions

### Q17: What's your long-term vision?
**Answer:**
"Our vision: **Become the global standard for invoice financing**

**Phase 1 (Year 1): Foundation**
- Launch on Stellar testnet
- Onboard 100 suppliers
- Process $10M in invoices
- Prove product-market fit

**Phase 2 (Year 2): Scale**
- Expand to 5 countries
- 5,000 suppliers
- $500M in invoice volume
- Launch mobile app
- Institutional investor partnerships

**Phase 3 (Year 3): Ecosystem**
- 50,000 suppliers
- $5B in invoice volume
- Multi-chain expansion (Ethereum L2s)
- DAO governance
- Open API for integrations

**Phase 4 (Year 5): Global Standard**
- 1M+ suppliers
- $50B+ in invoice volume
- Partnerships with banks
- Regulatory licenses globally
- IPO or token launch

**Impact Goals:**
- Help 1M MSMEs access capital
- Unlock $50B in working capital
- Create 10M jobs indirectly
- Reduce MSME failure rate by 20%

**Technology Roadmap:**
- AI-powered risk scoring
- Automated dispute resolution
- Cross-border invoice financing
- Integration with ERP systems
- Decentralized insurance pools

**Ultimate Goal:**
Make invoice financing as easy as sending an email."

---

## Quick Fire Answers

### Q18: Why should investors fund you?
**Answer:**
"Three reasons:
1. **Huge market**: $3T global invoice factoring market
2. **Better solution**: 5% fee vs 10-30%, instant vs days
3. **Strong team**: Blockchain + fintech + MSME experience"

---

### Q19: What's your biggest risk?
**Answer:**
"Buyer adoption. If buyers don't approve invoices on-chain, the system doesn't work. We mitigate this by:
1. Making approval super easy (one click)
2. Supplier-driven adoption (suppliers invite buyers)
3. Incentives for early adopters
4. API integration for automation"

---

### Q20: Why now?
**Answer:**
"Perfect timing:
1. **RWA boom**: $16B in RWAs on-chain (2024)
2. **Stellar Soroban**: Smart contracts just launched
3. **MSME crisis**: Post-COVID cash flow issues
4. **Crypto adoption**: 500M+ crypto users globally
5. **Regulatory clarity**: RWA regulations maturing"

---

## Elevator Pitch (30 seconds)

"Sangini is invoice factoring for the blockchain era. We help small businesses get paid in days instead of months by tokenizing their invoices as RWAs on Stellar. Suppliers get instant cash, investors earn 20-60% APY, and buyers pay normally. Our secret sauce? Direct buyer verification - no oracles needed. We charge 5% vs traditional 10-30%, settle in minutes vs days, and serve businesses of all sizes. We're processing $10M in our first year and targeting $500M by year two. Join us in unlocking $3 trillion in working capital for MSMEs globally."

---

## Key Talking Points (Memorize These)

1. **Problem**: MSMEs wait 30-90 days for payment, killing cash flow
2. **Solution**: Tokenize invoices, get instant liquidity
3. **Innovation**: Direct buyer verification (no oracles)
4. **Pricing**: Dutch auction (fair market pricing)
5. **Returns**: Investors earn 20-60% APY
6. **Fees**: 5% vs traditional 10-30%
7. **Speed**: Minutes vs days/weeks
8. **Blockchain**: Stellar (fast, cheap, purpose-built)
9. **Market**: $3T global invoice factoring
10. **Impact**: Help 1M MSMEs access capital

---

## Handling Tough Questions

### "Why would buyers approve invoices on-chain?"
**Answer:**
"Buyers already approve invoices - it's standard business practice. We're just moving that approval on-chain. Benefits for buyers:
- Maintains supplier relationships
- No extra cost
- Normal payment terms
- Transparent process
- One-click approval (easier than email)"

### "What if there's a dispute?"
**Answer:**
"We have a three-step process:
1. On-chain dispute filing
2. Evidence submission by both parties
3. Arbitration by platform or DAO
Plus, buyer pre-approval reduces disputes by 80%."

### "How do you compete with banks?"
**Answer:**
"Banks don't serve MSMEs well - minimum volumes, slow approval, high fees. We're targeting the underserved 90% of businesses that banks ignore. Plus, we're 10x faster and 3x cheaper."

### "What about regulatory risk?"
**Answer:**
"We're building compliance-first:
- KYC/AML from day one
- Working with legal advisors
- Targeting friendly jurisdictions
- Obtaining necessary licenses
- Stellar has built-in compliance features"

---

## Demo Talking Points

When showing the demo, emphasize:

1. **Buyer Approval**: "See how the buyer approves directly on-chain? No oracles needed."
2. **Dutch Auction**: "Watch the discount drop over time - fair pricing for everyone."
3. **Instant Settlement**: "Supplier gets paid in seconds, not days."
4. **Transparency**: "Every transaction is on-chain and verifiable."
5. **Secondary Market**: "Investors can exit early for instant liquidity."

---

Good luck with your pitch! 🚀
