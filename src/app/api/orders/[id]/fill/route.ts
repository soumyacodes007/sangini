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
    // Accept both 'tokenAmount' and 'amount' (frontend sends 'amount')
    const tokenAmount = body.tokenAmount || body.amount;

    if (!tokenAmount) {
      return NextResponse.json(
        { error: 'Token amount is required' },
        { status: 400 }
      );
    }

    // Safely parse the amount
    let tokenAmountBigInt: bigint;
    try {
      tokenAmountBigInt = BigInt(tokenAmount);
    } catch {
      return NextResponse.json(
        { error: 'Invalid token amount format' },
        { status: 400 }
      );
    }

    if (tokenAmountBigInt <= BigInt(0)) {
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
    if (tokenAmountBigInt > available) {
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
    // tokenAmount is in stroops (×10^7), pricePerToken is in stroops per token
    // So we need to divide by 10^7 to get correct payment in stroops
    const STROOP_MULTIPLIER = BigInt(10000000);
    const paymentAmount = (tokenAmountBigInt * BigInt(order.pricePerToken)) / STROOP_MULTIPLIER;

    // Build fill_order transaction
    const txXdr = await buildFillOrderTx(
      order.orderId,
      session.user.walletAddress,
      tokenAmountBigInt
    );

    return NextResponse.json({
      success: true,
      xdr: txXdr,
      fill: {
        orderId: order.orderId,
        tokenAmount,
        pricePerToken: order.pricePerToken,
        paymentAmount: paymentAmount.toString(),
        tokensRemainingAfter: (available - tokenAmountBigInt).toString(),
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
    // Must include all fields required by portfolio query: investor, purchasePrice, status
    const existingInvestment = await db.collection('investments').findOne({
      $or: [
        { invoiceId: order.invoiceId, investor: session.user.walletAddress },
        { invoiceId: order.invoiceId, investorAddress: session.user.walletAddress },
      ],
    });

    if (existingInvestment) {
      // Update existing investment - add tokens and cost basis
      const newTokenAmount = (BigInt(existingInvestment.tokenAmount || '0') + BigInt(tokenAmount)).toString();
      const newPurchasePrice = (BigInt(existingInvestment.purchasePrice || existingInvestment.investedAmount || '0') + BigInt(paymentAmount)).toString();

      await db.collection('investments').updateOne(
        { _id: existingInvestment._id },
        {
          $set: {
            tokenAmount: newTokenAmount,
            investedAmount: newPurchasePrice,
            purchasePrice: newPurchasePrice,  // Total cost basis
            investor: session.user.walletAddress,  // Ensure consistent field
            status: 'COMPLETED',
            updatedAt: new Date(),
          },
        }
      );
    } else {
      // Create new investment record with correct purchase price
      await db.collection('investments').insertOne({
        invoiceId: order.invoiceId,
        onChainInvoiceId: order.invoiceId,
        investorId: new ObjectId(session.user.id),
        investor: session.user.walletAddress,
        investorAddress: session.user.walletAddress,
        tokenAmount,
        purchasePrice: paymentAmount,  // What buyer actually paid
        investedAmount: paymentAmount,
        acquiredVia: 'SECONDARY_MARKET',
        timestamp: new Date(),
        investedAt: new Date(),
        txHash,
        status: 'COMPLETED',
      });
    }

    // CRITICAL FIX: Track seller's realized P&L from secondary market sale
    const sellerInvestment = await db.collection('investments').findOne({
      $or: [
        { invoiceId: order.invoiceId, investor: order.sellerAddress },
        { invoiceId: order.invoiceId, investorAddress: order.sellerAddress },
      ],
    });

    if (sellerInvestment) {
      const sellerNewTokenAmount = (BigInt(sellerInvestment.tokenAmount || '0') - BigInt(tokenAmount)).toString();
      const sellerOriginalCostBasis = BigInt(sellerInvestment.purchasePrice || sellerInvestment.investedAmount || '0');
      const sellerTokensTotal = BigInt(sellerInvestment.tokenAmount || '0');
      
      // Calculate proportional cost basis for tokens sold
      const costBasisForSoldTokens = sellerTokensTotal > BigInt(0)
        ? (sellerOriginalCostBasis * BigInt(tokenAmount)) / sellerTokensTotal
        : BigInt(0);
      
      // Calculate realized P&L: sale proceeds - cost basis
      const realizedPL = BigInt(paymentAmount) - costBasisForSoldTokens;
      
      // Remaining cost basis after sale
      const remainingCostBasis = sellerOriginalCostBasis - costBasisForSoldTokens;

      if (BigInt(sellerNewTokenAmount) <= BigInt(0)) {
        // Seller has sold all tokens - mark investment as sold
        await db.collection('investments').updateOne(
          { _id: sellerInvestment._id },
          {
            $set: {
              tokenAmount: '0',
              status: 'SOLD',
              soldAt: new Date(),
              soldAmount: paymentAmount,
              realizedPL: realizedPL.toString(),
              updatedAt: new Date(),
            },
          }
        );
      } else {
        // Seller still has some tokens remaining - update cost basis
        await db.collection('investments').updateOne(
          { _id: sellerInvestment._id },
          {
            $set: {
              tokenAmount: sellerNewTokenAmount,
              purchasePrice: remainingCostBasis.toString(),
              investedAmount: remainingCostBasis.toString(),
              updatedAt: new Date(),
            },
          }
        );
      }
      
      // Record the secondary market sale transaction for P&L tracking
      await db.collection('secondary_market_sales').insertOne({
        sellerId: order.sellerId,
        sellerAddress: order.sellerAddress,
        buyerId: new ObjectId(session.user.id),
        buyerAddress: session.user.walletAddress,
        orderId: order.orderId,
        orderDbId: order._id,
        invoiceId: order.invoiceId,
        tokenAmount,
        salePrice: paymentAmount,
        costBasis: costBasisForSoldTokens.toString(),
        realizedPL: realizedPL.toString(),
        soldAt: new Date(),
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
