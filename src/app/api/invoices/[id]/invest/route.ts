// Investment API
// Investors purchase invoice tokens
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { buildInvestTx, getCurrentPrice } from '@/lib/stellar/transaction';
import { InvestRequest } from '@/lib/db/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to build invoice query
function buildInvoiceQuery(id: string): Record<string, unknown> {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { invoiceId: id }] };
  }
  return { invoiceId: id };
}

// GET /api/invoices/:id/invest - Get investment info (current price, available tokens)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();
    const invoice = await db.collection('invoices').findOne(buildInvoiceQuery(id));

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get current price from contract
    let currentPrice: string = invoice.amount;
    if (invoice.invoiceId && (invoice.status === 'FUNDING' || invoice.status === 'VERIFIED')) {
      try {
        const price = await getCurrentPrice(invoice.invoiceId);
        currentPrice = price.toString();
      } catch {
        // Use face value if auction not started
      }
    }

    // Calculate discount
    const faceValue = BigInt(invoice.amount);
    const current = BigInt(currentPrice);
    const discountBps = faceValue > 0
      ? Number((faceValue - current) * BigInt(10000) / faceValue)
      : 0;

    return NextResponse.json({
      invoiceId: invoice.invoiceId,
      status: invoice.status,
      faceValue: invoice.amount,
      currentPrice,
      discountBps,
      discountPercent: (discountBps / 100).toFixed(2) + '%',
      tokensAvailable: invoice.tokensRemaining || invoice.totalTokens || invoice.amount,
      tokensSold: invoice.tokensSold || '0',
      auction: invoice.auctionStart ? {
        isActive: invoice.status === 'FUNDING',
        startTime: invoice.auctionStart,
        endTime: invoice.auctionEnd,
        minPrice: invoice.minPrice,
      } : null,
      canInvest: ['VERIFIED', 'FUNDING'].includes(invoice.status),
    });
  } catch (error) {
    console.error('Get investment info error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get investment info' },
      { status: 500 }
    );
  }
}

// POST /api/invoices/:id/invest - Invest in invoice (returns XDR)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only investors can invest
    if (session.user.userType !== 'INVESTOR') {
      return NextResponse.json(
        { error: 'Only investors can invest in invoices' },
        { status: 403 }
      );
    }

    // Check KYC status
    if (session.user.kycStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'KYC approval required to invest' },
        { status: 403 }
      );
    }

    // Investors must have a wallet
    if (!session.user.walletAddress) {
      return NextResponse.json(
        { error: 'Wallet not connected' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const body: InvestRequest = await request.json();
    const { tokenAmount } = body;

    if (!tokenAmount || BigInt(tokenAmount) <= 0) {
      return NextResponse.json(
        { error: 'Token amount must be greater than 0' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const invoice = await db.collection('invoices').findOne(buildInvoiceQuery(id));

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check status
    if (!['VERIFIED', 'FUNDING'].includes(invoice.status)) {
      return NextResponse.json(
        { error: `Cannot invest. Invoice status: ${invoice.status}` },
        { status: 400 }
      );
    }

    // Check available tokens
    const available = BigInt(invoice.tokensRemaining || invoice.totalTokens || invoice.amount);
    if (BigInt(tokenAmount) > available) {
      return NextResponse.json(
        { error: `Insufficient tokens available. Max: ${available.toString()}` },
        { status: 400 }
      );
    }

    // Get current price
    let currentPrice: bigint;
    try {
      currentPrice = await getCurrentPrice(invoice.invoiceId);
    } catch {
      currentPrice = BigInt(invoice.amount);
    }

    // Calculate payment amount
    const totalTokens = BigInt(invoice.totalTokens || invoice.amount);
    const paymentAmount = (BigInt(tokenAmount) * currentPrice) / totalTokens;

    // Build invest transaction
    const txXdr = await buildInvestTx(
      invoice.invoiceId,
      session.user.walletAddress,
      BigInt(tokenAmount)
    );

    return NextResponse.json({
      success: true,
      xdr: txXdr,
      investment: {
        tokenAmount,
        currentPrice: currentPrice.toString(),
        paymentAmount: paymentAmount.toString(),
        discountFromFace: ((BigInt(invoice.amount) - currentPrice) * BigInt(10000) / BigInt(invoice.amount)).toString() + ' bps',
      },
      message: 'Sign this transaction to complete your investment',
    });
  } catch (error) {
    console.error('Invest error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create investment' },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/:id/invest - Confirm investment
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { txHash, tokenAmount, paymentAmount } = body;

    if (!txHash || !tokenAmount) {
      return NextResponse.json(
        { error: 'Transaction hash and token amount required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const invoice = await db.collection('invoices').findOne(buildInvoiceQuery(id));

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Record investment - using consistent structure with /fund endpoint
    await db.collection('investments').insertOne({
      invoiceId: invoice._id.toString(),
      onChainInvoiceId: invoice.onChainId || invoice.invoiceId,
      investorId: new ObjectId(session.user.id),
      investor: session.user.walletAddress,  // Consistent with /fund endpoint
      tokenAmount,
      purchasePrice: paymentAmount,  // Consistent with /fund endpoint
      investedAmount: paymentAmount, // Keep for backwards compatibility
      txHash,
      timestamp: new Date(),
      investedAt: new Date(),
      status: 'COMPLETED',  // Required by portfolio query
    });

    // Update invoice token counts
    const newTokensSold = (BigInt(invoice.tokensSold || '0') + BigInt(tokenAmount)).toString();
    const newTokensRemaining = (BigInt(invoice.tokensRemaining || invoice.amount) - BigInt(tokenAmount)).toString();

    const updateData: Record<string, unknown> = {
      tokensSold: newTokensSold,
      tokensRemaining: newTokensRemaining,
      updatedAt: new Date(),
    };

    // If all tokens sold, update status to FUNDED
    if (BigInt(newTokensRemaining) <= 0) {
      updateData.status = 'FUNDED';
    }

    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      { $set: updateData }
    );

    return NextResponse.json({
      success: true,
      txHash,
      investment: {
        tokenAmount,
        paymentAmount,
        invoiceId: invoice.invoiceId,
      },
      invoiceStatus: BigInt(newTokensRemaining) <= 0 ? 'FUNDED' : invoice.status,
    });
  } catch (error) {
    console.error('Confirm investment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm investment' },
      { status: 500 }
    );
  }
}
