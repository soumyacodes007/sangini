import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { documentHash } = body;

    if (!documentHash) {
      return NextResponse.json(
        { error: 'Document hash is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Find the invoice
    let invoice;
    try {
      invoice = await db.collection('invoices').findOne({
        _id: new ObjectId(id),
      });
    } catch {
      invoice = await db.collection('invoices').findOne({
        invoiceId: id,
      });
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if user is the supplier
    const userWallet = session.user.walletAddress;
    if (invoice.supplier !== userWallet && session.user.userType !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only the supplier can attach documents' },
        { status: 403 }
      );
    }

    // Update invoice with document hash
    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      {
        $set: {
          documentHash,
          documentUpdatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Document attached successfully',
      documentHash,
    });
  } catch (error) {
    console.error('Document attachment error:', error);
    return NextResponse.json(
      { error: 'Failed to attach document' },
      { status: 500 }
    );
  }
}
