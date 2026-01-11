// Single Order API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

// GET /api/orders/:id - Get order details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();

    const order = await db.collection('sellOrders').findOne(buildOrderQuery(id));

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get seller details
    const seller = order.sellerId
      ? await db.collection('users').findOne({ _id: order.sellerId })
      : null;

    // Get invoice details
    const invoice = await db.collection('invoices').findOne({ invoiceId: order.invoiceId });

    return NextResponse.json({
      id: order._id.toString(),
      orderId: order.orderId,
      invoiceId: order.invoiceId,
      seller: {
        id: order.sellerId?.toString(),
        name: seller?.name || seller?.companyName,
        address: order.sellerAddress,
      },
      tokenAmount: order.tokenAmount,
      pricePerToken: order.pricePerToken,
      tokensRemaining: order.tokensRemaining,
      totalValue: (BigInt(order.tokensRemaining || order.tokenAmount) * BigInt(order.pricePerToken)).toString(),
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      txHash: order.txHash,
      invoice: invoice ? {
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: invoice.dueDate,
      } : null,
    });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get order' },
      { status: 500 }
    );
  }
}
