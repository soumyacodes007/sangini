// Purchase History API - Get user's secondary market purchases and sales
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
        const userId = session.user.id;

        // Get all purchases (order fills) made by this user
        const fills = await db.collection('orderFills').find({
            $or: [
                { buyerId: new ObjectId(userId) },
                { buyerAddress: walletAddress },
            ],
        }).sort({ filledAt: -1 }).toArray();

        // Get order details for each fill
        const purchases = await Promise.all(fills.map(async (fill) => {
            // Get the sell order to find seller info
            const order = await db.collection('sellOrders').findOne({
                orderId: fill.orderId,
            });

            return {
                id: fill._id.toString(),
                orderId: fill.orderId,
                invoiceId: order?.invoiceId || fill.invoiceId || 'Unknown',
                tokenAmount: fill.tokenAmount,
                paymentAmount: fill.paymentAmount,
                sellerAddress: order?.sellerAddress || 'Unknown',
                filledAt: fill.filledAt,
                txHash: fill.txHash,
            };
        }));

        // Get all sales made by this user
        const sales = await db.collection('secondary_market_sales').find({
            $or: [
                { sellerId: new ObjectId(userId) },
                { sellerAddress: walletAddress },
            ],
        }).sort({ soldAt: -1 }).toArray();

        const salesHistory = sales.map(sale => ({
            id: sale._id.toString(),
            orderId: sale.orderId,
            invoiceId: sale.invoiceId,
            tokenAmount: sale.tokenAmount,
            salePrice: sale.salePrice,
            costBasis: sale.costBasis,
            realizedPL: sale.realizedPL,
            buyerAddress: sale.buyerAddress,
            soldAt: sale.soldAt,
            txHash: sale.txHash,
        }));

        return NextResponse.json({ 
            purchases,
            sales: salesHistory,
        });
    } catch (error) {
        console.error('Purchase history fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch purchase history' },
            { status: 500 }
        );
    }
}
