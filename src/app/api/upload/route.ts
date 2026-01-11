// IPFS Upload API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadToIPFS, hashFile } from '@/lib/ipfs';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// POST /api/upload - Upload file to IPFS
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Pinata is configured
    if (!process.env.PINATA_JWT) {
      return NextResponse.json(
        { error: 'IPFS upload not configured. Please set PINATA_JWT.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const invoiceId = formData.get('invoiceId') as string | null;
    const documentType = formData.get('documentType') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: PDF, PNG, JPEG, DOC, DOCX` },
        { status: 400 }
      );
    }

    // Generate file hash for verification
    const fileHash = await hashFile(file);

    // Upload to IPFS
    const result = await uploadToIPFS(file, {
      name: file.name,
      keyvalues: {
        uploadedBy: session.user.id,
        invoiceId: invoiceId || '',
        documentType: documentType || 'invoice',
      },
    });

    // Store upload record in database
    const db = await getDb();
    await db.collection('uploads').insertOne({
      userId: new ObjectId(session.user.id),
      userAddress: session.user.walletAddress,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      cid: result.cid,
      url: result.url,
      hash: fileHash,
      invoiceId: invoiceId || null,
      documentType: documentType || 'invoice',
      uploadedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      cid: result.cid,
      url: result.url,
      hash: fileHash,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

// GET /api/upload - List user's uploads
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const db = await getDb();

    const query: Record<string, unknown> = {
      userId: new ObjectId(session.user.id),
    };

    if (invoiceId) {
      query.invoiceId = invoiceId;
    }

    const uploads = await db
      .collection('uploads')
      .find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('uploads').countDocuments(query);

    return NextResponse.json({
      uploads: uploads.map((u) => ({
        id: u._id.toString(),
        fileName: u.fileName,
        fileType: u.fileType,
        fileSize: u.fileSize,
        cid: u.cid,
        url: u.url,
        hash: u.hash,
        invoiceId: u.invoiceId,
        documentType: u.documentType,
        uploadedAt: u.uploadedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List uploads error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list uploads' },
      { status: 500 }
    );
  }
}
