// Insurance Claim API
// POST /api/insurance/claim - Claim insurance on defaulted invoice
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import {
  buildClaimInsuranceTx,
  getTokenHolding,
  getInvoiceFromContract,
  submitTransaction,
  signTransaction,
} from '@/lib/stellar/transaction';
import { decryptPrivateKey } from '@/lib/custodial';
import { Keypair } from '@stellar/stellar-sdk';

// Helper to build invoice query
function buildInvoiceQuery(id: string): Record<string, unknown> {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { invoiceId: id }] };
  }
  return { invoiceId: id };
}

// POST /api/insurance/claim - Claim insurance for defaulted invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only investors can claim insurance
    if (session.user.userType !== 'INVESTOR') {
      return NextResponse.json(
        { error: 'Only investors can claim insurance' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get invoice from database
    const invoice = await db.collection('invoices').findOne(buildInvoiceQuery(invoiceId));
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check invoice is defaulted
    if (invoice.status !== 'DEFAULTED') {
      return NextResponse.json(
        { error: 'Insurance can only be claimed on defaulted invoices' },
        { status: 400 }
      );
    }

    // Check if user has already claimed
    const existingClaim = await db.collection('insurance_claims').findOne({
      invoiceId: invoice.invoiceId,
      investorId: new ObjectId(session.user.id),
    });

    if (existingClaim) {
      return NextResponse.json(
        { error: 'Insurance already claimed for this invoice', claim: existingClaim },
        { status: 400 }
      );
    }

    // Check user has holdings in this invoice
    const investment = await db.collection('investments').findOne({
      invoiceId: invoice.invoiceId,
      investorId: new ObjectId(session.user.id),
    });

    if (!investment) {
      return NextResponse.json(
        { error: 'You have no investment in this invoice' },
        { status: 400 }
      );
    }

    const investorAddress = session.user.walletAddress;
    if (!investorAddress) {
      return NextResponse.json(
        { error: 'Wallet address not found' },
        { status: 400 }
      );
    }

    // Try to get on-chain holding info
    let holdingAmount = investment.tokenAmount;
    let acquiredPrice = investment.paymentAmount;

    try {
      const onChainHolding = await getTokenHolding(invoice.invoiceId, investorAddress);
      if (onChainHolding) {
        holdingAmount = onChainHolding.amount;
        acquiredPrice = onChainHolding.acquiredPrice;
      }
    } catch {
      // Use database values if contract call fails
    }

    // Calculate expected claim amount (50% of acquired price per contract logic)
    const expectedClaimAmount = BigInt(acquiredPrice) / BigInt(2);

    // Build the claim transaction
    const xdr = await buildClaimInsuranceTx(invoice.invoiceId, investorAddress);

    // Create pending claim record
    const claimRecord = {
      invoiceId: invoice.invoiceId,
      investorId: new ObjectId(session.user.id),
      investorAddress,
      holdingAmount: holdingAmount.toString(),
      acquiredPrice: acquiredPrice.toString(),
      expectedClaimAmount: expectedClaimAmount.toString(),
      status: 'PENDING',
      createdAt: new Date(),
      xdr,
    };

    await db.collection('insurance_claims').insertOne(claimRecord);

    return NextResponse.json({
      success: true,
      xdr,
      claim: {
        invoiceId: invoice.invoiceId,
        holdingAmount: holdingAmount.toString(),
        acquiredPrice: acquiredPrice.toString(),
        expectedClaimAmount: expectedClaimAmount.toString(),
      },
      message: 'Sign and submit the transaction to claim insurance',
    });
  } catch (error) {
    console.error('Insurance claim error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create claim' },
      { status: 500 }
    );
  }
}

// GET /api/insurance/claim - Get user's claims
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const db = await getDb();

    const query: Record<string, unknown> = {
      investorId: new ObjectId(session.user.id),
    };

    if (invoiceId) {
      query.invoiceId = invoiceId;
    }
    if (status) {
      query.status = status.toUpperCase();
    }

    const claims = await db
      .collection('insurance_claims')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('insurance_claims').countDocuments(query);

    return NextResponse.json({
      claims: claims.map((c) => ({
        id: c._id.toString(),
        invoiceId: c.invoiceId,
        holdingAmount: c.holdingAmount,
        acquiredPrice: c.acquiredPrice,
        expectedClaimAmount: c.expectedClaimAmount,
        actualClaimAmount: c.actualClaimAmount,
        status: c.status,
        txHash: c.txHash,
        createdAt: c.createdAt,
        processedAt: c.processedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get claims error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get claims' },
      { status: 500 }
    );
  }
}
