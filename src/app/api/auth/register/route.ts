// User Registration API
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { generateCustodialWallet, encryptPrivateKey } from '@/lib/custodial';
import { fundAccount } from '@/lib/relayer';
import { UserType } from '@/lib/auth';

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  userType: UserType;
  companyName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterBody = await request.json();
    const { email, password, name, userType, companyName } = body;

    // Validation
    if (!email || !password || !name || !userType) {
      return NextResponse.json(
        { error: 'Email, password, name, and userType are required' },
        { status: 400 }
      );
    }

    if (!['SUPPLIER', 'BUYER', 'INVESTOR'].includes(userType)) {
      return NextResponse.json(
        { error: 'Invalid userType. Must be SUPPLIER, BUYER, or INVESTOR' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if email already exists
    const existingUser = await db.collection('users').findOne({ 
      email: email.toLowerCase() 
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate custodial wallet for buyers (they don't have their own wallet)
    let custodialData = {};
    let fundingResult = null;

    if (userType === 'BUYER') {
      const wallet = generateCustodialWallet();
      const encryptedSecret = encryptPrivateKey(
        wallet.secret,
        process.env.WALLET_ENCRYPTION_KEY!
      );

      custodialData = {
        custodialPubKey: wallet.publicKey,
        custodialSecret: encryptedSecret,
      };

      // Fund the custodial wallet with minimum XLM from relayer
      try {
        fundingResult = await fundAccount(wallet.publicKey, '2'); // 2 XLM for operations
        if (!fundingResult.success) {
          console.warn('Failed to fund custodial wallet:', fundingResult.error);
          // Continue registration even if funding fails - can be funded later
        }
      } catch (fundError) {
        console.warn('Custodial wallet funding error:', fundError);
        // Continue registration - wallet can be funded manually later
      }
    }

    // Create user
    const result = await db.collection('users').insertOne({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      userType,
      companyName: companyName || null,
      kycStatus: 'PENDING',
      ...custodialData,
      walletFunded: fundingResult?.success || false,
      fundingTxHash: fundingResult?.txHash || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      userId: result.insertedId.toString(),
      message: 'Registration successful',
      walletFunded: fundingResult?.success || false,
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
