// Fill Order API
// Buy tokens from a sell order
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { buildFillOrderTx } from '@/lib/stellar/transaction';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to build order query
function buildOrderQuery(id: string): Record<string, unknown> {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { orderId: id }] };
  }
  return { orderId: id };
}

// POST /api/orders/:id/fill - Fill order (returns XDR)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check KYC for investors
    if (session.user.userType === 'INVESTOR' && session.user.kycStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'KYC approval required to buy tokens' },
        { status: 403 }
      );
    }

    // Must have a wallet
    if (!session.user.walletAddress) {
      return NextResponse.json(
        { error: 'Wallet not connected' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { tokenAmount } = body;

    if (!tokenAmount || BigInt(tokenAmount) <= 0) {
      return NextResponse.json(
        { error: 'Token amount must be greater than 0' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const order = await db.collection('sellOrders').findOne(buildOrderQuery(id));

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check order status
    if (!['OPEN', 'PARTIALLY_FILLED'].includes(order.status)) {
      return NextResponse.json(
        { error: `Order is not active. Status: ${order.status}` },
        { status: 400 }
      );
    }

    // Check available tokens
    const available = BigInt(order.tokensRemaining);
    if (BigInt(tokenAmount) > available) {
      return NextResponse.json(
        { error: `Insufficient tokens available. Max: ${available.toString()}` },
        { status: 400 }
      );
    }

    // Can't buy from yourself
    if (order.sellerAddress === session.user.walletAddress) {
      return NextResponse.json(
        { error: 'Cannot buy from your own order' },
        { status: 400 }
      );
    }

    // Calculate payment
    const paymentAmount = BigInt(tokenAmount) * BigInt(order.pricePerToken);

    // Build fill_order transaction
    const txXdr = await buildFillOrderTx(
      order.orderId,
      session.user.walletAddress,
      BigInt(tokenAmount)
    );

    return NextResponse.json({
      success: true,
      xdr: txXdr,
      fill: {
        orderId: order.orderId,
        tokenAmount,
        pricePerToken: order.pricePerToken,
        paymentAmount: paymentAmount.toString(),
        tokensRemainingAfter: (available - BigInt(tokenAmount)).toString(),
      },
      message: 'Sign this transaction to complete the purchase',
    });
  } catch (error) {
    console.error('Fill order error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fill order' },
      { status: 500 }
    );
  }
}

// PUT /api/orders/:id/fill - Confirm order fill
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

    const order = await db.collection('sellOrders').findOne(buildOrderQuery(id));

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update order
    const newTokensRemaining = (BigInt(order.tokensRemaining) - BigInt(tokenAmount)).toString();
    const newStatus = BigInt(newTokensRemaining) <= 0 ? 'FILLED' : 'PARTIALLY_FILLED';

    // Update order tokens and status
    await db.collection('sellOrders').updateOne(
      { _id: order._id },
      {
        $set: {
          tokensRemaining: newTokensRemaining,
          status: newStatus,
          updatedAt: new Date(),
        },
      }
    );

    // Add fill record separately
    await db.collection('orderFills').insertOne({
      orderId: order.orderId,
      orderDbId: order._id,
      buyerId: new ObjectId(session.user.id),
      buyerAddress: session.user.walletAddress,
      tokenAmount,
      paymentAmount,
      txHash,
      filledAt: new Date(),
    });

    // Record as investment for the buyer
    const existingInvestment = await db.collection('investments').findOne({
      invoiceId: order.invoiceId,
      investorAddress: session.user.walletAddress,
    });

    if (existingInvestment) {
      // Update existing investment
      await db.collection('investments').updateOne(
        { _id: existingInvestment._id },
        {
          $set: {
            tokenAmount: (BigInt(existingInvestment.tokenAmount) + BigInt(tokenAmount)).toString(),
            investedAmount: (BigInt(existingInvestment.investedAmount) + BigInt(paymentAmount)).toString(),
            updatedAt: new Date(),
          },
        }
      );
    } else {
      // Create new investment record
      await db.collection('investments').insertOne({
        invoiceId: order.invoiceId,
        investorId: new ObjectId(session.user.id),
        investorAddress: session.user.walletAddress,
        tokenAmount,
        investedAmount: paymentAmount,
        acquiredVia: 'SECONDARY_MARKET',
        investedAt: new Date(),
        txHash,
      });
    }

    return NextResponse.json({
      success: true,
      txHash,
      fill: {
        orderId: order.orderId,
        tokenAmount,
        paymentAmount,
        orderStatus: newStatus,
      },
    });
  } catch (error) {
    console.error('Confirm fill error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm fill' },
      { status: 500 }
    );
  }
}
