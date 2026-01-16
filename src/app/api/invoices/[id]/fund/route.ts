// Investment API - Returns XDR for investor to sign
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { buildInvestTx } from '@/lib/stellar/transaction';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/invoices/:id/fund - Get XDR for investment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tokenAmount, investorAddress } = body;

    // Use provided investor address or fall back to session wallet
    const walletAddress = investorAddress || session.user.walletAddress;
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required for investment. Please connect your wallet.' },
        { status: 400 }
      );
    }

    if (!tokenAmount) {
      return NextResponse.json(
        { error: 'Token amount is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check KYC status
    const user = await db.collection('users').findOne({
      _id: new ObjectId(session.user.id),
    });

    if (user?.kycStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'KYC verification required to invest' },
        { status: 403 }
      );
    }

    // Find the invoice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchConditions1: any[] = [{ invoiceId: id }, { onChainId: id }];
    if (ObjectId.isValid(id)) {
      searchConditions1.unshift({ _id: new ObjectId(id) });
    }
    const invoice = await db.collection('invoices').findOne({
      $or: searchConditions1,
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if invoice is in FUNDING status
    if (invoice.status !== 'FUNDING') {
      return NextResponse.json(
        { error: `Invoice is not available for funding. Status: ${invoice.status}` },
        { status: 400 }
      );
    }

    // Use onChainId for contract call
    const contractInvoiceId = invoice.onChainId || invoice.invoiceId;

    // Build the invest transaction
    try {
      const txXdr = await buildInvestTx(
        contractInvoiceId,
        walletAddress,
        BigInt(tokenAmount)
      );

      return NextResponse.json({
        success: true,
        xdr: txXdr,
        invoiceId: contractInvoiceId,
        message: 'Sign this transaction to complete your investment',
      });
    } catch (buildError) {
      console.error('Build invest tx error:', buildError);
      const errorMessage = buildError instanceof Error ? buildError.message : 'Unknown error';

      // Check for KYC error
      if (errorMessage.includes('#7') || errorMessage.includes('KYC')) {
        return NextResponse.json(
          {
            error: 'On-chain KYC verification required. Your KYC may not be synced to the blockchain. Please try again or contact support.',
            code: 'KYC_REQUIRED'
          },
          { status: 403 }
        );
      }

      throw buildError;
    }
  } catch (error) {
    console.error('Investment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to prepare investment' },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/:id/fund - Confirm investment after tx success
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { txHash, tokenAmount, paymentAmount, investorAddress } = body;

    if (!txHash) {
      return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
    }

    const db = await getDb();
    const walletAddress = investorAddress || session.user.walletAddress;

    // Find the invoice
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchConditions2: any[] = [{ invoiceId: id }, { onChainId: id }];
    if (ObjectId.isValid(id)) {
      searchConditions2.unshift({ _id: new ObjectId(id) });
    }
    const invoice = await db.collection('invoices').findOne({
      $or: searchConditions2,
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Record the investment
    await db.collection('investments').insertOne({
      invoiceId: invoice._id.toString(),
      onChainInvoiceId: invoice.onChainId || invoice.invoiceId,
      investorId: new ObjectId(session.user.id),
      investor: walletAddress,
      tokenAmount: tokenAmount,
      purchasePrice: paymentAmount,
      txHash,
      timestamp: new Date(),
      status: 'COMPLETED',
    });

    // Update invoice tokens
    const tokensRemaining = BigInt(invoice.tokensRemaining || invoice.totalTokens || '0');
    const requestedTokens = BigInt(tokenAmount);
    const newTokensSold = BigInt(invoice.tokensSold || '0') + requestedTokens;
    const newTokensRemaining = tokensRemaining - requestedTokens;

    const updateData: Record<string, unknown> = {
      tokensSold: newTokensSold.toString(),
      tokensRemaining: newTokensRemaining.toString(),
      updatedAt: new Date(),
    };

    // If all tokens sold, mark as FUNDED
    if (newTokensRemaining <= BigInt(0)) {
      updateData.status = 'FUNDED';
      updateData.fundedAt = new Date();
    }

    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      { $set: updateData }
    );

    // Log the transaction
    await db.collection('transactions').insertOne({
      type: 'INVESTMENT',
      invoiceId: invoice._id.toString(),
      investor: walletAddress,
      tokenAmount,
      paymentAmount,
      txHash,
      timestamp: new Date(),
    });

    // Track supplier payout - contract takes 2% for insurance, rest goes to supplier
    const paymentAmountBigInt = BigInt(paymentAmount || '0');
    const insuranceCutBps = 200; // 2% insurance cut as per contract
    const insuranceCut = (paymentAmountBigInt * BigInt(insuranceCutBps)) / BigInt(10000);
    const supplierNetAmount = paymentAmountBigInt - insuranceCut;

    await db.collection('supplier_payouts').insertOne({
      invoiceId: invoice._id.toString(),
      onChainInvoiceId: invoice.onChainId || invoice.invoiceId,
      supplierId: invoice.supplierId,
      supplierAddress: invoice.supplierAddress,
      investorId: new ObjectId(session.user.id),
      investorAddress: walletAddress,
      paymentAmount: paymentAmount,
      insuranceCut: insuranceCut.toString(),
      netAmount: supplierNetAmount.toString(),
      investmentTxHash: txHash,
      timestamp: new Date(),
      status: 'COMPLETED',
    });

    // Update invoice with total amount raised
    const currentAmountRaised = BigInt(invoice.amountRaised || '0');
    const newAmountRaised = currentAmountRaised + supplierNetAmount;

    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      {
        $set: {
          amountRaised: newAmountRaised.toString(),
          lastPayoutAt: new Date(),
        }
      }
    );

    return NextResponse.json({
      success: true,
      txHash,
      message: 'Investment confirmed',
    });
  } catch (error) {
    console.error('Confirm investment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm investment' },
      { status: 500 }
    );
  }
}
