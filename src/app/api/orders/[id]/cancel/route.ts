// Cancel Order API
// Seller cancels their sell order
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { buildCancelOrderTx } from '@/lib/stellar/transaction';

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

// POST /api/orders/:id/cancel - Cancel order (returns XDR)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Must have a wallet
    if (!session.user.walletAddress) {
      return NextResponse.json(
        { error: 'Wallet not connected' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const db = await getDb();

    const order = await db.collection('sellOrders').findOne(buildOrderQuery(id));

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only seller can cancel
    if (order.sellerAddress !== session.user.walletAddress) {
      return NextResponse.json(
        { error: 'Only the seller can cancel this order' },
        { status: 403 }
      );
    }

    // Check order status
    if (order.status === 'FILLED') {
      return NextResponse.json(
        { error: 'Cannot cancel a filled order' },
        { status: 400 }
      );
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Order is already cancelled' },
        { status: 400 }
      );
    }

    // Build cancel_order transaction
    const txXdr = await buildCancelOrderTx(
      order.orderId,
      session.user.walletAddress
    );

    return NextResponse.json({
      success: true,
      xdr: txXdr,
      order: {
        orderId: order.orderId,
        tokensRemaining: order.tokensRemaining,
        status: order.status,
      },
      message: 'Sign this transaction to cancel the order',
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel order' },
      { status: 500 }
    );
  }
}

// PUT /api/orders/:id/cancel - Confirm order cancellation
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { txHash } = body;

    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const order = await db.collection('sellOrders').findOne(buildOrderQuery(id));

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify ownership
    if (order.sellerAddress !== session.user.walletAddress) {
      return NextResponse.json(
        { error: 'Not authorized to cancel this order' },
        { status: 403 }
      );
    }

    // Update order status
    await db.collection('sellOrders').updateOne(
      { _id: order._id },
      {
        $set: {
          status: 'CANCELLED',
          cancelTxHash: txHash,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      txHash,
      orderId: order.orderId,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('Confirm cancel error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm cancellation' },
      { status: 500 }
    );
  }
}
