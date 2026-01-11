// Secondary Market Orders API
// List and create sell orders
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { buildCreateSellOrderTx } from '@/lib/stellar/transaction';

// GET /api/orders - List orders with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const status = searchParams.get('status'); // 'open' | 'filled' | 'cancelled'
    const sellerId = searchParams.get('sellerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const db = await getDb();

    // Build query
    const query: Record<string, unknown> = {};

    if (invoiceId) {
      query.invoiceId = invoiceId;
    }

    if (status) {
      const statusMap: Record<string, string | { $in: string[] }> = {
        open: { $in: ['OPEN', 'PARTIALLY_FILLED'] },
        filled: 'FILLED',
        cancelled: 'CANCELLED',
      };
      query.status = statusMap[status.toLowerCase()] || status.toUpperCase();
    }

    if (sellerId) {
      if (ObjectId.isValid(sellerId)) {
        query.sellerId = new ObjectId(sellerId);
      } else {
        query.sellerAddress = sellerId;
      }
    }

    // Get orders
    const orders = await db
      .collection('sellOrders')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('sellOrders').countDocuments(query);

    // Get seller details
    const sellerIds = [...new Set(orders.map((o) => o.sellerId?.toString()).filter(Boolean))];
    const sellers = await db
      .collection('users')
      .find({ _id: { $in: sellerIds.map((id) => new ObjectId(id)) } })
      .toArray();
    const sellerMap = new Map(sellers.map((s) => [s._id.toString(), s]));

    // Transform response
    const response = orders.map((order) => {
      const seller = order.sellerId ? sellerMap.get(order.sellerId.toString()) : null;
      return {
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
      };
    });

    return NextResponse.json({
      orders: response,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List orders error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list orders' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create sell order (returns XDR)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Must have a wallet to create orders
    if (!session.user.walletAddress) {
      return NextResponse.json(
        { error: 'Wallet not connected' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { invoiceId, tokenAmount, pricePerToken } = body;

    // Validation
    if (!invoiceId || !tokenAmount || !pricePerToken) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, tokenAmount, pricePerToken' },
        { status: 400 }
      );
    }

    if (BigInt(tokenAmount) <= 0 || BigInt(pricePerToken) <= 0) {
      return NextResponse.json(
        { error: 'Token amount and price must be greater than 0' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify invoice exists and is in valid state
    const invoice = await db.collection('invoices').findOne({ invoiceId });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!['VERIFIED', 'FUNDING', 'FUNDED'].includes(invoice.status)) {
      return NextResponse.json(
        { error: `Cannot create order. Invoice status: ${invoice.status}` },
        { status: 400 }
      );
    }

    // Check if user has enough tokens (from investments or as supplier)
    const userHolding = await db.collection('investments').findOne({
      invoiceId,
      investorAddress: session.user.walletAddress,
    });

    const isSupplier = invoice.supplierAddress === session.user.walletAddress;
    
    let availableTokens = BigInt(0);
    if (isSupplier) {
      // Supplier has remaining tokens
      availableTokens = BigInt(invoice.tokensRemaining || invoice.totalTokens || invoice.amount);
    } else if (userHolding) {
      availableTokens = BigInt(userHolding.tokenAmount);
    }

    if (BigInt(tokenAmount) > availableTokens) {
      return NextResponse.json(
        { error: `Insufficient tokens. Available: ${availableTokens.toString()}` },
        { status: 400 }
      );
    }

    // Build create_sell_order transaction
    const txXdr = await buildCreateSellOrderTx(
      invoiceId,
      session.user.walletAddress,
      BigInt(tokenAmount),
      BigInt(pricePerToken)
    );

    // Calculate total value
    const totalValue = BigInt(tokenAmount) * BigInt(pricePerToken);

    return NextResponse.json({
      success: true,
      xdr: txXdr,
      order: {
        invoiceId,
        tokenAmount,
        pricePerToken,
        totalValue: totalValue.toString(),
      },
      message: 'Sign this transaction to create the sell order',
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    );
  }
}

// PUT /api/orders - Confirm order creation
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { txHash, orderId, invoiceId, tokenAmount, pricePerToken } = body;

    if (!txHash || !orderId || !invoiceId || !tokenAmount || !pricePerToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Create order record
    await db.collection('sellOrders').insertOne({
      orderId,
      invoiceId,
      sellerId: new ObjectId(session.user.id),
      sellerAddress: session.user.walletAddress,
      tokenAmount,
      pricePerToken,
      tokensRemaining: tokenAmount,
      status: 'OPEN',
      txHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      orderId,
      txHash,
      message: 'Sell order created successfully',
    });
  } catch (error) {
    console.error('Confirm order error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm order' },
      { status: 500 }
    );
  }
}
