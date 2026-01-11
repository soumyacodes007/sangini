// Meta-TX API for Buyer Invoice Settlement
// Buyers pay the invoice amount, funds distributed to token holders

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decryptPrivateKey } from '@/lib/custodial';
import {
  buildSettlementTx,
  signTransaction,
  submitTransaction,
  getSettlementAmount,
} from '@/lib/stellar/transaction';
import { Keypair } from '@stellar/stellar-sdk';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify user is a buyer
    if (session.user.userType !== 'BUYER') {
      return NextResponse.json(
        { error: 'Only buyers can settle invoices' },
        { status: 403 }
      );
    }

    const { id: invoiceId } = await params;
    const db = await getDb();

    // 3. Get invoice from database
    const invoice = await db.collection('invoices').findOne({
      $or: [
        { _id: new ObjectId(invoiceId) },
        { invoiceId: invoiceId },
        { id: invoiceId },
      ],
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 4. Verify this user is the buyer for this invoice
    const isBuyer =
      invoice.buyerId?.toString() === session.user.id ||
      invoice.buyerAddress === session.user.walletAddress;

    if (!isBuyer) {
      return NextResponse.json(
        { error: 'You are not the buyer for this invoice' },
        { status: 403 }
      );
    }

    // 5. Check invoice status - can settle FUNDED, VERIFIED, FUNDING, or OVERDUE
    const settlableStatuses = ['FUNDED', 'VERIFIED', 'FUNDING', 'OVERDUE'];
    if (!settlableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        { error: `Invoice cannot be settled. Current status: ${invoice.status}` },
        { status: 400 }
      );
    }

    // 6. Get user's custodial wallet
    const user = await db.collection('users').findOne({
      _id: new ObjectId(session.user.id),
    });

    if (!user?.custodialSecret || !user?.custodialPubKey) {
      return NextResponse.json(
        { error: 'Custodial wallet not found. Please contact support.' },
        { status: 400 }
      );
    }

    // 7. Get settlement amount from contract (includes interest/penalties)
    let paymentAmount: bigint;
    try {
      paymentAmount = await getSettlementAmount(invoice.invoiceId || invoiceId);
    } catch {
      // Fallback to invoice amount if contract call fails
      paymentAmount = BigInt(invoice.amount);
    }

    // Allow override from request body
    const body = await request.json().catch(() => ({}));
    if (body.paymentAmount) {
      paymentAmount = BigInt(body.paymentAmount);
    }

    // 8. Decrypt private key
    const privateKey = decryptPrivateKey(
      user.custodialSecret,
      process.env.WALLET_ENCRYPTION_KEY!
    );
    const keypair = Keypair.fromSecret(privateKey);

    // 9. Build the settle transaction
    const txXdr = await buildSettlementTx(
      invoice.invoiceId || invoiceId,
      user.custodialPubKey,
      paymentAmount
    );

    // 10. Sign with custodial key
    const signedXdr = signTransaction(txXdr, keypair);

    // 11. Submit to network
    const result = await submitTransaction(signedXdr);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Transaction failed' },
        { status: 500 }
      );
    }

    // 12. Update database
    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      {
        $set: {
          status: 'SETTLED',
          settledAt: new Date(),
          settleTxHash: result.hash,
          repaymentReceived: paymentAmount.toString(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      paymentAmount: paymentAmount.toString(),
      message: 'Invoice settled successfully',
    });
  } catch (error) {
    console.error('Invoice settlement error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Settlement failed' },
      { status: 500 }
    );
  }
}

// GET - Get settlement amount for an invoice
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: invoiceId } = await params;
    const db = await getDb();

    const invoice = await db.collection('invoices').findOne({
      $or: [
        { _id: new ObjectId(invoiceId) },
        { invoiceId: invoiceId },
        { id: invoiceId },
      ],
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get settlement amount from contract
    let settlementAmount: bigint;
    try {
      settlementAmount = await getSettlementAmount(invoice.invoiceId || invoiceId);
    } catch {
      settlementAmount = BigInt(invoice.amount);
    }

    return NextResponse.json({
      invoiceId: invoice.invoiceId || invoiceId,
      originalAmount: invoice.amount,
      settlementAmount: settlementAmount.toString(),
      status: invoice.status,
      dueDate: invoice.dueDate,
    });
  } catch (error) {
    console.error('Get settlement amount error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get settlement amount' },
      { status: 500 }
    );
  }
}
