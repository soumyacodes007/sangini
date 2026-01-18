#!/usr/bin/env node

/**
 * Test P&L Calculations
 * Tests cashflow-based ROI and profit calculations
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sangini';

async function testPLCalculations() {
  console.log('🧪 Testing P&L Calculations\n');

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();

    // Get a test investor
    const investor = await db.collection('users').findOne({ 
      userType: 'INVESTOR',
      walletAddress: { $exists: true }
    });

    if (!investor) {
      console.log('❌ No investor found in database');
      return;
    }

    console.log(`📊 Testing P&L for investor: ${investor.email || investor.walletAddress}`);
    console.log(`   Wallet: ${investor.walletAddress}\n`);

    const walletAddress = investor.walletAddress;
    const userId = investor._id.toString();

    // 1. Get all investments (cash out)
    console.log('💰 CASH OUT (Investments):');
    console.log('─'.repeat(80));
    
    const investments = await db.collection('investments').find({
      $or: [
        { investorId: userId },
        { investor: walletAddress },
        { investorAddress: walletAddress },
      ],
    }).toArray();

    let totalCashOut = BigInt(0);
    let primaryInvestments = 0;

    for (const inv of investments) {
      const purchasePrice = BigInt(inv.purchasePrice || inv.investedAmount || '0');
      const tokenAmount = BigInt(inv.tokenAmount || '0');
      totalCashOut += purchasePrice;
      primaryInvestments++;

      const invoiceId = inv.invoiceId || inv.onChainInvoiceId || 'Unknown';
      const status = inv.status || 'UNKNOWN';
      const acquiredVia = inv.acquiredVia || 'PRIMARY_MARKET';

      console.log(`  ${acquiredVia === 'SECONDARY_MARKET' ? '🛒' : '🎯'} ${invoiceId.slice(0, 12)}...`);
      console.log(`     Cost: ${(Number(purchasePrice) / 10000000).toFixed(2)} XLM`);
      console.log(`     Tokens: ${(Number(tokenAmount) / 10000000).toFixed(2)}`);
      console.log(`     Status: ${status}`);
      console.log(`     Via: ${acquiredVia}`);
      console.log();
    }

    console.log(`  📤 Total Primary Investments: ${primaryInvestments}`);
    console.log(`  💸 Total Cash Out (Primary): ${(Number(totalCashOut) / 10000000).toFixed(2)} XLM\n`);

    // 2. Get secondary market purchases (additional cash out)
    console.log('🛒 SECONDARY MARKET PURCHASES (Additional Cash Out):');
    console.log('─'.repeat(80));

    const secondaryPurchases = await db.collection('orderFills').find({
      $or: [
        { buyerId: userId },
        { buyerAddress: walletAddress },
      ],
    }).toArray();

    let secondaryCashOut = BigInt(0);

    for (const purchase of secondaryPurchases) {
      const paymentAmount = BigInt(purchase.paymentAmount || '0');
      const tokenAmount = BigInt(purchase.tokenAmount || '0');
      secondaryCashOut += paymentAmount;

      console.log(`  🛒 Order: ${purchase.orderId?.slice(0, 12) || 'Unknown'}`);
      console.log(`     Paid: ${(Number(paymentAmount) / 10000000).toFixed(2)} XLM`);
      console.log(`     Tokens: ${(Number(tokenAmount) / 10000000).toFixed(2)}`);
      console.log(`     Date: ${purchase.filledAt?.toISOString().split('T')[0] || 'Unknown'}`);
      console.log();
    }

    totalCashOut += secondaryCashOut;

    console.log(`  📤 Total Secondary Purchases: ${secondaryPurchases.length}`);
    console.log(`  💸 Additional Cash Out: ${(Number(secondaryCashOut) / 10000000).toFixed(2)} XLM`);
    console.log(`  💸 TOTAL CASH OUT: ${(Number(totalCashOut) / 10000000).toFixed(2)} XLM\n`);

    // 3. Get settlement distributions (cash in)
    console.log('💵 CASH IN (Returns):');
    console.log('─'.repeat(80));

    const distributions = await db.collection('investor_distributions').find({
      $or: [
        { investorId: userId },
        { investorAddress: walletAddress },
      ],
    }).toArray();

    let totalCashIn = BigInt(0);

    for (const dist of distributions) {
      const distributionAmount = BigInt(dist.distributionAmount || '0');
      const purchasePrice = BigInt(dist.purchasePrice || '0');
      const profit = distributionAmount - purchasePrice;
      totalCashIn += distributionAmount;

      console.log(`  ✅ ${dist.onChainInvoiceId?.slice(0, 12) || 'Unknown'}`);
      console.log(`     Received: ${(Number(distributionAmount) / 10000000).toFixed(2)} XLM`);
      console.log(`     Cost: ${(Number(purchasePrice) / 10000000).toFixed(2)} XLM`);
      console.log(`     Profit: ${(Number(profit) / 10000000).toFixed(2)} XLM`);
      console.log();
    }

    console.log(`  📥 Total Settlements: ${distributions.length}`);
    console.log(`  💰 Cash In (Settlements): ${(Number(totalCashIn) / 10000000).toFixed(2)} XLM\n`);

    // 4. Get secondary market sales (additional cash in)
    console.log('💰 SECONDARY MARKET SALES (Additional Cash In):');
    console.log('─'.repeat(80));

    const secondarySales = await db.collection('secondary_market_sales').find({
      $or: [
        { sellerId: userId },
        { sellerAddress: walletAddress },
      ],
    }).toArray();

    let secondaryCashIn = BigInt(0);
    let totalRealizedPL = BigInt(0);

    for (const sale of secondarySales) {
      const salePrice = BigInt(sale.salePrice || '0');
      const costBasis = BigInt(sale.costBasis || '0');
      const realizedPL = BigInt(sale.realizedPL || '0');
      secondaryCashIn += salePrice;
      totalRealizedPL += realizedPL;

      console.log(`  💰 Order: ${sale.orderId?.slice(0, 12) || 'Unknown'}`);
      console.log(`     Received: ${(Number(salePrice) / 10000000).toFixed(2)} XLM`);
      console.log(`     Cost Basis: ${(Number(costBasis) / 10000000).toFixed(2)} XLM`);
      console.log(`     Realized P&L: ${(Number(realizedPL) / 10000000).toFixed(2)} XLM`);
      console.log();
    }

    totalCashIn += secondaryCashIn;

    console.log(`  📥 Total Secondary Sales: ${secondarySales.length}`);
    console.log(`  💰 Additional Cash In: ${(Number(secondaryCashIn) / 10000000).toFixed(2)} XLM`);
    console.log(`  💰 TOTAL CASH IN: ${(Number(totalCashIn) / 10000000).toFixed(2)} XLM\n`);

    // 5. Calculate P&L
    console.log('📊 PROFIT & LOSS SUMMARY:');
    console.log('═'.repeat(80));

    const netPL = totalCashIn - totalCashOut;
    const roi = totalCashOut > BigInt(0) 
      ? (Number(netPL) / Number(totalCashOut)) * 100 
      : 0;

    console.log(`  💸 Total Cash Out:        ${(Number(totalCashOut) / 10000000).toFixed(2)} XLM`);
    console.log(`     - Primary Investments: ${primaryInvestments}`);
    console.log(`     - Secondary Purchases: ${secondaryPurchases.length}`);
    console.log();
    console.log(`  💰 Total Cash In:         ${(Number(totalCashIn) / 10000000).toFixed(2)} XLM`);
    console.log(`     - Settlements:         ${distributions.length}`);
    console.log(`     - Secondary Sales:     ${secondarySales.length}`);
    console.log();
    console.log(`  ${netPL >= 0 ? '📈' : '📉'} Net P&L:              ${netPL >= 0 ? '+' : ''}${(Number(netPL) / 10000000).toFixed(2)} XLM`);
    console.log(`  ${roi >= 0 ? '✅' : '❌'} ROI:                  ${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`);
    console.log();
    console.log(`  💎 Realized P&L (Sales):  ${(Number(totalRealizedPL) / 10000000).toFixed(2)} XLM`);
    console.log('═'.repeat(80));

    // 6. Calculate pending returns
    console.log('\n📊 PENDING RETURNS:');
    console.log('─'.repeat(80));

    let pendingReturns = BigInt(0);
    let pendingCount = 0;

    for (const inv of investments) {
      if (inv.status !== 'SOLD') {
        const hasDistribution = distributions.some(d =>
          d.investmentId === inv._id.toString() ||
          d.invoiceId === inv.invoiceId ||
          d.onChainInvoiceId === inv.onChainInvoiceId
        );

        if (!hasDistribution) {
          const tokenAmount = BigInt(inv.tokenAmount || '0');
          pendingReturns += tokenAmount;
          pendingCount++;
        }
      }
    }

    console.log(`  ⏳ Unsettled Investments: ${pendingCount}`);
    console.log(`  💰 Expected Returns:      ${(Number(pendingReturns) / 10000000).toFixed(2)} XLM`);
    console.log();

    // 7. Test API endpoint
    console.log('🔍 Testing API Endpoint:');
    console.log('─'.repeat(80));
    console.log(`  Run: curl http://localhost:3000/api/investor/earnings`);
    console.log(`  With session for: ${investor.email || walletAddress}`);
    console.log();

    console.log('✅ P&L Calculation Test Complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the test
testPLCalculations().catch(console.error);
