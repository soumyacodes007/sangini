// Investor Earnings API - Track returns from funded invoices
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

        // Only investors can view their earnings
        if (session.user.userType !== 'INVESTOR') {
            return NextResponse.json({ error: 'Only investors can view earnings' }, { status: 403 });
        }

        const db = await getDb();
        const walletAddress = session.user.walletAddress;
        const userId = session.user.id;

        console.log('Earnings API - wallet:', walletAddress, 'userId:', userId);

        // Get ALL investments made by this investor (including SOLD)
        // We need ALL to calculate total cash out
        const investments = await db.collection('investments').find({
            $or: [
                { investorId: userId },
                { investorId: new ObjectId(userId) },
                { investor: walletAddress },
                { investorAddress: walletAddress },
            ],
        }).toArray();

        console.log('Earnings API - found investments:', investments.length);

        // Get distributions (settled payouts) for this investor
        const distributions = await db.collection('investor_distributions').find({
            $or: [
                { investorId: userId },
                { investorId: new ObjectId(userId) },
                { investorAddress: walletAddress },
            ],
        }).toArray();

        console.log('Earnings API - found distributions:', distributions.length);

        // Get secondary market sales (realized P&L from selling tokens)
        const secondaryMarketSales = await db.collection('secondary_market_sales').find({
            $or: [
                { sellerId: userId },
                { sellerId: new ObjectId(userId) },
                { sellerAddress: walletAddress },
            ],
        }).toArray();

        console.log('Earnings API - found secondary market sales:', secondaryMarketSales.length);

        // CASHFLOW-BASED P&L CALCULATION
        // Track ALL money in and ALL money out
        
        let totalCashOut = BigInt(0);  // All purchases (primary + secondary)
        let totalCashIn = BigInt(0);   // All returns (settlements + sales)
        let pendingReturns = BigInt(0); // Expected returns from unsettled holdings

        // Build earnings by invoice for display
        const earningsMap = new Map<string, {
            invoiceId: string;
            invoiceDbId: string;
            description: string;
            investedAmount: string;
            expectedReturn: string;
            actualReturn: string;
            profit: string;
            status: string;
            investedAt: Date;
            settledAt?: Date;
        }>();

        // 1. CASH OUT: Primary market investments
        for (const investment of investments) {
            const purchasePrice = BigInt(investment.purchasePrice || investment.investedAmount || '0');
            const tokenAmount = BigInt(investment.tokenAmount || '0');
            const invoiceKey = investment.invoiceId || investment.onChainInvoiceId;

            // Add to total cash out (what we paid)
            totalCashOut += purchasePrice;

            // Get invoice details
            let invoice = null;
            try {
                if (investment.invoiceId && ObjectId.isValid(investment.invoiceId)) {
                    invoice = await db.collection('invoices').findOne({
                        _id: new ObjectId(investment.invoiceId),
                    });
                }
            } catch { /* not ObjectId */ }

            if (!invoice && investment.onChainInvoiceId) {
                invoice = await db.collection('invoices').findOne({
                    onChainId: investment.onChainInvoiceId,
                });
            }

            // Check if there's a distribution for this investment
            const distribution = distributions.find(d =>
                d.investmentId === investment._id.toString() ||
                d.invoiceId === investment.invoiceId ||
                d.onChainInvoiceId === investment.onChainInvoiceId
            );

            if (distribution) {
                // CASH IN: Settlement distribution
                const distributionAmount = BigInt(distribution.distributionAmount || '0');
                totalCashIn += distributionAmount;

                earningsMap.set(invoiceKey, {
                    invoiceId: distribution.onChainInvoiceId || invoiceKey,
                    invoiceDbId: distribution.invoiceId || investment.invoiceId,
                    description: invoice?.description || 'Invoice investment',
                    investedAmount: purchasePrice.toString(),
                    expectedReturn: tokenAmount.toString(),
                    actualReturn: distributionAmount.toString(),
                    profit: (distributionAmount - purchasePrice).toString(),
                    status: 'SETTLED',
                    investedAt: investment.timestamp || investment.investedAt || investment.createdAt,
                    settledAt: distribution.timestamp,
                });
            } else if (investment.status !== 'SOLD') {
                // Not settled and not sold - pending
                pendingReturns += tokenAmount;

                earningsMap.set(invoiceKey, {
                    invoiceId: investment.onChainInvoiceId || invoiceKey,
                    invoiceDbId: investment.invoiceId,
                    description: invoice?.description || 'Invoice investment',
                    investedAmount: purchasePrice.toString(),
                    expectedReturn: tokenAmount.toString(),
                    actualReturn: '0',
                    profit: '0',
                    status: investment.status || 'PENDING',
                    investedAt: investment.timestamp || investment.investedAt || investment.createdAt,
                });
            }
        }

        // CRITICAL FIX: Add back cost basis of sold tokens
        // When tokens are sold, the investment record is updated with remaining cost
        // But for P&L, we need to count the ORIGINAL investment (remaining + sold)
        for (const sale of secondaryMarketSales) {
            const costBasis = BigInt(sale.costBasis || '0');
            totalCashOut += costBasis;  // Add back what we originally paid for sold tokens
        }

        // 2. CASH IN/OUT: Secondary market transactions
        // Get secondary market PURCHASES (cash out)
        const secondaryPurchases = await db.collection('orderFills').find({
            $or: [
                { buyerId: userId },
                { buyerId: new ObjectId(userId) },
                { buyerAddress: walletAddress },
            ],
        }).toArray();

        console.log('Earnings API - found secondary market purchases:', secondaryPurchases.length);

        for (const purchase of secondaryPurchases) {
            const paymentAmount = BigInt(purchase.paymentAmount || '0');
            totalCashOut += paymentAmount;  // CASH OUT: What we paid
        }

        // CASH IN: Secondary market sales
        for (const sale of secondaryMarketSales) {
            const salePrice = BigInt(sale.salePrice || '0');
            totalCashIn += salePrice;  // CASH IN: What we received
        }

        const earningsByInvoice = Array.from(earningsMap.values());

        // Calculate net P&L and ROI
        const netPL = totalCashIn - totalCashOut;
        const roi = totalCashOut > BigInt(0) 
            ? (Number(netPL) / Number(totalCashOut)) * 100 
            : 0;

        // Calculate realized P&L from secondary sales
        const realizedPLFromSales = secondaryMarketSales.reduce((sum, sale) => {
            return sum + BigInt(sale.realizedPL || '0');
        }, BigInt(0));

        // Calculate profit from settlements
        const settlementProfit = distributions.reduce((sum, dist) => {
            return sum + BigInt(dist.profit || '0');
        }, BigInt(0));

        // Calculate total cash in from each source
        const cashInFromSales = secondaryMarketSales.reduce((sum, sale) => {
            return sum + BigInt(sale.salePrice || '0');
        }, BigInt(0));

        const cashInFromSettlements = distributions.reduce((sum, dist) => {
            return sum + BigInt(dist.distributionAmount || '0');
        }, BigInt(0));

        console.log('Earnings Summary (Cashflow-Based):', {
            totalCashOut: Number(totalCashOut) / 10000000,
            totalCashIn: Number(totalCashIn) / 10000000,
            cashInFromSales: Number(cashInFromSales) / 10000000,
            cashInFromSettlements: Number(cashInFromSettlements) / 10000000,
            netPL: Number(netPL) / 10000000,
            pendingReturns: Number(pendingReturns) / 10000000,
            realizedPLFromSales: Number(realizedPLFromSales) / 10000000,
            settlementProfit: Number(settlementProfit) / 10000000,
            roi: roi.toFixed(2),
        });

        // Format secondary market sales for display
        const salesHistory = secondaryMarketSales.map(sale => ({
            orderId: sale.orderId,
            invoiceId: sale.invoiceId,
            tokenAmount: sale.tokenAmount,
            salePrice: sale.salePrice,
            costBasis: sale.costBasis,
            realizedPL: sale.realizedPL,
            soldAt: sale.soldAt,
            txHash: sale.txHash,
        }));

        return NextResponse.json({
            earnings: earningsByInvoice,
            salesHistory,
            summary: {
                totalInvested: totalCashOut.toString(),
                totalReturns: totalCashIn.toString(),
                pendingReturns: pendingReturns.toString(),
                totalProfit: netPL.toString(),
                realizedPLFromSales: realizedPLFromSales.toString(),
                settlementProfit: settlementProfit.toString(),
                cashInFromSales: cashInFromSales.toString(),
                cashInFromSettlements: cashInFromSettlements.toString(),
                roi: roi.toFixed(2),
                investmentCount: investments.length,
                settledCount: distributions.length,
                secondaryMarketSales: secondaryMarketSales.length,
                secondaryMarketPurchases: secondaryPurchases.length,
            },
        });
    } catch (error) {
        console.error('Investor earnings fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch earnings' },
            { status: 500 }
        );
    }
}
