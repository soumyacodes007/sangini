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
    // CRITICAL: Find ALL token holders, including those who bought on secondary market
    // Must check multiple ID formats and exclude sold investments
    const invoiceIdStr = invoice._id.toString();
    const onChainId = invoice.onChainId || invoice.invoiceId;

    const investments = await db.collection('investments').find({
      $and: [
        {
          $or: [
            { invoiceId: invoiceIdStr },
            { invoiceId: onChainId },
            { onChainInvoiceId: invoiceIdStr },
            { onChainInvoiceId: onChainId },
          ],
        },
        {
          // Only include active investments (not sold, not pending)
          $or: [
            { status: 'COMPLETED' },
            { status: { $exists: false } },  // Legacy records
          ],
        },
        {
          // Exclude investments with 0 tokens (fully sold on secondary)
          tokenAmount: { $ne: '0' },
        },
      ],
    }).toArray();

    console.log(`Settlement: Found ${investments.length} investors for invoice ${onChainId}`);

    // CRITICAL FIX: Deduplicate investments by investor address
    // Multiple investment records can exist for same investor (primary + secondary purchases)
    // We need to aggregate them to avoid counting tokens multiple times
    const investmentsByInvestor = new Map();

    for (const inv of investments) {
      const investorKey = inv.investor || inv.investorAddress;
      
      if (!investmentsByInvestor.has(investorKey)) {
        investmentsByInvestor.set(investorKey, {
          investorId: inv.investorId,
          investorAddress: investorKey,
          tokenAmount: BigInt(0),
          purchasePrice: BigInt(0),
          investments: [],
        });
      }

      const aggregated = investmentsByInvestor.get(investorKey);
      aggregated.tokenAmount += BigInt(inv.tokenAmount || '0');
      aggregated.purchasePrice += BigInt(inv.purchasePrice || inv.investedAmount || '0');
      aggregated.investments.push(inv);
    }

    console.log(`Settlement: Aggregated to ${investmentsByInvestor.size} unique investors`);

    // Calculate total tokens from aggregated holdings
    const totalTokensHeld = Array.from(investmentsByInvestor.values()).reduce((sum, inv) => {
      return sum + inv.tokenAmount;
    }, BigInt(0));

    console.log(`Settlement: Total tokens held by investors: ${totalTokensHeld.toString()}`);

    // Use the larger of: actual holdings or invoice total (safety check)
    const totalTokens = totalTokensHeld > BigInt(0)
      ? totalTokensHeld
      : BigInt(invoice.totalTokens || invoice.amount || '0');
    const settlementAmount = paymentAmount;

    // Distribute to aggregated investors
    for (const [investorAddress, aggregated] of investmentsByInvestor.entries()) {
      const investorTokens = aggregated.tokenAmount;
      // Each investor gets: (their_tokens / total_tokens) * settlement_amount
      const distributionAmount = totalTokens > BigInt(0)
        ? (investorTokens * settlementAmount) / totalTokens
        : BigInt(0);

      // Create one distribution record per investor (not per investment)
      await db.collection('investor_distributions').insertOne({
        invoiceId: invoice._id.toString(),
        onChainInvoiceId: invoice.onChainId || invoice.invoiceId,
        investmentId: aggregated.investments[0]._id.toString(), // Reference first investment
        investorId: aggregated.investorId,
        investorAddress: investorAddress,
        tokenAmount: investorTokens.toString(),
        purchasePrice: aggregated.purchasePrice.toString(),
        distributionAmount: distributionAmount.toString(),
        profit: (distributionAmount - aggregated.purchasePrice).toString(),
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
      investorCount: investmentsByInvestor.size,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      paymentAmount: paymentAmount.toString(),
      investorsDistributed: investmentsByInvestor.size,
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
