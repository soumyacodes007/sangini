// KYC Review API (Admin only)
// POST /api/kyc/review - Approve or reject KYC
// GET /api/kyc/review - List pending KYC submissions
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { buildSetInvestorKycTx, submitTransaction, signTransaction } from '@/lib/stellar/transaction';
import { Keypair } from '@stellar/stellar-sdk';

// POST /api/kyc/review - Approve or reject KYC (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can review KYC
    if (session.user.userType !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can review KYC submissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, action, rejectionReason } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'User ID and action required' },
        { status: 400 }
      );
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    if (action === 'REJECT' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const targetUserId = new ObjectId(userId);

    // Get KYC record
    const kyc = await db.collection('kyc').findOne({ userId: targetUserId });
    if (!kyc) {
      return NextResponse.json({ error: 'KYC submission not found' }, { status: 404 });
    }

    if (kyc.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'KYC already reviewed', currentStatus: kyc.status },
        { status: 400 }
      );
    }

    // Get user for wallet address
    const user = await db.collection('users').findOne({ _id: targetUserId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    // Update KYC record
    await db.collection('kyc').updateOne(
      { userId: targetUserId },
      {
        $set: {
          status: newStatus,
          reviewedAt: new Date(),
          reviewedBy: new ObjectId(session.user.id),
          rejectionReason: action === 'REJECT' ? rejectionReason : null,
        },
      }
    );

    // Update user record
    await db.collection('users').updateOne(
      { _id: targetUserId },
      {
        $set: {
          kycStatus: newStatus,
          ...(action === 'APPROVE' ? { kycApprovedAt: new Date() } : {}),
        },
      }
    );

    // Set KYC on-chain if approved
    let onChainTxHash: string | null = null;
    if (action === 'APPROVE' && user.walletAddress && process.env.RELAYER_SECRET_KEY) {
      try {
        const xdr = await buildSetInvestorKycTx(user.walletAddress, true);
        const relayerKeypair = Keypair.fromSecret(process.env.RELAYER_SECRET_KEY);
        const signedXdr = signTransaction(xdr, relayerKeypair);
        const result = await submitTransaction(signedXdr);
        if (result.success) {
          onChainTxHash = result.hash || null;
        }
      } catch (error) {
        console.error('Failed to set on-chain KYC:', error);
        // Continue anyway, on-chain sync can be retried
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      status: newStatus,
      onChainTxHash,
      message: action === 'APPROVE' 
        ? 'KYC approved successfully' 
        : 'KYC rejected',
    });
  } catch (error) {
    console.error('KYC review error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to review KYC' },
      { status: 500 }
    );
  }
}

// GET /api/kyc/review - List KYC submissions (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view all KYC submissions
    if (session.user.userType !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can view KYC submissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const db = await getDb();

    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status.toUpperCase();
    }

    // Get KYC submissions with user info
    const submissions = await db.collection('kyc')
      .aggregate([
        { $match: query },
        { $sort: { submittedAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    const total = await db.collection('kyc').countDocuments(query);

    // Get counts by status
    const statusCounts = await db.collection('kyc').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray();

    const counts = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    statusCounts.forEach((s) => {
      if (s._id in counts) {
        counts[s._id as keyof typeof counts] = s.count;
      }
    });

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        id: s._id.toString(),
        userId: s.userId.toString(),
        fullName: s.fullName,
        country: s.country,
        accreditedInvestor: s.accreditedInvestor,
        status: s.status,
        submittedAt: s.submittedAt,
        reviewedAt: s.reviewedAt,
        rejectionReason: s.rejectionReason,
        user: s.user ? {
          email: s.user.email,
          walletAddress: s.user.walletAddress,
          userType: s.user.userType,
        } : null,
      })),
      counts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List KYC error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list KYC submissions' },
      { status: 500 }
    );
  }
}
