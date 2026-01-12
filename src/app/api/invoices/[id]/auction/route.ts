// Start Auction API
// Supplier starts a Dutch auction for their verified invoice
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { buildStartAuctionTx } from '@/lib/stellar/transaction';
import { StartAuctionRequest } from '@/lib/db/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/invoices/:id/auction - Start auction (returns XDR)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only suppliers can start auctions
    if (session.user.userType !== 'SUPPLIER') {
      return NextResponse.json(
        { error: 'Only suppliers can start auctions' },
        { status: 403 }
      );
    }

    if (!session.user.walletAddress) {
      return NextResponse.json(
        { error: 'Wallet not connected' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const body: StartAuctionRequest = await request.json();
    const { durationHours, maxDiscountBps } = body;

    // Validation
    if (!durationHours || durationHours <= 0) {
      return NextResponse.json(
        { error: 'Duration must be greater than 0 hours' },
        { status: 400 }
      );
    }

    if (!maxDiscountBps || maxDiscountBps <= 0 || maxDiscountBps > 5000) {
      return NextResponse.json(
        { error: 'Max discount must be between 1 and 5000 basis points (0.01% - 50%)' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Find invoice
    const query: Record<string, unknown> = {};
    if (ObjectId.isValid(id)) {
      query.$or = [{ _id: new ObjectId(id) }, { invoiceId: id }];
    } else {
      query.invoiceId = id;
    }

    const invoice = await db.collection('invoices').findOne(query);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Verify ownership
    if (invoice.supplierAddress !== session.user.walletAddress) {
      return NextResponse.json(
        { error: 'Not authorized to start auction for this invoice' },
        { status: 403 }
      );
    }

    // Check status
    if (invoice.status !== 'VERIFIED') {
      return NextResponse.json(
        { error: `Cannot start auction. Invoice status: ${invoice.status}. Must be VERIFIED.` },
        { status: 400 }
      );
    }

    // Build the start_auction transaction
    // Use onChainId (the actual contract invoice ID) if available
    const contractInvoiceId = invoice.onChainId || invoice.invoiceId;
    
    console.log('Starting auction for contract invoice ID:', contractInvoiceId);
    
    const txXdr = await buildStartAuctionTx(
      contractInvoiceId,
      session.user.walletAddress,
      BigInt(durationHours),
      maxDiscountBps
    );

    return NextResponse.json({
      success: true,
      xdr: txXdr,
      auctionParams: {
        durationHours,
        maxDiscountBps,
        maxDiscountPercent: (maxDiscountBps / 100).toFixed(2) + '%',
      },
      message: 'Sign this transaction to start the auction',
    });
  } catch (error) {
    console.error('Start auction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start auction' },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/:id/auction - Confirm auction started
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { txHash, durationHours, maxDiscountBps } = body;

    if (!txHash) {
      return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
    }

    const db = await getDb();

    const putQuery: Record<string, unknown> = {};
    if (ObjectId.isValid(id)) {
      putQuery.$or = [{ _id: new ObjectId(id) }, { invoiceId: id }];
    } else {
      putQuery.invoiceId = id;
    }

    const invoice = await db.collection('invoices').findOne(putQuery);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Calculate auction times
    const now = new Date();
    const auctionEnd = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
    const startPrice = invoice.amount;
    const minPrice = (BigInt(invoice.amount) - (BigInt(invoice.amount) * BigInt(maxDiscountBps) / BigInt(10000))).toString();
    
    // Total tokens = invoice amount (1:1 tokenization)
    const totalTokens = invoice.amount;

    // Update invoice
    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      {
        $set: {
          status: 'FUNDING',
          auctionStart: now,
          auctionEnd,
          startPrice,
          minPrice,
          priceDropRate: 50, // Default 0.5% per hour
          totalTokens: totalTokens,
          tokensSold: '0',
          tokensRemaining: totalTokens,
          auctionTxHash: txHash,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      txHash,
      auction: {
        startTime: now.toISOString(),
        endTime: auctionEnd.toISOString(),
        startPrice,
        minPrice,
        totalTokens,
        tokensRemaining: totalTokens,
      },
    });
  } catch (error) {
    console.error('Confirm auction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm auction' },
      { status: 500 }
    );
  }
}
