// Confirm Invoice - Links DB record with on-chain invoice ID after minting
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { onChainId, status } = body;

    if (!onChainId) {
      return NextResponse.json(
        { error: 'onChainId is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Find the invoice by MongoDB _id or invoiceId
    const invoice = await db.collection('invoices').findOne({
      $or: [
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
        { invoiceId: id },
      ],
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Verify the user is the supplier
    const isSupplier =
      invoice.supplierId?.toString() === session.user.id ||
      invoice.supplierAddress === session.user.walletAddress;

    if (!isSupplier) {
      return NextResponse.json(
        { error: 'Only the supplier can confirm this invoice' },
        { status: 403 }
      );
    }

    // Update the invoice with the on-chain ID
    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      {
        $set: {
          onChainId: onChainId,
          status: status || invoice.status,
          mintedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Invoice confirmed with on-chain ID',
      onChainId,
    });
  } catch (error) {
    console.error('Confirm invoice error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm invoice' },
      { status: 500 }
    );
  }
}
