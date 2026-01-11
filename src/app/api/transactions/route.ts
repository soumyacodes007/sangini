// Transaction History API
// GET /api/transactions - Get user's transaction history
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const HORIZON_URL = process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org';

const CONTRACT_ID = process.env.NEXT_PUBLIC_INVOICE_CONTRACT || '';

// GET /api/transactions - Get transaction history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'all' | 'invoices' | 'investments' | 'orders'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const db = await getDb();
    const userId = new ObjectId(session.user.id);
    const walletAddress = session.user.walletAddress;

    const transactions: Array<{
      id: string;
      type: string;
      action: string;
      amount?: string;
      invoiceId?: string;
      orderId?: string;
      txHash?: string;
      status: string;
      createdAt: Date;
      details?: Record<string, unknown>;
    }> = [];

    // Get invoice-related transactions
    if (!type || type === 'all' || type === 'invoices') {
      // Invoices created (supplier)
      const createdInvoices = await db.collection('invoices')
        .find({ supplierId: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      createdInvoices.forEach((inv) => {
        transactions.push({
          id: `inv-create-${inv._id}`,
          type: 'INVOICE',
          action: 'CREATED',
          amount: inv.amount?.toString(),
          invoiceId: inv.invoiceId,
          txHash: inv.createTxHash,
          status: inv.status,
          createdAt: inv.createdAt,
          details: { buyer: inv.buyerAddress },
        });
      });

      // Invoices approved (buyer)
      const approvedInvoices = await db.collection('invoices')
        .find({ buyerId: userId, verifiedAt: { $exists: true } })
        .sort({ verifiedAt: -1 })
        .limit(limit)
        .toArray();

      approvedInvoices.forEach((inv) => {
        if (inv.verifiedAt) {
          transactions.push({
            id: `inv-approve-${inv._id}`,
            type: 'INVOICE',
            action: 'APPROVED',
            amount: inv.amount?.toString(),
            invoiceId: inv.invoiceId,
            txHash: inv.verifyTxHash,
            status: 'COMPLETED',
            createdAt: inv.verifiedAt,
          });
        }
      });

      // Invoices settled (buyer)
      const settledInvoices = await db.collection('invoices')
        .find({ buyerId: userId, settledAt: { $exists: true } })
        .sort({ settledAt: -1 })
        .limit(limit)
        .toArray();

      settledInvoices.forEach((inv) => {
        if (inv.settledAt) {
          transactions.push({
            id: `inv-settle-${inv._id}`,
            type: 'INVOICE',
            action: 'SETTLED',
            amount: inv.repaymentReceived?.toString() || inv.amount?.toString(),
            invoiceId: inv.invoiceId,
            txHash: inv.settleTxHash,
            status: 'COMPLETED',
            createdAt: inv.settledAt,
          });
        }
      });
    }

    // Get investment transactions
    if (!type || type === 'all' || type === 'investments') {
      const investments = await db.collection('investments')
        .find({ investorId: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      investments.forEach((inv) => {
        transactions.push({
          id: `invest-${inv._id}`,
          type: 'INVESTMENT',
          action: 'INVESTED',
          amount: inv.paymentAmount?.toString(),
          invoiceId: inv.invoiceId,
          txHash: inv.txHash,
          status: inv.status || 'COMPLETED',
          createdAt: inv.createdAt,
          details: {
            tokenAmount: inv.tokenAmount?.toString(),
            pricePerToken: inv.pricePerToken?.toString(),
          },
        });
      });

      // Insurance claims
      const claims = await db.collection('insurance_claims')
        .find({ investorId: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      claims.forEach((claim) => {
        transactions.push({
          id: `claim-${claim._id}`,
          type: 'INSURANCE',
          action: 'CLAIMED',
          amount: claim.actualClaimAmount?.toString() || claim.expectedClaimAmount?.toString(),
          invoiceId: claim.invoiceId,
          txHash: claim.txHash,
          status: claim.status,
          createdAt: claim.createdAt,
        });
      });
    }

    // Get order transactions
    if (!type || type === 'all' || type === 'orders') {
      // Sell orders created
      const sellOrders = await db.collection('orders')
        .find({ sellerId: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      sellOrders.forEach((order) => {
        transactions.push({
          id: `order-create-${order._id}`,
          type: 'ORDER',
          action: 'SELL_ORDER_CREATED',
          amount: (BigInt(order.tokenAmount || 0) * BigInt(order.pricePerToken || 0)).toString(),
          invoiceId: order.invoiceId,
          orderId: order.orderId,
          txHash: order.createTxHash,
          status: order.status,
          createdAt: order.createdAt,
          details: {
            tokenAmount: order.tokenAmount?.toString(),
            pricePerToken: order.pricePerToken?.toString(),
          },
        });
      });

      // Orders filled (as buyer)
      const filledOrders = await db.collection('order_fills')
        .find({ buyerId: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      filledOrders.forEach((fill) => {
        transactions.push({
          id: `order-fill-${fill._id}`,
          type: 'ORDER',
          action: 'ORDER_FILLED',
          amount: fill.paymentAmount?.toString(),
          orderId: fill.orderId,
          invoiceId: fill.invoiceId,
          txHash: fill.txHash,
          status: 'COMPLETED',
          createdAt: fill.createdAt,
          details: {
            tokenAmount: fill.tokenAmount?.toString(),
          },
        });
      });
    }

    // Sort all transactions by date
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const paginatedTx = transactions.slice(skip, skip + limit);

    // Optionally fetch on-chain transactions from Horizon
    let horizonTransactions: unknown[] = [];
    if (walletAddress && searchParams.get('includeHorizon') === 'true') {
      try {
        const horizonRes = await fetch(
          `${HORIZON_URL}/accounts/${walletAddress}/transactions?limit=10&order=desc`
        );
        if (horizonRes.ok) {
          const horizonData = await horizonRes.json();
          horizonTransactions = horizonData._embedded?.records || [];
        }
      } catch {
        // Horizon fetch failed, continue without it
      }
    }

    return NextResponse.json({
      transactions: paginatedTx,
      pagination: {
        page,
        limit,
        total: transactions.length,
        totalPages: Math.ceil(transactions.length / limit),
      },
      horizon: horizonTransactions.length > 0 ? {
        transactions: horizonTransactions,
        url: `${HORIZON_URL}/accounts/${walletAddress}/transactions`,
      } : null,
    });
  } catch (error) {
    console.error('Transactions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get transactions' },
      { status: 500 }
    );
  }
}
