// Secondary Market API - List all open sell orders from investors
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

        const db = await getDb();
        const walletAddress = session.user.walletAddress;

        console.log('Secondary Market - fetching orders for wallet:', walletAddress);

        // DEV MODE: Include user's own orders for testing
        // In production, set this to false
        const DEV_MODE = true;

        // Build query - exclude own orders unless in dev mode
        const query: Record<string, unknown> = {
            status: { $in: ['OPEN', 'PARTIALLY_FILLED'] },
        };

        if (!DEV_MODE) {
            query.sellerAddress = { $ne: walletAddress };
        }

        // Get all open sell orders
        const orders = await db.collection('sellOrders').find(query).sort({ createdAt: -1 }).toArray();

        console.log('Secondary Market - found orders:', orders.length, DEV_MODE ? '(DEV MODE - includes own orders)' : '');

        // Get invoice details for each order
        const ordersWithDetails = await Promise.all(
            orders.map(async (order) => {
                let invoice = null;

                // Try to find by onChainId first
                if (order.invoiceId) {
                    invoice = await db.collection('invoices').findOne({
                        onChainId: order.invoiceId,
                    });
                }

                // Fallback to _id if invoiceDbId exists
                if (!invoice && order.invoiceDbId) {
                    try {
                        invoice = await db.collection('invoices').findOne({
                            _id: new ObjectId(order.invoiceDbId),
                        });
                    } catch (e) {
                        // Invalid ObjectId, skip
                    }
                }

                // Calculate total price from tokensRemaining and pricePerToken
                const tokensRemaining = BigInt(order.tokensRemaining || order.tokenAmount || '0');
                const pricePerToken = BigInt(order.pricePerToken || '0');
                const totalPrice = (tokensRemaining * pricePerToken / BigInt(10000000)).toString();

                return {
                    id: order._id.toString(),
                    invoiceId: order.invoiceId,
                    invoiceDbId: order.invoiceDbId,
                    seller: order.sellerAddress, // FIXED: use sellerAddress from sellOrders
                    tokenAmount: order.tokensRemaining || order.tokenAmount, // Show remaining tokens
                    filledAmount: order.tokensFilled || '0',
                    pricePerToken: order.pricePerToken,
                    totalPrice: totalPrice,
                    status: order.status,
                    createdAt: order.createdAt,
                    // Invoice details
                    invoiceDescription: invoice?.description,
                    invoiceAmount: invoice?.amount,
                    invoiceStatus: invoice?.status,
                    invoiceDueDate: invoice?.dueDate,
                    supplierAddress: invoice?.supplierAddress,
                };
            })
        );

        return NextResponse.json({ orders: ordersWithDetails });
    } catch (error) {
        console.error('Secondary market fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch secondary market orders' },
            { status: 500 }
        );
    }
}
