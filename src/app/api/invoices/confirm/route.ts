// Invoice Confirmation API
// Called after supplier signs and submits the mint_draft transaction
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface ConfirmRequest {
  pendingId: string;
  txHash: string;
  invoiceId: string;  // The on-chain invoice ID (e.g., "INV-1001")
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ConfirmRequest = await request.json();
    const { pendingId, txHash, invoiceId } = body;

    if (!pendingId || !txHash || !invoiceId) {
      return NextResponse.json(
        { error: 'Missing required fields: pendingId, txHash, invoiceId' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Find the pending invoice
    const invoice = await db.collection('invoices').findOne({
      _id: new ObjectId(pendingId),
      status: 'PENDING_CREATION',
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Pending invoice not found' },
        { status: 404 }
      );
    }

    // Verify the user is the supplier
    if (invoice.supplierId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to confirm this invoice' },
        { status: 403 }
      );
    }

    // Update invoice with on-chain data
    // FIX: Set BOTH invoiceId AND onChainId for consistency across all queries
    await db.collection('invoices').updateOne(
      { _id: new ObjectId(pendingId) },
      {
        $set: {
          invoiceId,          // Keep for backwards compatibility
          onChainId: invoiceId, // FIX: Also set onChainId for new queries
          status: 'DRAFT',
          createTxHash: txHash,
          mintedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      invoiceId,
      txHash,
      message: 'Invoice created successfully',
    });
  } catch (error) {
    console.error('Confirm invoice error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm invoice' },
      { status: 500 }
    );
  }
}
