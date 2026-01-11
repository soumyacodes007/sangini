// Insurance Claim Confirmation API
// POST /api/insurance/claim/confirm - Confirm insurance claim after tx success
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// POST /api/insurance/claim/confirm - Confirm claim after successful transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceId, txHash, claimAmount } = body;

    if (!invoiceId || !txHash) {
      return NextResponse.json(
        { error: 'Invoice ID and transaction hash required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Find the pending claim
    const claim = await db.collection('insurance_claims').findOne({
      invoiceId,
      investorId: new ObjectId(session.user.id),
      status: 'PENDING',
    });

    if (!claim) {
      return NextResponse.json(
        { error: 'Pending claim not found' },
        { status: 404 }
      );
    }

    // Update claim to approved
    await db.collection('insurance_claims').updateOne(
      { _id: claim._id },
      {
        $set: {
          status: 'APPROVED',
          txHash,
          actualClaimAmount: claimAmount?.toString() || claim.expectedClaimAmount,
          processedAt: new Date(),
        },
      }
    );

    // Update investment record
    await db.collection('investments').updateOne(
      {
        invoiceId,
        investorId: new ObjectId(session.user.id),
      },
      {
        $set: {
          insuranceClaimed: true,
          insuranceClaimTxHash: txHash,
          insuranceClaimAmount: claimAmount?.toString() || claim.expectedClaimAmount,
          insuranceClaimedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      claim: {
        invoiceId,
        status: 'APPROVED',
        txHash,
        claimAmount: claimAmount?.toString() || claim.expectedClaimAmount,
      },
    });
  } catch (error) {
    console.error('Confirm claim error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm claim' },
      { status: 500 }
    );
  }
}
