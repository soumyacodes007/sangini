// Direct Invoice Creation API - Saves to database
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      buyerAddress, 
      amount, 
      currency, 
      dueDate, 
      description, 
      purchaseOrder, 
      documentHash,
      supplierAddress 
    } = body;

    // Validation
    if (!buyerAddress || !amount || !currency || !dueDate || !description || !purchaseOrder) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate buyer address format
    if (!buyerAddress.startsWith('G') || buyerAddress.length !== 56) {
      return NextResponse.json(
        { error: 'Invalid buyer wallet address' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Look up buyer by wallet address (could be their own wallet or custodial)
    const buyer = await db.collection('users').findOne({
      $or: [
        { walletAddress: buyerAddress },
        { custodialPubKey: buyerAddress }
      ]
    });

    // Generate a unique invoice ID
    const invoiceCount = await db.collection('invoices').countDocuments();
    const invoiceId = `INV-${Date.now()}-${invoiceCount + 1}`;

    // Create the invoice
    const invoice = {
      invoiceId,
      supplierId: new ObjectId(session.user.id),
      supplierAddress: supplierAddress || session.user.walletAddress,
      buyerId: buyer?._id || null,
      buyerAddress,
      amount,
      currency,
      dueDate: new Date(dueDate),
      description,
      purchaseOrder,
      documentHash: documentHash || null,
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('invoices').insertOne(invoice);

    // Log the transaction
    await db.collection('transactions').insertOne({
      type: 'INVOICE_CREATED',
      invoiceId: result.insertedId.toString(),
      supplier: supplierAddress || session.user.walletAddress,
      buyer: buyerAddress,
      amount,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      invoiceId: result.insertedId.toString(),
      invoiceNumber: invoiceId,
      message: 'Invoice created successfully',
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
