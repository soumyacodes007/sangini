// Dispute API - Raise and get disputes for invoices
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET - List disputes for buyer
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only buyers can view their disputes
        if (session.user.userType !== 'BUYER') {
            return NextResponse.json({ error: 'Only buyers can view disputes' }, { status: 403 });
        }

        const db = await getDb();

        // Get all disputes raised by this buyer
        const disputes = await db.collection('disputes').find({
            raisedBy: session.user.id,
        }).sort({ createdAt: -1 }).toArray();

        // Get invoice details for each dispute
        const disputesWithInvoice = await Promise.all(
            disputes.map(async (dispute) => {
                const invoice = await db.collection('invoices').findOne({
                    _id: new ObjectId(dispute.invoiceId),
                });

                return {
                    id: dispute._id.toString(),
                    invoiceId: dispute.invoiceId,
                    onChainInvoiceId: invoice?.onChainId || dispute.invoiceId,
                    reason: dispute.reason,
                    status: dispute.status || 'PENDING',
                    createdAt: dispute.createdAt,
                    resolvedAt: dispute.resolvedAt,
                    resolution: dispute.resolution,
                    invoiceAmount: invoice?.amount,
                    invoiceDescription: invoice?.description,
                    supplierAddress: invoice?.supplierAddress,
                };
            })
        );

        return NextResponse.json({ disputes: disputesWithInvoice });
    } catch (error) {
        console.error('Disputes fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch disputes' },
            { status: 500 }
        );
    }
}

// POST - Raise a new dispute
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only buyers can raise disputes
        if (session.user.userType !== 'BUYER') {
            return NextResponse.json({ error: 'Only buyers can raise disputes' }, { status: 403 });
        }

        const { invoiceId, reason } = await req.json();

        if (!invoiceId || !reason) {
            return NextResponse.json(
                { error: 'Invoice ID and reason are required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Check if invoice exists and belongs to this buyer
        const invoice = await db.collection('invoices').findOne({
            _id: new ObjectId(invoiceId),
            buyerEmail: session.user.email,
        });

        if (!invoice) {
            return NextResponse.json(
                { error: 'Invoice not found or does not belong to you' },
                { status: 404 }
            );
        }

        // Check if dispute already exists for this invoice
        const existingDispute = await db.collection('disputes').findOne({
            invoiceId: invoiceId,
            status: { $ne: 'RESOLVED' },
        });

        if (existingDispute) {
            return NextResponse.json(
                { error: 'A dispute already exists for this invoice' },
                { status: 400 }
            );
        }

        // Create the dispute
        const dispute = {
            invoiceId: invoiceId,
            raisedBy: session.user.id,
            buyerEmail: session.user.email,
            reason: reason,
            status: 'PENDING',
            createdAt: new Date(),
            resolvedAt: null,
            resolution: null,
        };

        const result = await db.collection('disputes').insertOne(dispute);

        // Update invoice status to DISPUTED
        await db.collection('invoices').updateOne(
            { _id: new ObjectId(invoiceId) },
            { $set: { status: 'DISPUTED', disputeId: result.insertedId.toString() } }
        );

        return NextResponse.json({
            success: true,
            disputeId: result.insertedId.toString(),
            message: 'Dispute raised successfully',
        });
    } catch (error) {
        console.error('Dispute creation error:', error);
        return NextResponse.json(
            { error: 'Failed to raise dispute' },
            { status: 500 }
        );
    }
}
