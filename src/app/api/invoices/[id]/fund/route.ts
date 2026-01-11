import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tokenAmount, paymentAmount } = body;

    if (!tokenAmount || !paymentAmount) {
      return NextResponse.json(
        { error: 'Token amount and payment amount are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const walletAddress = session.user.walletAddress;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required for investment' },
        { status: 400 }
      );
    }

    // Check KYC status
    const user = await db.collection('users').findOne({
      walletAddress,
    });

    if (user?.kycStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'KYC verification required to invest' },
        { status: 403 }
      );
    }

    // Find the invoice
    let invoice;
    try {
      invoice = await db.collection('invoices').findOne({
        _id: new ObjectId(id),
      });
    } catch {
      invoice = await db.collection('invoices').findOne({
        invoiceId: id,
      });
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if invoice is in FUNDING status
    if (invoice.status !== 'FUNDING') {
      return NextResponse.json(
        { error: 'Invoice is not available for funding' },
        { status: 400 }
      );
    }

    // Check if auction is still active
    const now = Math.floor(Date.now() / 1000);
    if (invoice.auctionEnd && now > invoice.auctionEnd) {
      return NextResponse.json(
        { error: 'Auction has ended' },
        { status: 400 }
      );
    }

    // Check available tokens
    const tokensRemaining = BigInt(invoice.tokensRemaining || invoice.totalTokens || '0');
    const requestedTokens = BigInt(tokenAmount);

    if (requestedTokens > tokensRemaining) {
      return NextResponse.json(
        { error: 'Not enough tokens available' },
        { status: 400 }
      );
    }

    // Record the investment
    const investment = {
      invoiceId: invoice._id.toString(),
      investor: walletAddress,
      tokenAmount: tokenAmount,
      purchasePrice: paymentAmount,
      timestamp: new Date(),
      status: 'COMPLETED',
    };

    await db.collection('investments').insertOne(investment);

    // Update invoice tokens
    const newTokensSold = BigInt(invoice.tokensSold || '0') + requestedTokens;
    const newTokensRemaining = tokensRemaining - requestedTokens;

    const updateData: Record<string, unknown> = {
      tokensSold: newTokensSold.toString(),
      tokensRemaining: newTokensRemaining.toString(),
    };

    // If all tokens sold, mark as FUNDED
    if (newTokensRemaining === BigInt(0)) {
      updateData.status = 'FUNDED';
      updateData.fundedAt = now;
    }

    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      { $set: updateData }
    );

    // Log the transaction
    await db.collection('transactions').insertOne({
      type: 'INVESTMENT',
      invoiceId: invoice._id.toString(),
      investor: walletAddress,
      tokenAmount,
      paymentAmount,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Investment successful',
      tokensPurchased: tokenAmount,
      amountPaid: paymentAmount,
    });
  } catch (error) {
    console.error('Investment error:', error);
    return NextResponse.json(
      { error: 'Failed to process investment' },
      { status: 500 }
    );
  }
}
