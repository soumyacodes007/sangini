// Sangini Contract Configuration
// Updated with deployed testnet addresses

export const CONTRACT_CONFIG = {
    // Deployed Contract Addresses (Updated 2026-01-05)
    INVOICE_CONTRACT: 'CCACZ6JQCHM6LQQUEQA2M4FDEYYH3FBQE63UIPKWRO7Y7PEZUK3K5OL3',
    TOKEN_CONTRACT: 'CCTWGR2JTPOD3RT3SDU3UMMWEO2XEV2LRKUN4OYMEP7DUY46FA4MIQ34',

    // Network Configuration
    NETWORK: 'testnet',
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    HORIZON_URL: 'https://horizon-testnet.stellar.org',
    SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',

    // Test Accounts (for demo)
    TEST_ACCOUNTS: {
        ADMIN: 'GDFCZILMBZBLAOYPKAJEG5ZBYTJ6KU6GAN5Q3APW7LN52XG4S4KGVFOP',
        SUPPLIER: 'GCWGZTQJBDMS5A7F6OVUSFJIWRNREM6PCYWWIHZG6P6D6GUS7YCPL7FV',
        BUYER: 'GBBLVFK64B4A5RHEZ2STRG6FFVHPTBXFXMWBFOM5HRDKSZXRDSOQRLI4',
        INVESTOR: 'GCKFM7PV6E3SY7W6ZZCNCIHLRUHF2K7PRPYP4KC4JBURUUXE66D5RUGX',
    },

    // Interest Rates (basis points)
    BASE_INTEREST_RATE: 1000, // 10%
    PENALTY_RATE: 2400, // 24%
    GRACE_PERIOD_DAYS: 30,
};

// Invoice Status enum matching contract
export enum InvoiceStatus {
    Draft = 'Draft',
    Verified = 'Verified',
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
    description: string;
    purchaseOrder: string;
    repaymentReceived: string;
    buyerSignedAt: number;
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

// Format helpers
export function formatAmount(amount: string | number, currency = 'INR'): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    // Assuming 7 decimal places like Stellar
    const realValue = value / 10000000;

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
        [InvoiceStatus.Draft]: 'badge-draft',
        [InvoiceStatus.Verified]: 'badge-verified',
        [InvoiceStatus.Funded]: 'badge-funded',
        [InvoiceStatus.Overdue]: 'badge-overdue',
        [InvoiceStatus.Settled]: 'badge-settled',
        [InvoiceStatus.Defaulted]: 'badge-defaulted',
        [InvoiceStatus.Disputed]: 'badge-disputed',
        [InvoiceStatus.Revoked]: 'badge-draft',
    };
    return colors[status] || 'badge-draft';
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
