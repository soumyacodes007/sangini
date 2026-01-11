// Database Types for MongoDB Collections

import { ObjectId } from 'mongodb';

// Invoice Status matching smart contract
export type InvoiceStatus = 
  | 'DRAFT'
  | 'VERIFIED'
  | 'FUNDING'
  | 'FUNDED'
  | 'OVERDUE'
  | 'SETTLED'
  | 'DEFAULTED'
  | 'DISPUTED'
  | 'REVOKED';

// User types
export type UserType = 'SUPPLIER' | 'BUYER' | 'INVESTOR' | 'ADMIN';
export type KYCStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Database User document
export interface DbUser {
  _id: ObjectId;
  email?: string;
  password?: string;
  name?: string;
  userType: UserType;
  companyName?: string;
  walletAddress?: string;
  custodialPubKey?: string;
  custodialSecret?: string;
  kycStatus: KYCStatus;
  walletFunded?: boolean;
  fundingTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Database Invoice document
export interface DbInvoice {
  _id: ObjectId;
  invoiceId: string;           // On-chain ID (e.g., "INV-1001")
  
  // Parties
  supplierId: ObjectId;
  supplierAddress: string;
  buyerId?: ObjectId;
  buyerAddress: string;
  
  // Financial
  amount: string;              // Store as string for precision
  currency: string;
  
  // Dates
  createdAt: Date;
  dueDate: Date;
  verifiedAt?: Date;
  settledAt?: Date;
  
  // Status
  status: InvoiceStatus;
  
  // Token details
  tokenSymbol?: string;
  totalTokens?: string;
  tokensSold?: string;
  tokensRemaining?: string;
  
  // Metadata
  description: string;
  purchaseOrder: string;
  documentHash?: string;
  
  // Auction
  auctionStart?: Date;
  auctionEnd?: Date;
  startPrice?: string;
  minPrice?: string;
  priceDropRate?: number;
  
  // Settlement
  repaymentReceived?: string;
  
  // Transaction hashes
  createTxHash?: string;
  verifyTxHash?: string;
  settleTxHash?: string;
  
  updatedAt: Date;
}

// Database Investment document
export interface DbInvestment {
  _id: ObjectId;
  invoiceId: string;
  investorId: ObjectId;
  investorAddress: string;
  tokenAmount: string;
  investedAmount: string;
  discountRate?: number;
  investedAt: Date;
  settledAmount?: string;
  settledAt?: Date;
  txHash: string;
}

// Database Sell Order document
export interface DbSellOrder {
  _id: ObjectId;
  orderId: string;             // On-chain ID
  invoiceId: string;
  sellerId: ObjectId;
  sellerAddress: string;
  tokenAmount: string;
  pricePerToken: string;
  tokensRemaining: string;
  status: 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
  txHash?: string;
}

// API Response types
export interface InvoiceResponse {
  id: string;
  invoiceId: string;
  supplier: {
    id: string;
    name?: string;
    address: string;
  };
  buyer: {
    id?: string;
    name?: string;
    address: string;
  };
  amount: string;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  verifiedAt?: string;
  settledAt?: string;
  description: string;
  purchaseOrder: string;
  documentHash?: string;
  auction?: {
    isActive: boolean;
    startTime?: string;
    endTime?: string;
    startPrice?: string;
    currentPrice?: string;
    minPrice?: string;
  };
  tokens?: {
    symbol?: string;
    total?: string;
    sold?: string;
    remaining?: string;
  };
}

// Create Invoice request
export interface CreateInvoiceRequest {
  buyerAddress: string;
  amount: string;
  currency: string;
  dueDate: string;           // ISO date string
  description: string;
  purchaseOrder: string;
  documentHash?: string;
}

// Start Auction request
export interface StartAuctionRequest {
  durationHours: number;
  maxDiscountBps: number;    // Basis points (1500 = 15%)
}

// Invest request
export interface InvestRequest {
  tokenAmount: string;
}
