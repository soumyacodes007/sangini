// KYC API
// POST /api/kyc - Submit KYC data
// GET /api/kyc - Get KYC status
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { buildSetInvestorKycTx, submitTransaction, signTransaction } from '@/lib/stellar/transaction';
import { Keypair } from '@stellar/stellar-sdk';

// Allowed countries for KYC (example list)
const ALLOWED_COUNTRIES = [
  'US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP', 'SG', 'CH', 'NL',
  'SE', 'NO', 'DK', 'FI', 'IE', 'NZ', 'AT', 'BE', 'LU', 'IN',
];

// POST /api/kyc - Submit KYC data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, country, accreditedInvestor, documentType, documentNumber } = body;

    // Validate required fields
    if (!fullName || !country) {
      return NextResponse.json(
        { error: 'Full name and country are required' },
        { status: 400 }
      );
    }

    // Validate country
    if (!ALLOWED_COUNTRIES.includes(country)) {
      return NextResponse.json(
        { error: 'KYC not available in your country', allowedCountries: ALLOWED_COUNTRIES },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userId = new ObjectId(session.user.id);

    // Check if user already has approved KYC
    const user = await db.collection('users').findOne({ _id: userId });
    if (user?.kycStatus === 'APPROVED') {
      return NextResponse.json(
        { error: 'KYC already approved', kycStatus: 'APPROVED' },
        { status: 400 }
      );
    }

    // Create KYC record
    const kycData = {
      userId,
      fullName,
      country,
      accreditedInvestor: accreditedInvestor || false,
      documentType: documentType || null,
      documentNumber: documentNumber || null,
      status: 'PENDING',
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    };

    // Check for existing KYC submission
    const existingKyc = await db.collection('kyc').findOne({ userId });
    
    if (existingKyc) {
      // Update existing
      await db.collection('kyc').updateOne(
        { userId },
        { $set: { ...kycData, updatedAt: new Date() } }
      );
    } else {
      // Create new
      await db.collection('kyc').insertOne(kycData);
    }

    // Update user's KYC status to pending
    await db.collection('users').updateOne(
      { _id: userId },
      { $set: { kycStatus: 'PENDING', kycSubmittedAt: new Date() } }
    );

    // For demo purposes, auto-approve KYC
    // In production, this would go through a review process
    const autoApprove = process.env.KYC_AUTO_APPROVE === 'true';
    
    if (autoApprove) {
      await approveKyc(db, userId, session.user.walletAddress || undefined);
      
      return NextResponse.json({
        success: true,
        kycStatus: 'APPROVED',
        message: 'KYC automatically approved (demo mode)',
      });
    }

    return NextResponse.json({
      success: true,
      kycStatus: 'PENDING',
      message: 'KYC submitted for review',
    });
  } catch (error) {
    console.error('KYC submit error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit KYC' },
      { status: 500 }
    );
  }
}

// GET /api/kyc - Get user's KYC status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const userId = new ObjectId(session.user.id);

    const user = await db.collection('users').findOne({ _id: userId });
    const kyc = await db.collection('kyc').findOne({ userId });

    return NextResponse.json({
      kycStatus: user?.kycStatus || 'NOT_SUBMITTED',
      kyc: kyc ? {
        fullName: kyc.fullName,
        country: kyc.country,
        accreditedInvestor: kyc.accreditedInvestor,
        status: kyc.status,
        submittedAt: kyc.submittedAt,
        reviewedAt: kyc.reviewedAt,
        rejectionReason: kyc.rejectionReason,
      } : null,
      allowedCountries: ALLOWED_COUNTRIES,
    });
  } catch (error) {
    console.error('Get KYC error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get KYC status' },
      { status: 500 }
    );
  }
}

// Helper function to approve KYC
async function approveKyc(db: ReturnType<typeof getDb> extends Promise<infer T> ? T : never, userId: ObjectId, walletAddress?: string) {
  // Update KYC record
  await db.collection('kyc').updateOne(
    { userId },
    { 
      $set: { 
        status: 'APPROVED', 
        reviewedAt: new Date(),
        reviewedBy: 'SYSTEM_AUTO_APPROVE',
      } 
    }
  );

  // Update user record
  await db.collection('users').updateOne(
    { _id: userId },
    { $set: { kycStatus: 'APPROVED', kycApprovedAt: new Date() } }
  );

  // Set KYC on-chain if wallet address exists
  if (walletAddress && process.env.RELAYER_SECRET_KEY) {
    try {
      const xdr = await buildSetInvestorKycTx(walletAddress, true);
      const relayerKeypair = Keypair.fromSecret(process.env.RELAYER_SECRET_KEY);
      const signedXdr = signTransaction(xdr, relayerKeypair);
      await submitTransaction(signedXdr);
    } catch (error) {
      console.error('Failed to set on-chain KYC:', error);
      // Don't fail the request, just log the error
    }
  }
}
