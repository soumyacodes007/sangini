import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const walletAddress = session.user.walletAddress;

    if (!walletAddress) {
      return NextResponse.json({ holdings: [] });
    }

    // Get user's investments - exclude SOLD investments (they're no longer holdings)
    const investments = await db.collection('investments').find({
      $and: [
        {
          $or: [
            { investor: walletAddress },
            { investorAddress: walletAddress },
          ],
        },
        {
          $or: [
            { status: 'COMPLETED' },
            { status: { $exists: false } },
          ],
        },
        {
          // Exclude SOLD investments
          status: { $ne: 'SOLD' },
        },
      ],
    }).toArray();

    console.log('Portfolio - Found investments for wallet:', walletAddress, 'Count:', investments.length);

    // Check for distributions (settled investments)
    const distributions = await db.collection('investor_distributions').find({
      investorAddress: walletAddress,
    }).toArray();

    // Group investments by invoice to aggregate multiple investments
    const holdingsMap = new Map<string, {
      invoiceId: string;
      invoiceDbId: string;
      tokenAmount: bigint;
      purchasePrice: bigint;
      currentValue: bigint;
      expectedReturn: bigint;
      status: string;
      dueDate?: Date;
      description?: string;
    }>();

    for (const inv of investments) {
      // Try multiple ways to find the invoice
      let invoice = null;

      if (inv.invoiceId && ObjectId.isValid(inv.invoiceId)) {
        invoice = await db.collection('invoices').findOne({
          _id: new ObjectId(inv.invoiceId),
        });
      }

      if (!invoice && (inv.invoiceId || inv.onChainInvoiceId)) {
        invoice = await db.collection('invoices').findOne({
          $or: [
            { invoiceId: inv.invoiceId },
            { invoiceId: inv.onChainInvoiceId },
            { onChainId: inv.invoiceId },
            { onChainId: inv.onChainInvoiceId },
          ].filter(q => Object.values(q)[0] !== undefined),
        });
      }

      if (!invoice) continue;

      const invoiceKey = invoice._id.toString();
      const tokenAmount = BigInt(inv.tokenAmount || '0');
      const purchasePrice = BigInt(inv.purchasePrice || inv.investedAmount || inv.tokenAmount || '0');

      // Determine status: SETTLED if distribution exists, else use invoice status
      const distribution = distributions.find(d =>
        d.invoiceId === invoiceKey ||
        d.onChainInvoiceId === invoice.onChainId
      );

      // Map invoice status to user-friendly status
      let status = invoice.status;
      if (distribution) {
        status = 'SETTLED';
      } else if (invoice.status === 'FUNDING' || invoice.status === 'APPROVED') {
        status = 'FUNDED'; // User has invested, so show as FUNDED for their holding
      }

      // Calculate current value based on status
      let currentValue = tokenAmount;
      let expectedReturn = tokenAmount; // Face value of tokens
      
      if (status === 'SETTLED' && distribution) {
        // Settled - use actual distribution amount
        currentValue = BigInt(distribution.distributionAmount || tokenAmount.toString());
        expectedReturn = currentValue;
      } else if (status === 'DEFAULTED') {
        // Defaulted - 50% insurance coverage
        currentValue = purchasePrice / BigInt(2);
        expectedReturn = currentValue;
      } else if (invoice.status === 'FUNDED' || invoice.status === 'VERIFIED' || invoice.status === 'FUNDING') {
        // Active - show expected return (face value) vs current value (what they paid)
        currentValue = purchasePrice; // Current value = what they invested
        expectedReturn = tokenAmount; // Expected return = face value of tokens
      }

      // Aggregate if same invoice already exists
      const existing = holdingsMap.get(invoiceKey);
      if (existing) {
        existing.tokenAmount += tokenAmount;
        existing.purchasePrice += purchasePrice;
        existing.currentValue += currentValue;
        existing.expectedReturn += expectedReturn;
      } else {
        holdingsMap.set(invoiceKey, {
          invoiceId: invoice.invoiceId || invoice.onChainId || invoice._id.toString(),
          invoiceDbId: invoice._id.toString(),
          tokenAmount,
          purchasePrice,
          currentValue,
          expectedReturn,
          status,
          dueDate: invoice.dueDate,
          description: invoice.description,
        });
      }
    }

    // Convert to array and format values
    const holdings = Array.from(holdingsMap.values()).map(h => ({
      invoiceId: h.invoiceId,
      invoiceDbId: h.invoiceDbId,
      tokenAmount: h.tokenAmount.toString(),
      purchasePrice: h.purchasePrice.toString(),
      currentValue: h.currentValue.toString(),
      expectedReturn: h.expectedReturn.toString(),
      unrealizedProfit: (h.expectedReturn - h.purchasePrice).toString(),
      status: h.status,
      dueDate: h.dueDate,
      description: h.description,
    }));

    return NextResponse.json({ holdings });
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}
