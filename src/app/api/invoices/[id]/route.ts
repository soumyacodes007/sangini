// Invoice Detail API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { DbInvoice, InvoiceResponse } from '@/lib/db/types';
import { getCurrentPrice, getInvoiceFromContract } from '@/lib/stellar/transaction';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/invoices/:id - Get invoice details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();

    // Find invoice by MongoDB ID or on-chain invoiceId
    const query: Record<string, unknown> = {};
    if (ObjectId.isValid(id)) {
      query.$or = [{ _id: new ObjectId(id) }, { invoiceId: id }];
    } else {
      query.invoiceId = id;
    }

    const invoice = await db.collection<DbInvoice>('invoices').findOne(query);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get supplier and buyer details
    const [supplier, buyer] = await Promise.all([
      invoice.supplierId
        ? db.collection('users').findOne({ _id: invoice.supplierId })
        : null,
      invoice.buyerId
        ? db.collection('users').findOne({ _id: invoice.buyerId })
        : null,
    ]);

    // Get current auction price if auction is active
    let currentPrice: string | undefined;
    if (invoice.status === 'FUNDING' && invoice.invoiceId) {
      try {
        const price = await getCurrentPrice(invoice.invoiceId);
        currentPrice = price.toString();
      } catch {
        // Auction might not be started on-chain yet
      }
    }

    // Get investments for this invoice
    const investments = await db
      .collection('investments')
      .find({ invoiceId: invoice.invoiceId })
      .toArray();

    // Get open sell orders
    const sellOrders = await db
      .collection('sellOrders')
      .find({ 
        invoiceId: invoice.invoiceId,
        status: { $in: ['OPEN', 'PARTIALLY_FILLED'] }
      })
      .toArray();

    // Build response
    const response: InvoiceResponse & { 
      investments?: unknown[]; 
      sellOrders?: unknown[];
      onChainData?: unknown;
    } = {
      id: invoice._id.toString(),
      invoiceId: invoice.invoiceId,
      supplier: {
        id: invoice.supplierId?.toString() || '',
        name: supplier?.name || supplier?.companyName,
        address: invoice.supplierAddress,
      },
      buyer: {
        id: invoice.buyerId?.toString(),
        name: buyer?.name || buyer?.companyName,
        address: invoice.buyerAddress,
      },
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.dueDate.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
      verifiedAt: invoice.verifiedAt?.toISOString(),
      settledAt: invoice.settledAt?.toISOString(),
      description: invoice.description,
      purchaseOrder: invoice.purchaseOrder,
      documentHash: invoice.documentHash,
      auction: invoice.auctionStart
        ? {
            isActive: invoice.status === 'FUNDING',
            startTime: invoice.auctionStart?.toISOString(),
            endTime: invoice.auctionEnd?.toISOString(),
            startPrice: invoice.startPrice,
            currentPrice,
            minPrice: invoice.minPrice,
          }
        : undefined,
      tokens: invoice.totalTokens
        ? {
            symbol: invoice.tokenSymbol,
            total: invoice.totalTokens,
            sold: invoice.tokensSold,
            remaining: invoice.tokensRemaining,
          }
        : undefined,
      investments: investments.map((inv) => ({
        id: inv._id.toString(),
        investorAddress: inv.investorAddress,
        tokenAmount: inv.tokenAmount,
        investedAmount: inv.investedAmount,
        investedAt: inv.investedAt,
      })),
      sellOrders: sellOrders.map((order) => ({
        id: order._id.toString(),
        orderId: order.orderId,
        sellerAddress: order.sellerAddress,
        tokenAmount: order.tokenAmount,
        pricePerToken: order.pricePerToken,
        tokensRemaining: order.tokensRemaining,
        status: order.status,
      })),
    };

    // Optionally fetch on-chain data
    const includeOnChain = request.nextUrl.searchParams.get('onchain') === 'true';
    if (includeOnChain && invoice.invoiceId) {
      try {
        response.onChainData = await getInvoiceFromContract(invoice.invoiceId);
      } catch {
        // Contract call failed, skip on-chain data
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get invoice error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get invoice' },
      { status: 500 }
    );
  }
}
