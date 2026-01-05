# Sangini: Real-World Asset (RWA) Tokenization on Stellar

**Sangini** is a decentralized invoice financing platform built on the Stellar Soroban blockchain. It enables suppliers to tokenize their invoices as Real-World Assets (RWAs) and access instant liquidity from global investors.



## � The Problem

**Cash Flow is the #1 Killer of MSMEs.**
Small businesses often wait **30-90 days** for corporate clients to pay invoices. This capital remains locked, preventing them from paying staff, buying inventory, or growing. Traditional invoice factoring is:
- **Paper-heavy & Slow**: Takes days or weeks to approve.
- **Opaque**: High hidden fees and lack of transparency.
- **Inaccessible**: Minimum volume requirements exclude smaller suppliers.

## 🟢 The Solution

**Sangini** bridges the gap between invoices and liquidity using the **Stellar Blockchain**.
By tokenizing verified invoices as real-world assets (RWAs), verified suppliers can access instant capital from a global pool of investors.
- **Instant Liquidity**: T+0 settlement upon funding.
- **Trustless Verification**: Buyers verify invoices on-chain, eliminating fraud.
- **Global Capital**: Anyone with a Stellar wallet can invest and earn yield.

## �🚀 Key Features

- **Invoice Tokenization**: Turn invoices into tradeable on-chain assets.
- **Digital Handshake**: Buyer verification/approval directly on-chain creates trust.
- **Compliance & KYC**: Built-in `AUTHORIZATION_REQUIRED` checks ensure only authorized investors can participate.
- **Instant Settlement**: Suppliers receive funds instantly upon investment.
- **Fractional Investment**: Investors can fund fractions of large invoices.
- **Freighter Wallet Integration**: Seamless signing and transaction management.

## 🏗 Architecture

- **Blockchain**: Stellar Soroban (Testnet)
- **Smart Contracts**: Rust (WASM)
- **Frontend**: Next.js 14, Tailwind CSS, Shadcn UI
- **Wallet**: Freighter (Stellar)
- **Tokens**: Custom `sUSDC` (Stellar USDC) implementation

## 📜 Deployed Contracts (Stellar Testnet)

| Contract | Address | Explorer |
|----------|---------|----------|
| **Invoice Contract** | `CCACZ6JQCHM6LQQUEQA2M4FDEYYH3FBQE63UIPKWRO7Y7PEZUK3K5OL3` | [View](https://stellar.expert/explorer/testnet/contract/CCACZ6JQCHM6LQQUEQA2M4FDEYYH3FBQE63UIPKWRO7Y7PEZUK3K5OL3) |
| **Token Contract** | `CCTWGR2JTPOD3RT3SDU3UMMWEO2XEV2LRKUN4OYMEP7DUY46FA4MIQ34` | [View](https://stellar.expert/explorer/testnet/contract/CCTWGR2JTPOD3RT3SDU3UMMWEO2XEV2LRKUN4OYMEP7DUY46FA4MIQ34) |

## 🔑 Test Accounts (Demo)

These accounts are pre-funded keypairs for demonstration purposes.

| Role | Wallet Address | Note |
|------|----------------|------|
| **Admin** | `GDFCZILMBZBLAOYPKAJEG5ZBYTJ6KU6GAN5Q3APW7LN52XG4S4KGVFOP` | Controls KYC & Upgrade |
| **Supplier** | `GCWGZTQJBDMS5A7F6OVUSFJIWRNREM6PCYWWIHZG6P6D6GUS7YCPL7FV` | Mints Invoices |
| **Buyer** | `GBBLVFK64B4A5RHEZ2STRG6FFVHPTBXFXMWBFOM5HRDKSZXRDSOQRLI4` | Approves Invoices |
| **Investor** | `GAOA56DKGWG2ACZXAR7YA46HSSC6R5TAOSHETSTYT2MSVGVVWSWUNX5O` | Funds Invoices (Has sUSDC) |

> **Note:** The Investor account (`GAOA56...`) has been pre-minted with **100,000 sUSDC** for testing.

## 🎬 Application Demo Flow

### 1. 🏭 Mint Invoice (Supplier)
- Switch to **Supplier View**.
- Go to "Mint Invoice".
- Fill details (Amount: 1000 XLM) and click "Mint Draft".
- **Result:** Invoice created on-chain in `Draft` status.

### 2. 🏢 Verify Invoice (Buyer)
- Switch to **Buyer View**.
- Go to "Upcoming Requests".
- Click "Approve & Verify" on the new invoice.
- **Result:** Invoice status updates to `Verified`.

### 3. ⚠️ KYC Check (Investor - Fail Case)
- Switch to **Investor View**.
- Try to "Fund" the invoice *before* KYC approval.
- **Result:** Transaction fails with **KYC Required** error.

### 4. 👨‍💼 Approve KYC (Admin)
- Switch to **Admin View**.
- Go to "KYC Admin".
- Enter Investor Address (`GAOA56...`).
- Click "Approve Investor KYC".
- **Result:** Investor authorized on privacy layer.

### 5. 💰 Fund Invoice (Investor - Success Case)
- Switch to **Investor View**.
- Click "Fund Invoice" again.
- **Result:**
  - 1000 sUSDC transferred from Investor → Contract → Supplier.
  - Invoice status updates to `Funded`.

## 🛠 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/soumyacodes007/sangini.git
   cd sangini
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open Explorer:**
   Visit [http://localhost:3000](http://localhost:3000)

## 📄 License

MIT License. Built for the Stellar Hackathon.
