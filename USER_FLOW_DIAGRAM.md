# Sangini - User Flow Diagrams

## 1. Complete Platform Flow (High-Level)

```mermaid
graph TB
    subgraph "👔 SUPPLIER"
        S1[Upload Invoice<br/>$10,000]
        S2[Wait for Buyer<br/>Approval]
        S3[Start Dutch<br/>Auction]
        S4[Receive Money<br/>$9,500]
    end
    
    subgraph "🏢 BUYER"
        B1[Receive Goods]
        B2[Approve Invoice<br/>On-Chain]
        B3[Pay on Due Date<br/>$10,000]
    end
    
    subgraph "💰 INVESTOR"
        I1[Browse<br/>Marketplace]
        I2[Invest at Discount<br/>$9,500]
        I3[Receive Returns<br/>$10,000]
    end
    
    subgraph "⛓️ BLOCKCHAIN"
        BC1[Invoice Token<br/>Created]
        BC2[Buyer Signature<br/>Verified]
        BC3[Smart Contract<br/>Holds Funds]
        BC4[Auto Settlement<br/>& Distribution]
    end
    
    S1 --> BC1
    BC1 --> B2
    B2 --> BC2
    BC2 --> S3
    S3 --> I1
    I1 --> I2
    I2 --> BC3
    BC3 --> S4
    B3 --> BC4
    BC4 --> I3
    
    style S4 fill:#90EE90
    style I3 fill:#90EE90
    style BC2 fill:#FFD700
    style BC4 fill:#87CEEB
```

---

## 2. Simple 3-Step Flow (For Quick Explanation)

```mermaid
graph LR
    A[👔 Supplier<br/>Uploads Invoice<br/>$10,000] --> B[🏢 Buyer<br/>Approves On-Chain<br/>✓ Verified]
    B --> C[💰 Investor<br/>Funds at Discount<br/>$9,500]
    C --> D[👔 Supplier<br/>Gets Paid Instantly<br/>$9,500]
    C --> E[⏰ 60 Days Later]
    E --> F[🏢 Buyer<br/>Pays Full Amount<br/>$10,000]
    F --> G[💰 Investor<br/>Receives Returns<br/>$10,000]
    
    style D fill:#90EE90
    style G fill:#90EE90
    style B fill:#FFD700
```

---

## 3. Detailed Step-by-Step Flow

```mermaid
sequenceDiagram
    participant S as 👔 Supplier
    participant B as 🏢 Buyer
    participant BC as ⛓️ Blockchain
    participant I as 💰 Investor
    participant SC as 🤖 Smart Contract

    Note over S: Day 0: Invoice Created
    S->>BC: Upload Invoice ($10,000)
    BC->>BC: Create Invoice Token
    BC->>B: Notify Buyer
    
    Note over B: Buyer Verification
    B->>BC: Approve Invoice (Sign Transaction)
    BC->>BC: Record Approval On-Chain
    BC->>S: Approval Confirmed
    
    Note over S: Start Dutch Auction
    S->>BC: Start Auction (Max 15% Discount)
    BC->>BC: Auction Goes Live
    
    Note over I: Day 1-3: Auction Running
    I->>BC: Browse Marketplace
    BC->>I: Show Invoice (Current: 8% Discount)
    I->>SC: Invest $9,500
    SC->>SC: Lock Funds in Escrow
    SC->>S: Transfer $9,500 to Supplier
    SC->>I: Issue Invoice Tokens
    
    Note over B: Day 60: Due Date
    B->>SC: Pay Invoice ($10,000)
    SC->>SC: Verify Payment
    SC->>I: Distribute $10,000 to Investor
    SC->>BC: Mark Invoice as Settled
    
    Note over I: Investor Profit: $500
```

---

## 4. Dutch Auction Mechanism

```mermaid
graph TD
    A[Invoice: $10,000<br/>Max Discount: 15%] --> B{Auction Starts}
    
    B --> D1[Day 1: 15% Off<br/>Price: $8,500]
    B --> D2[Day 2: 12% Off<br/>Price: $8,800]
    B --> D3[Day 3: 9% Off<br/>Price: $9,100]
    B --> D4[Day 4: 6% Off<br/>Price: $9,400]
    B --> D5[Day 5: 3% Off<br/>Price: $9,700]
    
    D1 -.->|No Investor| D2
    D2 -.->|No Investor| D3
    D3 -->|Investor Accepts!| E[Investor Pays $9,100]
    
    E --> F[Supplier Gets $9,100]
    E --> G[Investor Gets Tokens<br/>Worth $10,000]
    
    style D3 fill:#90EE90
    style E fill:#FFD700
    style F fill:#90EE90
    style G fill:#90EE90
```

---

## 5. Key Innovation: No Oracles

```mermaid
graph TB
    subgraph "❌ Traditional (Oracle-Based)"
        T1[Supplier Uploads Invoice]
        T2[Oracle Verifies Off-Chain]
        T3[Oracle Reports to Blockchain]
        T4[High Cost + Delay + Trust Issues]
        
        T1 --> T2
        T2 --> T3
        T3 --> T4
    end
    
    subgraph "✅ Sangini (Direct Verification)"
        S1[Supplier Uploads Invoice]
        S2[Buyer Approves On-Chain]
        S3[Instant Verification]
        S4[Low Cost + Fast + Trustless]
        
        S1 --> S2
        S2 --> S3
        S3 --> S4
    end
    
    style T4 fill:#FFB6C6
    style S4 fill:#90EE90
```

---

## 6. Money Flow Diagram

```mermaid
graph LR
    subgraph "Invoice: $10,000"
        A[💰 Investor<br/>Pays $9,500]
        B[📊 Platform Fee<br/>$500 5%]
        C[👔 Supplier<br/>Receives $9,500]
        D[🏢 Buyer<br/>Pays $10,000]
        E[💰 Investor<br/>Receives $10,000]
        F[💵 Investor Profit<br/>$500]
    end
    
    A --> B
    A --> C
    D --> E
    E --> F
    
    style C fill:#90EE90
    style E fill:#90EE90
    style F fill:#FFD700
```

---

## 7. Secondary Market Flow

```mermaid
graph TB
    A[💰 Investor A<br/>Buys at $9,500] --> B[Holds Tokens<br/>Worth $10,000]
    B --> C{Need Money Early?}
    
    C -->|Yes| D[List on Secondary Market<br/>Price: $9,700]
    C -->|No| E[Wait for Due Date<br/>Get $10,000]
    
    D --> F[💰 Investor B<br/>Buys at $9,700]
    F --> G[Investor A Profit: $200<br/>in 20 days]
    F --> H[Investor B Waits<br/>40 more days]
    H --> I[Investor B Gets $10,000<br/>Profit: $300]
    
    E --> J[Investor A Gets $10,000<br/>Profit: $500]
    
    style G fill:#90EE90
    style I fill:#90EE90
    style J fill:#90EE90
```

---

## 8. Risk Protection System

```mermaid
graph TD
    A[Invoice Funded] --> B{Buyer Pays on Time?}
    
    B -->|✅ Yes 99%| C[Normal Settlement]
    B -->|❌ No 1%| D[Default Triggered]
    
    C --> E[Investors Get Returns]
    
    D --> F{Insurance Purchased?}
    F -->|✅ Yes| G[Insurance Pool Pays]
    F -->|❌ No| H[Dispute Resolution]
    
    G --> I[Investors Protected]
    H --> J[Platform Pursues Recovery]
    
    style C fill:#90EE90
    style E fill:#90EE90
    style G fill:#87CEEB
    style I fill:#90EE90
```

---

## 9. Platform Architecture

```mermaid
graph TB
    subgraph "Frontend"
        UI[Next.js Dashboard]
        W[Freighter Wallet]
    end
    
    subgraph "Backend"
        API[Next.js API Routes]
        DB[(MongoDB)]
    end
    
    subgraph "Blockchain Layer"
        SC1[Invoice Smart Contract<br/>Stellar Soroban]
        SC2[Token Contract<br/>sUSDC]
        WA[Weilliptic Agent<br/>Risk Assessment]
    end
    
    subgraph "External Services"
        KYC[KYC/AML Service]
        IPFS[IPFS Storage<br/>Documents]
    end
    
    UI --> W
    UI --> API
    API --> DB
    API --> SC1
    API --> SC2
    API --> WA
    API --> KYC
    API --> IPFS
    SC1 --> SC2
    
    style SC1 fill:#87CEEB
    style SC2 fill:#87CEEB
    style WA fill:#FFD700
```

---

## 10. Complete User Journey (Timeline)

```mermaid
gantt
    title Invoice Lifecycle (60 Days)
    dateFormat X
    axisFormat %d
    
    section Supplier
    Upload Invoice           :0, 1d
    Wait for Approval        :1, 2d
    Start Auction            :3, 1d
    Receive Payment          :4, 1d
    
    section Buyer
    Receive Goods            :0, 1d
    Approve Invoice          :1, 2d
    Wait for Due Date        :3, 57d
    Pay Invoice              :60, 1d
    
    section Investor
    Browse Marketplace       :3, 1d
    Invest in Invoice        :4, 1d
    Hold Tokens              :5, 55d
    Receive Returns          :60, 1d
    
    section Blockchain
    Token Created            :0, 1d
    Buyer Signature          :2, 1d
    Auction Live             :3, 1d
    Funds Locked             :4, 56d
    Auto Settlement          :60, 1d
```

---

## How to Use These Diagrams

### For Judges:
1. **Start with Diagram 2** (Simple 3-Step) - Quick overview
2. **Show Diagram 1** (Complete Flow) - Full picture
3. **Highlight Diagram 5** (No Oracles) - Key innovation
4. **Explain Diagram 4** (Dutch Auction) - Unique pricing

### For Technical Audience:
- Use Diagram 3 (Sequence) and Diagram 9 (Architecture)

### For Business Audience:
- Use Diagram 6 (Money Flow) and Diagram 7 (Secondary Market)

### For Demo:
- Follow Diagram 10 (Timeline) to show complete journey

---

## Quick Talking Points for Each Diagram

**Diagram 1-2:** "Here's how money flows from investor to supplier to buyer"

**Diagram 3:** "Every step is automated by smart contracts"

**Diagram 4:** "Dutch auction ensures fair pricing - urgent suppliers get instant funding, patient suppliers get better rates"

**Diagram 5:** "Our key innovation - buyers verify directly, no expensive oracles needed"

**Diagram 6:** "Everyone wins - supplier gets cash, investor earns yield, buyer pays normally"

**Diagram 7:** "Need liquidity early? Sell on secondary market"

**Diagram 8:** "Multiple layers of protection against defaults"

**Diagram 9:** "Built on Stellar for speed and low cost"

**Diagram 10:** "Complete lifecycle from upload to settlement"

---

## Copy-Paste for Presentations

These diagrams render in:
- ✅ GitHub README
- ✅ Mermaid Live Editor (mermaid.live)
- ✅ VS Code (with Mermaid extension)
- ✅ Notion, Obsidian, etc.

For PowerPoint/Slides:
1. Go to https://mermaid.live
2. Paste diagram code
3. Export as PNG/SVG
4. Insert into slides
