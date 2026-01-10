// Sangini Contract Configuration

export const CONTRACT_CONFIG = {
    // Contract Addresses - will be updated after new deploy
    INVOICE_CONTRACT: process.env.NEXT_PUBLIC_INVOICE_CONTRACT || 'CCACZ6JQCHM6LQQUEQA2M4FDEYYH3FBQE63UIPKWRO7Y7PEZUK3K5OL3',

    // Network Configuration
    NETWORK: process.env.NEXT_PUBLIC_NETWORK || 'testnet',
    NETWORK_PASSPHRASE: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
    HORIZON_URL: process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    SOROBAN_RPC_URL: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',

    // Interest Rates (basis points)
    BASE_INTEREST_RATE: 1000, // 10%
    PENALTY_RATE: 2400, // 24%
    GRACE_PERIOD_DAYS: 30,
    INSURANCE_CUT_BPS: 500, // 5%
};

// Invoice Status enum matching contract
export enum InvoiceStatus {
    Draft = 'Draft',
    Verified = 'Verified',
    Funding = 'Funding', // Auction active
    Funded = 'Funded',
    Overdue = 'Overdue',
    Settled = 'Settled',
    Defaulted = 'Defaulted',
    Disputed = 'Disputed',
    Revoked = 'Revoked',
}

// User Roles
export enum UserRole {
    Admin = 'admin',
    Supplier = 'supplier',
    Buyer = 'buyer',
    Investor = 'investor',
}

// Invoice Type
export interface Invoice {
    id: string;
    supplier: string;
    buyer: string;
    amount: string;
    currency: string;
    createdAt: number;
    dueDate: number;
    verifiedAt: number;
    settledAt: number;
    status: InvoiceStatus;
    tokenSymbol: string;
    totalTokens: string;
    tokensSold: string;
    tokensRemaining: string;
    description: string;
    purchaseOrder: string;
    documentHash: string;
    repaymentReceived: string;
    buyerSignedAt: number;
    // Auction fields
    auctionStart: number;
    auctionEnd: number;
    startPrice: string;
    minPrice: string;
    priceDropRate: number;
}

// Dispute Type
export interface Dispute {
    invoiceId: string;
    raisedBy: string;
    reason: string;
    raisedAt: number;
    resolution: 'Pending' | 'Valid' | 'Invalid';
    resolvedAt: number;
}

// Token Holding Type
export interface TokenHolding {
    invoiceId: string;
    holder: string;
    amount: string;
    acquiredAt: number;
    acquiredPrice: string;
}

// Sell Order Type
export interface SellOrder {
    id: string;
    invoiceId: string;
    seller: string;
    tokenAmount: string;
    pricePerToken: string;
    tokensRemaining: string;
    createdAt: number;
    status: 'Open' | 'PartiallyFilled' | 'Filled' | 'Cancelled';
}

// Format helpers
export function formatAmount(amount: string | number, currency = 'XLM'): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    // 7 decimal places like Stellar
    const realValue = value / 10000000;

    if (currency === 'XLM') {
        return `${realValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} XLM`;
    }

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(realValue);
}

export function formatDate(timestamp: number): string {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatAddress(address: string, chars = 8): string {
    if (!address || address.length < chars * 2) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getStatusColor(status: InvoiceStatus): string {
    const colors: Record<InvoiceStatus, string> = {
        [InvoiceStatus.Draft]: 'bg-gray-500/20 text-gray-400',
        [InvoiceStatus.Verified]: 'bg-blue-500/20 text-blue-400',
        [InvoiceStatus.Funding]: 'bg-amber-500/20 text-amber-400',
        [InvoiceStatus.Funded]: 'bg-emerald-500/20 text-emerald-400',
        [InvoiceStatus.Overdue]: 'bg-orange-500/20 text-orange-400',
        [InvoiceStatus.Settled]: 'bg-emerald-500/20 text-emerald-400',
        [InvoiceStatus.Defaulted]: 'bg-red-500/20 text-red-400',
        [InvoiceStatus.Disputed]: 'bg-purple-500/20 text-purple-400',
        [InvoiceStatus.Revoked]: 'bg-gray-500/20 text-gray-400',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
}

export function getDaysUntilDue(dueDate: number): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.ceil((dueDate - now) / 86400);
}

export function calculateInterest(
    amount: string,
    createdAt: number,
    dueDate: number,
    isOverdue: boolean
): string {
    const principal = parseFloat(amount);
    const now = Math.floor(Date.now() / 1000);
    const daysElapsed = Math.floor((now - createdAt) / 86400);

    const rate = isOverdue
        ? CONTRACT_CONFIG.PENALTY_RATE
        : CONTRACT_CONFIG.BASE_INTEREST_RATE;

    // Simple interest: P * R * T / (100 * 365)
    const interest = (principal * rate * daysElapsed) / (10000 * 365);

    return (principal + interest).toString();
}

// Calculate current auction price
export function calculateAuctionPrice(invoice: Invoice): string {
    if (!invoice.auctionStart || invoice.status !== InvoiceStatus.Funding) {
        return invoice.amount;
    }

    const now = Math.floor(Date.now() / 1000);
    
    // If auction ended, return min price
    if (now >= invoice.auctionEnd) {
        return invoice.minPrice;
    }

    const hoursElapsed = (now - invoice.auctionStart) / 3600;
    const startPrice = parseFloat(invoice.startPrice);
    const minPrice = parseFloat(invoice.minPrice);
    
    // Calculate price drop
    const totalDrop = (startPrice * invoice.priceDropRate * hoursElapsed) / 10000;
    const currentPrice = Math.max(startPrice - totalDrop, minPrice);

    return currentPrice.toString();
}
