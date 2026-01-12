// KYC Sync API - Sync on-chain KYC status
// POST /api/kyc/sync - Set on-chain KYC for approved users
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { buildSetInvestorKycTx, submitTransaction, signTransaction, isKycApproved } from '@/lib/stellar/transaction';
import { Keypair } from '@stellar/stellar-sdk';

// POST /api/kyc/sync - Sync on-chain KYC for the current user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { walletAddress } = body;

    // Use provided wallet address or fall back to session wallet
    const effectiveWalletAddress = walletAddress || session.user.walletAddress;
    if (!effectiveWalletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userId = new ObjectId(session.user.id);

    // Check if user has approved KYC in database
    const user = await db.collection('users').findOne({ _id: userId });
    if (user?.kycStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'KYC not approved in database. Please complete KYC first.' },
        { status: 400 }
      );
    }

    // Check if already approved on-chain
    try {
      const onChainApproved = await isKycApproved(effectiveWalletAddress);
      if (onChainApproved) {
        return NextResponse.json({
          success: true,
          message: 'KYC already approved on-chain',
          onChainStatus: true,
        });
      }
    } catch (checkError) {
      console.log('Could not check on-chain KYC status:', checkError);
      // Continue to try setting it
    }

    // Set KYC on-chain
    if (!process.env.RELAYER_SECRET_KEY || !process.env.RELAYER_PUBLIC_KEY) {
      return NextResponse.json(
        { error: 'Relayer not configured. Contact support.' },
        { status: 500 }
      );
    }

    console.log('Setting on-chain KYC for:', effectiveWalletAddress);
    console.log('Using relayer:', process.env.RELAYER_PUBLIC_KEY);
    
    try {
      const xdr = await buildSetInvestorKycTx(effectiveWalletAddress, true);
      const relayerKeypair = Keypair.fromSecret(process.env.RELAYER_SECRET_KEY);
      const signedXdr = signTransaction(xdr, relayerKeypair);
      const result = await submitTransaction(signedXdr);

      if (!result.success) {
        console.error('Failed to set on-chain KYC:', result.error);
        return NextResponse.json(
          { error: `Failed to set on-chain KYC: ${result.error}. The relayer may not be the contract admin.` },
          { status: 500 }
        );
      }

      // Update user record with on-chain KYC status
      await db.collection('users').updateOne(
        { _id: userId },
        { 
          $set: { 
            onChainKycSet: true,
            onChainKycTxHash: result.hash,
            onChainKycSetAt: new Date(),
          } 
        }
      );

      return NextResponse.json({
        success: true,
        message: 'KYC approved on-chain',
        txHash: result.hash,
        onChainStatus: true,
      });
    } catch (txError) {
      console.error('Transaction error setting on-chain KYC:', txError);
      const errorMessage = txError instanceof Error ? txError.message : 'Unknown error';
      
      // Check if it's an authorization error
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('#2')) {
        return NextResponse.json(
          { error: 'Relayer is not authorized as contract admin. Please contact support to configure the contract.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to set on-chain KYC: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('KYC sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync KYC' },
      { status: 500 }
    );
  }
}

// GET /api/kyc/sync - Check on-chain KYC status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress') || session.user.walletAddress;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const onChainApproved = await isKycApproved(walletAddress);

    return NextResponse.json({
      walletAddress,
      onChainKycApproved: onChainApproved,
    });
  } catch (error) {
    console.error('Check on-chain KYC error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check on-chain KYC' },
      { status: 500 }
    );
  }
}
