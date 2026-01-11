// World ID KYC Verification API
// POST /api/kyc/worldid - Verify World ID proof for KYC
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { buildSetInvestorKycTx, submitTransaction, signTransaction } from '@/lib/stellar/transaction';
import { Keypair } from '@stellar/stellar-sdk';

// World ID verification endpoint
const WORLD_ID_VERIFY_URL = 'https://developer.worldcoin.org/api/v1/verify';

interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: 'orb' | 'device';
}

// POST /api/kyc/worldid - Verify World ID proof
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { proof, merkle_root, nullifier_hash, verification_level } = body as WorldIDProof;

    // Validate required fields
    if (!proof || !merkle_root || !nullifier_hash) {
      return NextResponse.json(
        { error: 'World ID proof data required' },
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

    // Check if nullifier_hash already used (prevents double verification)
    const existingVerification = await db.collection('worldid_verifications').findOne({
      nullifier_hash,
    });
    if (existingVerification) {
      return NextResponse.json(
        { error: 'This World ID has already been used for verification' },
        { status: 400 }
      );
    }

    // Verify with World ID API
    const appId = process.env.WORLDID_APP_ID;
    const actionId = process.env.WORLDID_ACTION_ID || 'kyc-verification';

    if (!appId) {
      // If World ID not configured, use mock verification for demo
      console.warn('WORLDID_APP_ID not configured, using mock verification');
      
      // Store mock verification
      await db.collection('worldid_verifications').insertOne({
        userId,
        nullifier_hash,
        verification_level: verification_level || 'device',
        verified: true,
        mock: true,
        verifiedAt: new Date(),
      });
    } else {
      // Real World ID verification
      const verifyResponse = await fetch(WORLD_ID_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: appId,
          action: actionId,
          signal: session.user.id, // Use user ID as signal
          merkle_root,
          nullifier_hash,
          proof,
        }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyResult.success) {
        return NextResponse.json(
          { error: 'World ID verification failed', details: verifyResult },
          { status: 400 }
        );
      }

      // Store verification
      await db.collection('worldid_verifications').insertOne({
        userId,
        nullifier_hash,
        merkle_root,
        verification_level: verification_level || 'device',
        verified: true,
        verifiedAt: new Date(),
      });
    }

    // Create/update KYC record
    const kycData = {
      userId,
      fullName: user?.name || 'World ID Verified User',
      country: 'WORLD_ID',
      accreditedInvestor: false,
      verificationType: 'WORLD_ID',
      verificationLevel: verification_level || 'device',
      status: 'APPROVED',
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: 'WORLD_ID_SYSTEM',
    };

    await db.collection('kyc').updateOne(
      { userId },
      { $set: kycData },
      { upsert: true }
    );

    // Update user record
    await db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          kycStatus: 'APPROVED',
          kycApprovedAt: new Date(),
          kycVerificationType: 'WORLD_ID',
        },
      }
    );

    // Set KYC on-chain
    let onChainTxHash: string | null = null;
    if (user?.walletAddress && process.env.RELAYER_SECRET_KEY) {
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
      }
    }

    return NextResponse.json({
      success: true,
      kycStatus: 'APPROVED',
      verificationType: 'WORLD_ID',
      verificationLevel: verification_level || 'device',
      onChainTxHash,
      message: 'World ID verification successful, KYC approved',
    });
  } catch (error) {
    console.error('World ID verification error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'World ID verification failed' },
      { status: 500 }
    );
  }
}

// GET /api/kyc/worldid - Get World ID verification status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const userId = new ObjectId(session.user.id);

    const verification = await db.collection('worldid_verifications').findOne({ userId });

    return NextResponse.json({
      verified: !!verification?.verified,
      verificationLevel: verification?.verification_level || null,
      verifiedAt: verification?.verifiedAt || null,
      worldIdConfigured: !!process.env.WORLDID_APP_ID,
    });
  } catch (error) {
    console.error('Get World ID status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get verification status' },
      { status: 500 }
    );
  }
}
