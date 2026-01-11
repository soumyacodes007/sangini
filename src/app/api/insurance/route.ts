// Insurance Pool API
// GET /api/insurance - Get insurance pool balance and stats
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { getInsurancePoolBalance } from '@/lib/stellar/transaction';

// GET /api/insurance - Get insurance pool info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pool balance from contract
    let poolBalance: bigint = BigInt(0);
    let poolBalanceError: string | null = null;
    
    try {
      poolBalance = await getInsurancePoolBalance();
    } catch (error) {
      poolBalanceError = error instanceof Error ? error.message : 'Failed to fetch pool balance';
    }

    // Get claims stats from database
    const db = await getDb();
    
    const totalClaims = await db.collection('insurance_claims').countDocuments();
    const pendingClaims = await db.collection('insurance_claims').countDocuments({ status: 'PENDING' });
    const approvedClaims = await db.collection('insurance_claims').countDocuments({ status: 'APPROVED' });
    const rejectedClaims = await db.collection('insurance_claims').countDocuments({ status: 'REJECTED' });

    // Get total claimed amount
    const claimedAggregation = await db.collection('insurance_claims').aggregate([
      { $match: { status: 'APPROVED' } },
      { $group: { _id: null, total: { $sum: '$claimAmount' } } },
    ]).toArray();
    const totalClaimedAmount = claimedAggregation[0]?.total || 0;

    // Get defaulted invoices count
    const defaultedInvoices = await db.collection('invoices').countDocuments({ status: 'DEFAULTED' });

    return NextResponse.json({
      pool: {
        balance: poolBalance.toString(),
        balanceFormatted: formatAmount(poolBalance),
        error: poolBalanceError,
      },
      claims: {
        total: totalClaims,
        pending: pendingClaims,
        approved: approvedClaims,
        rejected: rejectedClaims,
        totalClaimedAmount: totalClaimedAmount.toString(),
      },
      defaultedInvoices,
    });
  } catch (error) {
    console.error('Get insurance pool error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get insurance info' },
      { status: 500 }
    );
  }
}

// Helper to format amount (assuming 7 decimals for Stellar)
function formatAmount(amount: bigint): string {
  const divisor = BigInt(10_000_000);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  return `${whole}.${fraction.toString().padStart(7, '0')}`;
}
