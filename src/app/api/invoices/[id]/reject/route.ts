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
    const db = await getDb();

    // Find the invoice
    let invoice;
    try {
      invoice = await db.collection('invoices').findOne({
        _id: new ObjectId(id),
      });
    } catch {
      // Try finding by invoiceId string
      invoice = await db.collection('invoices').findOne({
        invoiceId: id,
      });
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if user is the buyer - ISSUE-2 FIX: Strengthen authorization
    // Must be the SPECIFIC buyer for THIS invoice, not just any buyer
    const userWallet = session.user.walletAddress;
    const userEmail = session.user.email;
    const userId = session.user.id;

    // Get user's custodialPubKey for comparison
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    // Check SPECIFIC buyer match - not just any buyer
    const isBuyer =
      (invoice.buyerId && invoice.buyerId.toString() === userId) ||
      (invoice.buyerAddress && invoice.buyerAddress === userWallet) ||
      (invoice.buyerAddress && user?.custodialPubKey && invoice.buyerAddress === user.custodialPubKey) ||
      (invoice.buyerEmail && invoice.buyerEmail === userEmail) ||
      (invoice.buyer && invoice.buyer === userWallet);

    if (!isBuyer && session.user.userType !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only the buyer can reject this invoice' },
        { status: 403 }
      );
    }

    // Check if invoice is in DRAFT status
    if (invoice.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft invoices can be rejected' },
        { status: 400 }
      );
    }

    // Update invoice status to REVOKED
    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      {
        $set: {
          status: 'REVOKED',
          rejectedAt: Date.now(),
          rejectedBy: userWallet || userEmail,
        },
      }
    );

    // Log the transaction
    await db.collection('transactions').insertOne({
      type: 'INVOICE_REJECTED',
      invoiceId: invoice._id.toString(),
      user: userWallet || userEmail,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice rejected',
    });
  } catch (error) {
    console.error('Invoice rejection error:', error);
    return NextResponse.json(
      { error: 'Failed to reject invoice' },
      { status: 500 }
    );
  }
}
