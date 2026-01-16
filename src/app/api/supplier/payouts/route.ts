// Supplier Payouts API - List payouts received by supplier
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only suppliers can view their payouts
        if (session.user.userType !== 'SUPPLIER') {
            return NextResponse.json({ error: 'Only suppliers can view payouts' }, { status: 403 });
        }

        const db = await getDb();
        const walletAddress = session.user.walletAddress;
        const userId = session.user.id;

        // Get all payouts for this supplier
        const payouts = await db.collection('supplier_payouts').find({
            $or: [
                { supplierId: new ObjectId(userId) },
                { supplierAddress: walletAddress },
            ],
            status: 'COMPLETED',
        }).sort({ timestamp: -1 }).toArray();

        // Calculate totals
        let totalReceived = BigInt(0);
        let totalInsurancePaid = BigInt(0);
        let totalGrossPayments = BigInt(0);

        for (const payout of payouts) {
            totalReceived += BigInt(payout.netAmount || '0');
            totalInsurancePaid += BigInt(payout.insuranceCut || '0');
            totalGrossPayments += BigInt(payout.paymentAmount || '0');
        }

        // Group payouts by invoice
        const payoutsByInvoice = new Map<string, {
            invoiceId: string;
            onChainInvoiceId: string;
            totalNet: bigint;
            totalGross: bigint;
            totalInsurance: bigint;
            investorCount: number;
            payouts: typeof payouts;
        }>();

        for (const payout of payouts) {
            const key = payout.invoiceId;
            const existing = payoutsByInvoice.get(key);
            if (existing) {
                existing.totalNet += BigInt(payout.netAmount || '0');
                existing.totalGross += BigInt(payout.paymentAmount || '0');
                existing.totalInsurance += BigInt(payout.insuranceCut || '0');
                existing.investorCount += 1;
                existing.payouts.push(payout);
            } else {
                payoutsByInvoice.set(key, {
                    invoiceId: payout.invoiceId,
                    onChainInvoiceId: payout.onChainInvoiceId,
                    totalNet: BigInt(payout.netAmount || '0'),
                    totalGross: BigInt(payout.paymentAmount || '0'),
                    totalInsurance: BigInt(payout.insuranceCut || '0'),
                    investorCount: 1,
                    payouts: [payout],
                });
            }
        }

        // Get invoice details for each group
        const invoiceGroups = await Promise.all(
            Array.from(payoutsByInvoice.values()).map(async (group) => {
                const invoice = await db.collection('invoices').findOne({
                    _id: new ObjectId(group.invoiceId),
                });

                return {
                    invoiceId: group.onChainInvoiceId || group.invoiceId,
                    invoiceDbId: group.invoiceId,
                    totalReceived: group.totalNet.toString(),
                    totalGross: group.totalGross.toString(),
                    insurancePaid: group.totalInsurance.toString(),
                    investorCount: group.investorCount,
                    invoiceAmount: invoice?.amount,
                    invoiceStatus: invoice?.status,
                    description: invoice?.description,
                    lastPayoutAt: group.payouts[0]?.timestamp,
                };
            })
        );

        return NextResponse.json({
            payouts: invoiceGroups,
            summary: {
                totalReceived: totalReceived.toString(),
                totalInsurancePaid: totalInsurancePaid.toString(),
                totalGrossPayments: totalGrossPayments.toString(),
                invoiceCount: payoutsByInvoice.size,
                payoutCount: payouts.length,
            },
        });
    } catch (error) {
        console.error('Supplier payouts fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payouts' },
            { status: 500 }
        );
    }
}
