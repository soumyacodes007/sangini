// Wallet Nonce API - Generate nonce for wallet signature
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Validate Stellar address format (starts with G, 56 chars)
    if (!walletAddress.startsWith('G') || walletAddress.length !== 56) {
      return NextResponse.json(
        { error: 'Invalid Stellar wallet address' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Generate random nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete any existing nonces for this wallet
    await db.collection('nonces').deleteMany({ walletAddress });

    // Store new nonce
    await db.collection('nonces').insertOne({
      walletAddress,
      nonce,
      expiresAt,
      createdAt: new Date(),
    });

    // Create message to sign
    const message = `Sign this message to authenticate with Sangini.\n\nNonce: ${nonce}\nWallet: ${walletAddress}`;

    return NextResponse.json({
      nonce,
      message,
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error) {
    console.error('Nonce generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
  }
}
