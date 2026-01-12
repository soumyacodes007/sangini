// Invoice List & Create API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { DbInvoice, CreateInvoiceRequest } from '@/lib/db/types';
import { buildMintDraftTx } from '@/lib/stellar/transaction';

// GET /api/invoices - List invoices with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role'); // 'supplier' | 'buyer' | 'investor'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const db = await getDb();
    
    // Build query based on filters
    const query: Record<string, unknown> = {};

    // Status filter - supports comma-separated values
    if (status) {
      const statuses = status.split(',').map(s => s.trim().toUpperCase());
      if (statuses.length === 1) {
        query.status = statuses[0];
      } else {
        query.status = { $in: statuses };
      }
    }

    // Role-based filter
    if (role === 'supplier') {
      if (session.user.walletAddress) {
        query.supplierAddress = session.user.walletAddress;
      } else {
        query.supplierId = new ObjectId(session.user.id);
      }
    } else if (role === 'buyer') {
      // For buyers, check both their user ID and their custodial wallet address
      const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });
      const buyerConditions: Record<string, unknown>[] = [
        { buyerId: new ObjectId(session.user.id) }
      ];
      
      if (session.user.walletAddress) {
        buyerConditions.push({ buyerAddress: session.user.walletAddress });
      }
      if (user?.custodialPubKey) {
        buyerConditions.push({ buyerAddress: user.custodialPubKey });
      }
      if (session.user.email) {
        buyerConditions.push({ buyerEmail: session.user.email });
      }
      
      // Combine with existing query using $and if status is set
      if (query.status) {
        query.$and = [
          { status: query.status },
          { $or: buyerConditions }
        ];
        delete query.status;
      } else {
        query.$or = buyerConditions;
      }
      
      console.log('Buyer query conditions:', JSON.stringify(buyerConditions));
      console.log('User custodialPubKey:', user?.custodialPubKey);
      console.log('Session wallet:', session.user.walletAddress);
    } else if (role === 'investor') {
      // For investors, show all verified/funding/funded invoices
      query.status = { $in: ['VERIFIED', 'FUNDING', 'FUNDED'] };
    }

    // Get invoices with pagination
    const invoices = await db
      .collection<DbInvoice>('invoices')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count for pagination
    const total = await db.collection('invoices').countDocuments(query);

    // Get user details for supplier/buyer names
    const userIds = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.supplierId) userIds.add(inv.supplierId.toString());
      if (inv.buyerId) userIds.add(inv.buyerId.toString());
    });

    const users = await db
      .collection('users')
      .find({ _id: { $in: Array.from(userIds).map((id) => new ObjectId(id)) } })
      .toArray();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // Transform to response format (flat structure for frontend)
    const response = invoices.map((inv) => {
      const supplier = inv.supplierId ? userMap.get(inv.supplierId.toString()) : null;
      const buyer = inv.buyerId ? userMap.get(inv.buyerId.toString()) : null;

      // Handle dueDate - could be Date object or timestamp
      let dueDateValue: number;
      if (inv.dueDate instanceof Date) {
        dueDateValue = Math.floor(inv.dueDate.getTime() / 1000);
      } else if (typeof inv.dueDate === 'number') {
        dueDateValue = inv.dueDate;
      } else {
        dueDateValue = Math.floor(new Date(inv.dueDate).getTime() / 1000);
      }

      return {
        id: inv._id.toString(),
        invoiceId: inv.invoiceId || inv._id.toString(),
        onChainId: inv.onChainId, // The actual contract invoice ID (e.g., INV-1001)
        supplier: inv.supplierAddress || supplier?.walletAddress || '',
        supplierName: supplier?.name || supplier?.companyName,
        buyer: inv.buyerAddress || buyer?.walletAddress || buyer?.custodialPubKey || '',
        buyerName: buyer?.name || buyer?.companyName,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        dueDate: dueDateValue,
        createdAt: inv.createdAt instanceof Date ? inv.createdAt.toISOString() : inv.createdAt,
        verifiedAt: inv.verifiedAt ? (inv.verifiedAt instanceof Date ? Math.floor(inv.verifiedAt.getTime() / 1000) : inv.verifiedAt) : undefined,
        settledAt: inv.settledAt ? (inv.settledAt instanceof Date ? Math.floor(inv.settledAt.getTime() / 1000) : inv.settledAt) : undefined,
        description: inv.description,
        purchaseOrder: inv.purchaseOrder,
        documentHash: inv.documentHash,
        auctionStart: inv.auctionStart ? (inv.auctionStart instanceof Date ? Math.floor(inv.auctionStart.getTime() / 1000) : inv.auctionStart) : undefined,
        auctionEnd: inv.auctionEnd ? (inv.auctionEnd instanceof Date ? Math.floor(inv.auctionEnd.getTime() / 1000) : inv.auctionEnd) : undefined,
        startPrice: inv.startPrice,
        minPrice: inv.minPrice,
        priceDropRate: inv.priceDropRate,
        totalTokens: inv.totalTokens,
        tokensSold: inv.tokensSold,
        tokensRemaining: inv.tokensRemaining,
      };
    });

    return NextResponse.json({
      invoices: response,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List invoices error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list invoices' },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create new invoice (returns XDR for supplier to sign)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only suppliers can create invoices
    if (session.user.userType !== 'SUPPLIER') {
      return NextResponse.json(
        { error: 'Only suppliers can create invoices' },
        { status: 403 }
      );
    }

    // Suppliers must have a wallet address
    if (!session.user.walletAddress) {
      return NextResponse.json(
        { error: 'Wallet not connected. Please connect your Freighter wallet.' },
        { status: 400 }
      );
    }

    const body: CreateInvoiceRequest = await request.json();
    const { buyerAddress, amount, currency, dueDate, description, purchaseOrder, documentHash } = body;

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

    // Parse amount and due date
    const amountBigInt = BigInt(amount);
    const dueDateTimestamp = BigInt(Math.floor(new Date(dueDate).getTime() / 1000));

    if (amountBigInt <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Build the mint_draft transaction
    const txXdr = await buildMintDraftTx(
      session.user.walletAddress,
      buyerAddress,
      amountBigInt,
      currency,
      dueDateTimestamp,
      description,
      purchaseOrder,
      documentHash || ''
    );

    // Store pending invoice in database (will be confirmed after tx success)
    const db = await getDb();
    
    // Look up buyer by wallet address
    const buyer = await db.collection('users').findOne({ 
      $or: [
        { walletAddress: buyerAddress },
        { custodialPubKey: buyerAddress }
      ]
    });

    const pendingInvoice = {
      supplierId: new ObjectId(session.user.id),
      supplierAddress: session.user.walletAddress,
      buyerId: buyer?._id,
      buyerAddress,
      amount: amount,
      currency,
      dueDate: new Date(dueDate),
      description,
      purchaseOrder,
      documentHash: documentHash || null,
      status: 'PENDING_CREATION', // Will be updated to DRAFT after tx confirms
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('invoices').insertOne(pendingInvoice);

    return NextResponse.json({
      success: true,
      pendingId: result.insertedId.toString(),
      xdr: txXdr,
      message: 'Sign this transaction with your wallet to create the invoice',
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
