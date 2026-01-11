// Dashboard Stats API
// GET /api/stats - Get dashboard statistics
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getInsurancePoolBalance } from '@/lib/stellar/transaction';

// GET /api/stats - Dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const userId = new ObjectId(session.user.id);
    const userType = session.user.userType;

    // Get invoice counts by status
    const invoiceStatusCounts = await db.collection('invoices').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray();

    const invoicesByStatus: Record<string, number> = {};
    invoiceStatusCounts.forEach((s) => {
      invoicesByStatus[s._id || 'UNKNOWN'] = s.count;
    });

    // Get total volume (sum of all invoice amounts)
    const volumeAgg = await db.collection('invoices').aggregate([
      { $group: { _id: null, total: { $sum: { $toLong: '$amount' } } } },
    ]).toArray();
    const totalVolume = volumeAgg[0]?.total || 0;

    // Get user-specific stats based on role
    let userStats: Record<string, unknown> = {};

    if (userType === 'SUPPLIER') {
      // Supplier stats
      const supplierInvoices = await db.collection('invoices').aggregate([
        { $match: { supplierId: userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: { $toLong: '$amount' } },
          },
        },
      ]).toArray();

      const myInvoices: Record<string, { count: number; amount: number }> = {};
      supplierInvoices.forEach((s) => {
        myInvoices[s._id || 'UNKNOWN'] = { count: s.count, amount: s.totalAmount };
      });

      const totalReceived = await db.collection('invoices').aggregate([
        { $match: { supplierId: userId, status: 'SETTLED' } },
        { $group: { _id: null, total: { $sum: { $toLong: '$repaymentReceived' } } } },
      ]).toArray();

      userStats = {
        myInvoices,
        totalInvoicesCreated: supplierInvoices.reduce((sum, s) => sum + s.count, 0),
        totalAmountFinanced: supplierInvoices.reduce((sum, s) => sum + s.totalAmount, 0),
        totalReceived: totalReceived[0]?.total || 0,
      };
    } else if (userType === 'BUYER') {
      // Buyer stats
      const buyerInvoices = await db.collection('invoices').aggregate([
        { $match: { buyerId: userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: { $toLong: '$amount' } },
          },
        },
      ]).toArray();

      const pendingPayment = await db.collection('invoices').aggregate([
        { $match: { buyerId: userId, status: { $in: ['VERIFIED', 'FUNDED', 'OVERDUE'] } } },
        { $group: { _id: null, total: { $sum: { $toLong: '$amount' } } } },
      ]).toArray();

      userStats = {
        invoicesToApprove: buyerInvoices.find((s) => s._id === 'DRAFT')?.count || 0,
        invoicesToPay: buyerInvoices.filter((s) => ['VERIFIED', 'FUNDED', 'OVERDUE'].includes(s._id)).reduce((sum, s) => sum + s.count, 0),
        pendingPaymentAmount: pendingPayment[0]?.total || 0,
        totalPaid: buyerInvoices.find((s) => s._id === 'SETTLED')?.totalAmount || 0,
      };
    } else if (userType === 'INVESTOR') {
      // Investor stats
      const investments = await db.collection('investments').aggregate([
        { $match: { investorId: userId } },
        {
          $group: {
            _id: null,
            totalInvested: { $sum: { $toLong: '$paymentAmount' } },
            totalTokens: { $sum: { $toLong: '$tokenAmount' } },
            count: { $sum: 1 },
          },
        },
      ]).toArray();

      const activeInvestments = await db.collection('investments').aggregate([
        { $match: { investorId: userId } },
        {
          $lookup: {
            from: 'invoices',
            localField: 'invoiceId',
            foreignField: 'invoiceId',
            as: 'invoice',
          },
        },
        { $unwind: '$invoice' },
        { $match: { 'invoice.status': { $nin: ['SETTLED', 'DEFAULTED', 'REVOKED'] } } },
        {
          $group: {
            _id: null,
            activeAmount: { $sum: { $toLong: '$paymentAmount' } },
            count: { $sum: 1 },
          },
        },
      ]).toArray();

      const returns = await db.collection('investments').aggregate([
        { $match: { investorId: userId, returnAmount: { $exists: true, $gt: 0 } } },
        { $group: { _id: null, totalReturns: { $sum: { $toLong: '$returnAmount' } } } },
      ]).toArray();

      userStats = {
        totalInvested: investments[0]?.totalInvested || 0,
        totalTokensHeld: investments[0]?.totalTokens || 0,
        investmentCount: investments[0]?.count || 0,
        activeInvestments: activeInvestments[0]?.count || 0,
        activeInvestmentValue: activeInvestments[0]?.activeAmount || 0,
        totalReturns: returns[0]?.totalReturns || 0,
      };
    }

    // Get insurance pool balance
    let insurancePoolBalance: string = '0';
    try {
      const balance = await getInsurancePoolBalance();
      insurancePoolBalance = balance.toString();
    } catch {
      // Contract call failed, use 0
    }

    // Get recent activity
    const recentInvoices = await db.collection('invoices')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      platform: {
        totalInvoices: Object.values(invoicesByStatus).reduce((a, b) => a + b, 0),
        invoicesByStatus,
        totalVolume: totalVolume.toString(),
        insurancePoolBalance,
      },
      user: userStats,
      recentActivity: recentInvoices.map((inv) => ({
        id: inv._id.toString(),
        invoiceId: inv.invoiceId,
        status: inv.status,
        amount: inv.amount?.toString(),
        createdAt: inv.createdAt,
      })),
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get stats' },
      { status: 500 }
    );
  }
}
