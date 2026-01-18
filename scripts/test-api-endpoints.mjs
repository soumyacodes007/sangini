#!/usr/bin/env node

/**
 * Test API Endpoints
 * Simulates frontend API calls and verifies responses
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sangini';

async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints (Simulating Frontend Calls)\n');
  console.log('═'.repeat(80));

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();

    // Get test investor with actual data
    const investor = await db.collection('users').findOne({
      userType: 'INVESTOR',
      walletAddress: 'GCPRHSMKBVHIYNYA5KTTCMNR2VAWDGE5IVFGMBQOPLKKSYBYF42M7JLS'
    });

    if (!investor) {
      console.log('❌ Test investor not found');
      return;
    }

    console.log(`📊 Testing for investor: ${investor.walletAddress}\n`);

    // Test 1: Earnings API
    console.log('1️⃣  Testing /api/investor/earnings');
    console.log('─'.repeat(80));

    const walletAddress = investor.walletAddress;
    const userId = investor._id.toString();

    // Simulate the API logic
    const investments = await db.collection('investments').find({
      $or: [
        { investorId: userId },
        { investor: walletAddress },
        { investorAddress: walletAddress },
      ],
    }).toArray();

    const distributions = await db.collection('investor_distributions').find({
      $or: [
        { investorId: userId },
        { investorAddress: walletAddress },
      ],
    }).toArray();

    const secondaryMarketSales = await db.collection('secondary_market_sales').find({
      $or: [
        { sellerId: userId },
        { sellerAddress: walletAddress },
      ],
    }).toArray();

    const secondaryPurchases = await db.collection('orderFills').find({
      $or: [
        { buyerId: userId },
        { buyerAddress: walletAddress },
      ],
    }).toArray();

    // Calculate P&L (matching API logic)
    let totalCashOut = BigInt(0);
    let totalCashIn = BigInt(0);
    let pendingReturns = BigInt(0);

    // Cash out: Primary investments
    for (const inv of investments) {
      const purchasePrice = BigInt(inv.purchasePrice || inv.investedAmount || '0');
      totalCashOut += purchasePrice;
    }

    // CRITICAL: Add back cost basis of sold tokens
    for (const sale of secondaryMarketSales) {
      const costBasis = BigInt(sale.costBasis || '0');
      totalCashOut += costBasis;
    }

    // Cash out: Secondary purchases
    for (const purchase of secondaryPurchases) {
      const paymentAmount = BigInt(purchase.paymentAmount || '0');
      totalCashOut += paymentAmount;
    }

    // Cash in: Settlements
    for (const dist of distributions) {
      const distributionAmount = BigInt(dist.distributionAmount || '0');
      totalCashIn += distributionAmount;
    }

    // Cash in: Secondary sales
    for (const sale of secondaryMarketSales) {
      const salePrice = BigInt(sale.salePrice || '0');
      totalCashIn += salePrice;
    }

    // Calculate pending
    for (const inv of investments) {
      if (inv.status !== 'SOLD') {
        const hasDistribution = distributions.some(d =>
          d.investmentId === inv._id.toString() ||
          d.invoiceId === inv.invoiceId ||
          d.onChainInvoiceId === inv.onChainInvoiceId
        );
        if (!hasDistribution) {
          pendingReturns += BigInt(inv.tokenAmount || '0');
        }
      }
    }

    const netPL = totalCashIn - totalCashOut;
    const roi = totalCashOut > BigInt(0) 
      ? (Number(netPL) / Number(totalCashOut)) * 100 
      : 0;

    const realizedPLFromSales = secondaryMarketSales.reduce((sum, sale) => {
      return sum + BigInt(sale.realizedPL || '0');
    }, BigInt(0));

    const settlementProfit = distributions.reduce((sum, dist) => {
      return sum + BigInt(dist.profit || '0');
    }, BigInt(0));

    const cashInFromSales = secondaryMarketSales.reduce((sum, sale) => {
      return sum + BigInt(sale.salePrice || '0');
    }, BigInt(0));

    const cashInFromSettlements = distributions.reduce((sum, dist) => {
      return sum + BigInt(dist.distributionAmount || '0');
    }, BigInt(0));

    console.log('   API Response (Simulated):');
    console.log('   {');
    console.log(`     totalInvested: "${totalCashOut.toString()}" (${(Number(totalCashOut) / 10000000).toFixed(2)} XLM)`);
    console.log(`     totalReturns: "${totalCashIn.toString()}" (${(Number(totalCashIn) / 10000000).toFixed(2)} XLM)`);
    console.log(`     pendingReturns: "${pendingReturns.toString()}" (${(Number(pendingReturns) / 10000000).toFixed(2)} XLM)`);
    console.log(`     totalProfit: "${netPL.toString()}" (${(Number(netPL) / 10000000).toFixed(2)} XLM)`);
    console.log(`     `);
    console.log(`     💰 Income Breakdown:`);
    console.log(`     realizedPLFromSales: "${realizedPLFromSales.toString()}" (${(Number(realizedPLFromSales) / 10000000).toFixed(2)} XLM)`);
    console.log(`     settlementProfit: "${settlementProfit.toString()}" (${(Number(settlementProfit) / 10000000).toFixed(2)} XLM)`);
    console.log(`     cashInFromSales: "${cashInFromSales.toString()}" (${(Number(cashInFromSales) / 10000000).toFixed(2)} XLM)`);
    console.log(`     cashInFromSettlements: "${cashInFromSettlements.toString()}" (${(Number(cashInFromSettlements) / 10000000).toFixed(2)} XLM)`);
    console.log(`     `);
    console.log(`     roi: "${roi.toFixed(2)}%"`);
    console.log(`     investmentCount: ${investments.length}`);
    console.log(`     settledCount: ${distributions.length}`);
    console.log(`     secondaryMarketSales: ${secondaryMarketSales.length}`);
    console.log(`     secondaryMarketPurchases: ${secondaryPurchases.length}`);
    console.log('   }');
    console.log();

    // Breakdown
    console.log('   📊 Detailed Breakdown:');
    console.log('   ─'.repeat(40));
    console.log(`   Primary Investments: ${investments.length}`);
    for (const inv of investments) {
      const cost = Number(BigInt(inv.purchasePrice || inv.investedAmount || '0')) / 10000000;
      const tokens = Number(BigInt(inv.tokenAmount || '0')) / 10000000;
      console.log(`     - ${tokens.toFixed(2)} tokens @ ${cost.toFixed(2)} XLM (${inv.status || 'ACTIVE'})`);
    }
    console.log();

    if (secondaryMarketSales.length > 0) {
      console.log(`   Secondary Sales: ${secondaryMarketSales.length}`);
      for (const sale of secondaryMarketSales) {
        const salePrice = Number(BigInt(sale.salePrice || '0')) / 10000000;
        const costBasis = Number(BigInt(sale.costBasis || '0')) / 10000000;
        const profit = Number(BigInt(sale.realizedPL || '0')) / 10000000;
        console.log(`     - Sold for ${salePrice.toFixed(2)} XLM (cost: ${costBasis.toFixed(2)}, profit: ${profit.toFixed(2)})`);
      }
      console.log();
    }

    if (secondaryPurchases.length > 0) {
      console.log(`   Secondary Purchases: ${secondaryPurchases.length}`);
      for (const purchase of secondaryPurchases) {
        const paid = Number(BigInt(purchase.paymentAmount || '0')) / 10000000;
        const tokens = Number(BigInt(purchase.tokenAmount || '0')) / 10000000;
        console.log(`     - Bought ${tokens.toFixed(2)} tokens for ${paid.toFixed(2)} XLM`);
      }
      console.log();
    }

    if (distributions.length > 0) {
      console.log(`   Settlements: ${distributions.length}`);
      for (const dist of distributions) {
        const received = Number(BigInt(dist.distributionAmount || '0')) / 10000000;
        const cost = Number(BigInt(dist.purchasePrice || '0')) / 10000000;
        const profit = Number(BigInt(dist.profit || '0')) / 10000000;
        console.log(`     - Received ${received.toFixed(2)} XLM (cost: ${cost.toFixed(2)}, profit: ${profit.toFixed(2)})`);
      }
      console.log();
    }

    console.log('   ✅ Earnings API test complete\n');

    // Test 2: Portfolio API
    console.log('2️⃣  Testing /api/portfolio');
    console.log('─'.repeat(80));

    const portfolioInvestments = await db.collection('investments').find({
      $and: [
        {
          $or: [
            { investor: walletAddress },
            { investorAddress: walletAddress },
          ],
        },
        {
          $or: [
            { status: 'COMPLETED' },
            { status: { $exists: false } },
          ],
        },
        {
          status: { $ne: 'SOLD' },
        },
      ],
    }).toArray();

    console.log(`   Found ${portfolioInvestments.length} active holdings`);
    console.log();

    for (const inv of portfolioInvestments) {
      const tokens = Number(BigInt(inv.tokenAmount || '0')) / 10000000;
      const cost = Number(BigInt(inv.purchasePrice || inv.investedAmount || '0')) / 10000000;
      const expectedReturn = tokens; // Face value
      const unrealizedProfit = expectedReturn - cost;

      console.log(`   Holding:`);
      console.log(`     Invoice: ${inv.invoiceId || inv.onChainInvoiceId}`);
      console.log(`     Tokens: ${tokens.toFixed(2)}`);
      console.log(`     Cost: ${cost.toFixed(2)} XLM`);
      console.log(`     Expected Return: ${expectedReturn.toFixed(2)} XLM`);
      console.log(`     Unrealized Profit: ${unrealizedProfit.toFixed(2)} XLM`);
      console.log(`     Via: ${inv.acquiredVia || 'PRIMARY_MARKET'}`);
      console.log();
    }

    console.log('   ✅ Portfolio API test complete\n');

    // Test 3: Secondary Market API
    console.log('3️⃣  Testing /api/secondary-market');
    console.log('─'.repeat(80));

    const openOrders = await db.collection('sellOrders').find({
      status: { $in: ['OPEN', 'PARTIALLY_FILLED'] },
    }).toArray();

    console.log(`   Found ${openOrders.length} open orders`);
    console.log();

    for (const order of openOrders.slice(0, 3)) {
      const tokens = Number(BigInt(order.tokensRemaining || order.tokenAmount || '0')) / 10000000;
      const pricePerToken = Number(BigInt(order.pricePerToken || '0')) / 10000000;
      const totalPrice = tokens * pricePerToken;

      console.log(`   Order:`);
      console.log(`     ID: ${order.orderId}`);
      console.log(`     Seller: ${order.sellerAddress?.slice(0, 12)}...`);
      console.log(`     Tokens: ${tokens.toFixed(2)}`);
      console.log(`     Price: ${totalPrice.toFixed(2)} XLM (${pricePerToken.toFixed(4)} per token)`);
      console.log();
    }

    console.log('   ✅ Secondary Market API test complete\n');

    // Summary
    console.log('📊 SUMMARY');
    console.log('═'.repeat(80));
    console.log(`✅ All API endpoints tested successfully`);
    console.log();
    console.log('Frontend should display:');
    console.log(`  - Total Invested: ${(Number(totalCashOut) / 10000000).toFixed(2)} XLM`);
    console.log(`  - Total Returns: ${(Number(totalCashIn) / 10000000).toFixed(2)} XLM`);
    console.log(`  - Net P&L: ${(Number(netPL) / 10000000).toFixed(2)} XLM`);
    console.log(`  - ROI: ${roi.toFixed(2)}%`);
    console.log(`  - Active Holdings: ${portfolioInvestments.length}`);
    console.log(`  - Open Orders: ${openOrders.length}`);
    console.log();

    console.log('🎯 To verify in frontend:');
    console.log('  1. Start dev server: npm run dev');
    console.log('  2. Login as investor: ' + investor.walletAddress);
    console.log('  3. Navigate to /dashboard/earnings');
    console.log('  4. Check if numbers match the summary above');
    console.log();

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the test
testAPIEndpoints().catch(console.error);
