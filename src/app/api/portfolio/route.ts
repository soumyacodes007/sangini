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

    // Get user's investments - check both wallet address formats
    const investments = await db.collection('investments').find({
      $or: [
        { investor: walletAddress },
        { investorAddress: walletAddress },
      ],
      status: 'COMPLETED',
    }).toArray();
    
    console.log('Portfolio - Found investments for wallet:', walletAddress, 'Count:', investments.length);

    // Get invoice details for each investment
    const holdings = await Promise.all(
      investments.map(async (inv) => {
        const invoice = await db.collection('invoices').findOne({
          _id: new ObjectId(inv.invoiceId),
        });

        if (!invoice) return null;

        // Calculate current value (face value at maturity)
        const tokenAmount = parseInt(inv.tokenAmount || '0');
        const purchasePrice = parseInt(inv.purchasePrice || inv.tokenAmount || '0');
        
        // Current value is face value (1:1 with tokens) if not settled
        const currentValue = invoice.status === 'SETTLED' 
          ? tokenAmount // Full face value
          : invoice.status === 'DEFAULTED'
          ? Math.floor(tokenAmount * 0.5) // 50% insurance coverage
          : tokenAmount; // Face value at maturity

        return {
          invoiceId: invoice.invoiceId || invoice._id.toString(),
          invoiceDbId: invoice._id.toString(),
          tokenAmount: inv.tokenAmount,
          purchasePrice: purchasePrice.toString(),
          currentValue: currentValue.toString(),
          status: invoice.status,
          dueDate: invoice.dueDate,
          description: invoice.description,
        };
      })
    );

    // Filter out null values
    const validHoldings = holdings.filter(h => h !== null);

    return NextResponse.json({ holdings: validHoldings });
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}
