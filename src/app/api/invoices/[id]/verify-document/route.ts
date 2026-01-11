// Document Verification API
// Verify that a document hash matches the one stored on-chain
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getInvoiceFromContract } from '@/lib/stellar/transaction';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to build invoice query
function buildInvoiceQuery(id: string): Record<string, unknown> {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { invoiceId: id }] };
  }
  return { invoiceId: id };
}

// POST /api/invoices/:id/verify-document - Verify document hash
export async function POST(request: NextRequest, { params }: RouteParams) {
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
        { error: 'Document hash required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const invoice = await db.collection('invoices').findOne(buildInvoiceQuery(id));

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check against database record
    const dbMatch = invoice.documentHash === documentHash;

    // Try to verify against on-chain data
    let onChainMatch = false;
    let onChainHash: string | null = null;

    if (invoice.invoiceId) {
      try {
        const onChainInvoice = await getInvoiceFromContract(invoice.invoiceId) as { document_hash?: string } | null;
        if (onChainInvoice?.document_hash) {
          onChainHash = onChainInvoice.document_hash;
          onChainMatch = onChainHash === documentHash;
        }
      } catch {
        // Contract call failed, skip on-chain verification
      }
    }

    // Find the upload record if exists
    const upload = await db.collection('uploads').findOne({
      $or: [
        { hash: documentHash },
        { cid: documentHash },
      ],
    });

    return NextResponse.json({
      verified: dbMatch || onChainMatch,
      invoiceId: invoice.invoiceId,
      verification: {
        database: {
          match: dbMatch,
          storedHash: invoice.documentHash || null,
        },
        onChain: {
          match: onChainMatch,
          storedHash: onChainHash,
          available: !!onChainHash,
        },
      },
      document: upload ? {
        fileName: upload.fileName,
        fileType: upload.fileType,
        cid: upload.cid,
        url: upload.url,
        uploadedAt: upload.uploadedAt,
      } : null,
    });
  } catch (error) {
    console.error('Verify document error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}

// GET /api/invoices/:id/verify-document - Get document info
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();

    const invoice = await db.collection('invoices').findOne(buildInvoiceQuery(id));

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get all documents associated with this invoice
    const documents = await db
      .collection('uploads')
      .find({ invoiceId: invoice.invoiceId })
      .sort({ uploadedAt: -1 })
      .toArray();

    return NextResponse.json({
      invoiceId: invoice.invoiceId,
      documentHash: invoice.documentHash || null,
      documents: documents.map((doc) => ({
        id: doc._id.toString(),
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        cid: doc.cid,
        url: doc.url,
        hash: doc.hash,
        documentType: doc.documentType,
        uploadedAt: doc.uploadedAt,
        isVerified: doc.hash === invoice.documentHash,
      })),
    });
  } catch (error) {
    console.error('Get document info error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get document info' },
      { status: 500 }
    );
  }
}
