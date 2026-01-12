// Meta-TX API for Buyer Invoice Approval
// Buyers don't have wallets - we sign transactions for them using custodial keys

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decryptPrivateKey } from '@/lib/custodial';
import {
  buildInvoiceApprovalTx,
  signTransaction,
  submitTransaction,
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
        { error: 'Only buyers can approve invoices' },
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

    // 5. Check invoice status
    if (invoice.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Invoice cannot be approved. Current status: ${invoice.status}` },
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

    // 7. Decrypt private key
    const privateKey = decryptPrivateKey(
      user.custodialSecret,
      process.env.WALLET_ENCRYPTION_KEY!
    );
    const keypair = Keypair.fromSecret(privateKey);

    // 8. Build the approve_invoice transaction
    // Use onChainId (the actual contract invoice ID) if available, otherwise fall back
    const contractInvoiceId = invoice.onChainId || invoice.invoiceId || invoiceId;
    
    console.log('Approving invoice with contract ID:', contractInvoiceId);
    
    const txXdr = await buildInvoiceApprovalTx(
      contractInvoiceId,
      user.custodialPubKey
    );

    // 9. Sign with custodial key
    const signedXdr = signTransaction(txXdr, keypair);

    // 10. Submit to network
    const result = await submitTransaction(signedXdr);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Transaction failed' },
        { status: 500 }
      );
    }

    // 11. Update database
    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      {
        $set: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifyTxHash: result.hash,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      message: 'Invoice approved successfully',
    });
  } catch (error) {
    console.error('Invoice approval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Approval failed' },
      { status: 500 }
    );
  }
}
