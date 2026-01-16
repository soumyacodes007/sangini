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
    // Use onChainId for contract calls
    const contractInvoiceId = invoice.onChainId || invoice.invoiceId || invoiceId;

    let paymentAmount: bigint;
    try {
      paymentAmount = await getSettlementAmount(contractInvoiceId);
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

    // 9. Build the settle transaction using on-chain invoice ID
    const txXdr = await buildSettlementTx(
      contractInvoiceId,
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

    // 13. Track investor distributions - each investor gets their proportional share
    const investments = await db.collection('investments').find({
      $or: [
        { invoiceId: invoice._id.toString() },
        { onChainInvoiceId: invoice.onChainId || invoice.invoiceId },
      ],
      status: 'COMPLETED',
    }).toArray();

    const totalTokens = BigInt(invoice.totalTokens || invoice.amount || '0');
    const settlementAmount = paymentAmount;

    for (const investment of investments) {
      const investorTokens = BigInt(investment.tokenAmount || '0');
      // Each investor gets: (their_tokens / total_tokens) * settlement_amount
      const distributionAmount = totalTokens > BigInt(0)
        ? (investorTokens * settlementAmount) / totalTokens
        : BigInt(0);

      await db.collection('investor_distributions').insertOne({
        invoiceId: invoice._id.toString(),
        onChainInvoiceId: invoice.onChainId || invoice.invoiceId,
        investmentId: investment._id.toString(),
        investorId: investment.investorId,
        investorAddress: investment.investor || investment.investorAddress,
        tokenAmount: investment.tokenAmount,
        purchasePrice: investment.purchasePrice || investment.investedAmount,
        distributionAmount: distributionAmount.toString(),
        profit: (distributionAmount - BigInt(investment.purchasePrice || investment.investedAmount || '0')).toString(),
        settlementTxHash: result.hash,
        timestamp: new Date(),
        status: 'COMPLETED',
      });
    }

    // Log settlement transaction
    await db.collection('transactions').insertOne({
      type: 'SETTLEMENT',
      invoiceId: invoice._id.toString(),
      buyerAddress: user.custodialPubKey,
      paymentAmount: paymentAmount.toString(),
      txHash: result.hash,
      investorCount: investments.length,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      paymentAmount: paymentAmount.toString(),
      investorsDistributed: investments.length,
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

    // Get settlement amount from contract using on-chain ID
    const contractInvoiceId = invoice.onChainId || invoice.invoiceId || invoiceId;

    let settlementAmount: bigint;
    try {
      settlementAmount = await getSettlementAmount(contractInvoiceId);
    } catch {
      settlementAmount = BigInt(invoice.amount);
    }

    return NextResponse.json({
      invoiceId: invoice.invoiceId || invoiceId,
      onChainId: contractInvoiceId,
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
