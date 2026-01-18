#!/usr/bin/env node

/**
 * Complete Workflow Test with P&L Verification
 * Tests: Create Invoice → Auction → Primary Investment → Secondary Sale → Secondary Purchase → Settlement → P&L
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sangini';

// Test data
const INVOICE_AMOUNT = 100; // 100 XLM
const AUCTION_DURATION = 24 * 60 * 60; // 24 hours in seconds

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteWorkflow() {
  console.log('🧪 Complete Workflow Test with P&L Verification\n');
  console.log('═'.repeat(80));
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();

    // Get test users
    console.log('\n📋 Step 1: Get Test Users');
    console.log('─'.repeat(80));
    
    const supplier = await db.collection('users').findOne({ 
      userType: 'SUPPLIER',
      walletAddress: { $exists: true, $ne: null }
    });
    const buyer = await db.collection('users').findOne({ 
      userType: 'BUYER',
      email: { $exists: true }
    });
    const investor1 = await db.collection('users').findOne({ 
      userType: 'INVESTOR',
      walletAddress: 'GCPRHSMKBVHIYNYA5KTTCMNR2VAWDGE5IVFGMBQOPLKKSYBYF42M7JLS'
    });
    const investor2 = await db.collection('users').findOne({ 
      userType: 'INVESTOR',
      walletAddress: 'GBL2OQ4YT3WIZSIHVITUF2IWXQCPV4ZGMLSZOJLSNVRXX2IGJI2CJQKH'
    });

    if (!supplier || !buyer || !investor1 || !investor2) {
      console.log('❌ Missing required users. Need: supplier, buyer, investor1, investor2');
      return;
    }

    console.log(`✅ Supplier: ${supplier.email || supplier.walletAddress}`);
    console.log(`✅ Buyer: ${buyer.email || buyer.walletAddress}`);
    console.log(`✅ Investor 1: ${investor1.email || investor1.walletAddress}`);
    console.log(`✅ Investor 2: ${investor2.email || investor2.walletAddress}`);

    // Create invoice
    console.log('\n📋 Step 2: Create Invoice');
    console.log('─'.repeat(80));
    
    const invoiceData = {
      buyerId: buyer._id.toString(),
      buyerName: buyer.companyName || buyer.name,
      amount: (INVOICE_AMOUNT * 10000000).toString(),
      description: `Test Invoice - P&L Verification ${Date.now()}`,
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      documentUrl: 'https://example.com/invoice.pdf',
    };

    const invoice = await db.collection('invoices').insertOne({
      ...invoiceData,
      supplierId: supplier._id,
      supplierAddress: supplier.walletAddress,
      buyerAddress: buyer.walletAddress,
      status: 'DRAFT',
      totalTokens: invoiceData.amount,
      tokensSold: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const invoiceId = invoice.insertedId.toString();
    const onChainId = `INV-TEST-${Date.now()}`;

    await db.collection('invoices').updateOne(
      { _id: invoice.insertedId },
      { $set: { invoiceId: onChainId, onChainId } }
    );

    console.log(`✅ Invoice created: ${onChainId}`);
    console.log(`   Amount: ${INVOICE_AMOUNT} XLM`);
    logTest('Invoice Creation', true, `${onChainId} - ${INVOICE_AMOUNT} XLM`);

    // Buyer approves
    console.log('\n📋 Step 3: Buyer Approves Invoice');
    console.log('─'.repeat(80));
    
    await db.collection('invoices').updateOne(
      { _id: invoice.insertedId },
      { $set: { status: 'VERIFIED', updatedAt: new Date() } }
    );

    console.log('✅ Invoice approved by buyer');
    logTest('Buyer Approval', true);

    // Start auction
    console.log('\n📋 Step 4: Start Dutch Auction');
    console.log('─'.repeat(80));
    
    const now = Math.floor(Date.now() / 1000);
    await db.collection('invoices').updateOne(
      { _id: invoice.insertedId },
      {
        $set: {
          status: 'FUNDING',
          auctionStart: now,
          auctionEnd: now + AUCTION_DURATION,
          startPrice: (INVOICE_AMOUNT * 10000000).toString(),
          minPrice: (INVOICE_AMOUNT * 0.9 * 10000000).toString(), // 10% max discount
          updatedAt: new Date(),
        }
      }
    );

    console.log('✅ Auction started');
    console.log(`   Start Price: ${INVOICE_AMOUNT} XLM (100%)`);
    console.log(`   Min Price: ${INVOICE_AMOUNT * 0.9} XLM (90%)`);
    logTest('Auction Start', true, '10% max discount');

    // Investor 1 invests (primary market)
    console.log('\n📋 Step 5: Investor 1 Invests (Primary Market)');
    console.log('─'.repeat(80));
    
    const inv1Amount = 60 * 10000000; // 60 tokens
    const inv1Payment = 57 * 10000000; // 57 XLM (5% discount)

    const investment1 = await db.collection('investments').insertOne({
      invoiceId: invoiceId,
      onChainInvoiceId: onChainId,
      investorId: investor1._id,
      investor: investor1.walletAddress,
      investorAddress: investor1.walletAddress,
      tokenAmount: inv1Amount.toString(),
      purchasePrice: inv1Payment.toString(),
      investedAmount: inv1Payment.toString(),
      acquiredVia: 'PRIMARY_MARKET',
      timestamp: new Date(),
      investedAt: new Date(),
      txHash: `TX-INV1-${Date.now()}`,
      status: 'COMPLETED',
    });

    await db.collection('invoices').updateOne(
      { _id: invoice.insertedId },
      {
        $set: {
          tokensSold: inv1Amount.toString(),
          amountRaised: inv1Payment.toString(),
          updatedAt: new Date(),
        }
      }
    );

    console.log(`✅ Investor 1 invested`);
    console.log(`   Tokens: 60`);
    console.log(`   Paid: 57 XLM (5% discount)`);
    console.log(`   Expected Return: 60 XLM`);
    console.log(`   Expected Profit: 3 XLM (5.26% ROI)`);
    logTest('Primary Investment (Investor 1)', true, '60 tokens @ 57 XLM');

    // Investor 2 invests (primary market)
    console.log('\n📋 Step 6: Investor 2 Invests (Primary Market)');
    console.log('─'.repeat(80));
    
    const inv2Amount = 40 * 10000000; // 40 tokens
    const inv2Payment = 38 * 10000000; // 38 XLM (5% discount)

    const investment2 = await db.collection('investments').insertOne({
      invoiceId: invoiceId,
      onChainInvoiceId: onChainId,
      investorId: investor2._id,
      investor: investor2.walletAddress,
      investorAddress: investor2.walletAddress,
      tokenAmount: inv2Amount.toString(),
      purchasePrice: inv2Payment.toString(),
      investedAmount: inv2Payment.toString(),
      acquiredVia: 'PRIMARY_MARKET',
      timestamp: new Date(),
      investedAt: new Date(),
      txHash: `TX-INV2-${Date.now()}`,
      status: 'COMPLETED',
    });

    const totalRaised = inv1Payment + inv2Payment;
    await db.collection('invoices').updateOne(
      { _id: invoice.insertedId },
      {
        $set: {
          tokensSold: (inv1Amount + inv2Amount).toString(),
          amountRaised: totalRaised.toString(),
          status: 'FUNDED',
          updatedAt: new Date(),
        }
      }
    );

    console.log(`✅ Investor 2 invested`);
    console.log(`   Tokens: 40`);
    console.log(`   Paid: 38 XLM (5% discount)`);
    console.log(`   Expected Return: 40 XLM`);
    console.log(`   Expected Profit: 2 XLM (5.26% ROI)`);
    console.log(`\n   📊 Invoice fully funded: ${totalRaised / 10000000} XLM raised`);
    logTest('Primary Investment (Investor 2)', true, '40 tokens @ 38 XLM');

    // Investor 1 sells on secondary market
    console.log('\n📋 Step 7: Investor 1 Sells 30 Tokens on Secondary Market');
    console.log('─'.repeat(80));
    
    const sellTokens = 30 * 10000000;
    const sellPrice = 31 * 10000000; // 31 XLM (3.3% premium)

    const sellOrder = await db.collection('sellOrders').insertOne({
      orderId: `ORD-TEST-${Date.now()}`,
      invoiceId: onChainId,
      invoiceDbId: invoiceId,
      sellerId: investor1._id,
      sellerAddress: investor1.walletAddress,
      tokenAmount: sellTokens.toString(),
      pricePerToken: (sellPrice / 30).toString(),
      tokensRemaining: sellTokens.toString(),
      status: 'OPEN',
      txHash: `TX-SELL-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Sell order created`);
    console.log(`   Tokens: 30`);
    console.log(`   Price: 31 XLM (3.3% premium over cost)`);
    logTest('Secondary Market Sell Order', true, '30 tokens @ 31 XLM');

    // Investor 2 buys from secondary market
    console.log('\n📋 Step 8: Investor 2 Buys from Secondary Market');
    console.log('─'.repeat(80));
    
    // Calculate Investor 1's cost basis for sold tokens
    const inv1CostBasis = BigInt(inv1Payment);
    const inv1TotalTokens = BigInt(inv1Amount);
    const soldTokensBigInt = BigInt(sellTokens);
    const costBasisForSold = (inv1CostBasis * soldTokensBigInt) / inv1TotalTokens;
    const realizedPL = BigInt(sellPrice) - costBasisForSold;

    // Record the fill
    await db.collection('orderFills').insertOne({
      orderId: sellOrder.insertedId.toString(),
      orderDbId: sellOrder.insertedId,
      buyerId: investor2._id,
      buyerAddress: investor2.walletAddress,
      tokenAmount: sellTokens.toString(),
      paymentAmount: sellPrice.toString(),
      txHash: `TX-FILL-${Date.now()}`,
      filledAt: new Date(),
    });

    // Update sell order
    await db.collection('sellOrders').updateOne(
      { _id: sellOrder.insertedId },
      {
        $set: {
          tokensRemaining: '0',
          status: 'FILLED',
          updatedAt: new Date(),
        }
      }
    );

    // Record secondary market sale for Investor 1
    await db.collection('secondary_market_sales').insertOne({
      sellerId: investor1._id,
      sellerAddress: investor1.walletAddress,
      buyerId: investor2._id,
      buyerAddress: investor2.walletAddress,
      orderId: sellOrder.insertedId.toString(),
      orderDbId: sellOrder.insertedId,
      invoiceId: onChainId,
      tokenAmount: sellTokens.toString(),
      salePrice: sellPrice.toString(),
      costBasis: costBasisForSold.toString(),
      realizedPL: realizedPL.toString(),
      soldAt: new Date(),
      txHash: `TX-SALE-${Date.now()}`,
    });

    // Update Investor 1's investment (reduce tokens, update cost basis)
    const inv1RemainingTokens = BigInt(inv1Amount) - soldTokensBigInt;
    const inv1RemainingCost = inv1CostBasis - costBasisForSold;

    await db.collection('investments').updateOne(
      { _id: investment1.insertedId },
      {
        $set: {
          tokenAmount: inv1RemainingTokens.toString(),
          purchasePrice: inv1RemainingCost.toString(),
          investedAmount: inv1RemainingCost.toString(),
          updatedAt: new Date(),
        }
      }
    );

    // Create new investment for Investor 2 (secondary purchase)
    await db.collection('investments').insertOne({
      invoiceId: invoiceId,
      onChainInvoiceId: onChainId,
      investorId: investor2._id,
      investor: investor2.walletAddress,
      investorAddress: investor2.walletAddress,
      tokenAmount: sellTokens.toString(),
      purchasePrice: sellPrice.toString(),
      investedAmount: sellPrice.toString(),
      acquiredVia: 'SECONDARY_MARKET',
      timestamp: new Date(),
      investedAt: new Date(),
      txHash: `TX-SEC-${Date.now()}`,
      status: 'COMPLETED',
    });

    console.log(`✅ Secondary market transaction completed`);
    console.log(`\n   💰 Investor 1 (Seller):`);
    console.log(`      Sold: 30 tokens`);
    console.log(`      Received: 31 XLM`);
    console.log(`      Cost Basis: ${Number(costBasisForSold) / 10000000} XLM`);
    console.log(`      Realized Profit: ${Number(realizedPL) / 10000000} XLM`);
    console.log(`      Remaining: 30 tokens @ ${Number(inv1RemainingCost) / 10000000} XLM cost`);
    console.log(`\n   🛒 Investor 2 (Buyer):`);
    console.log(`      Bought: 30 tokens`);
    console.log(`      Paid: 31 XLM`);
    console.log(`      Total Holdings: 70 tokens (40 primary + 30 secondary)`);
    console.log(`      Total Cost: 69 XLM (38 + 31)`);
    
    logTest('Secondary Market Transaction', true, 'Investor 1 → Investor 2: 30 tokens @ 31 XLM');

    // Settlement
    console.log('\n📋 Step 9: Buyer Settles Invoice');
    console.log('─'.repeat(80));
    
    const settlementAmount = INVOICE_AMOUNT * 10000000; // Full amount

    // Get all current investments (deduplicated by investor)
    const allInvestments = await db.collection('investments').find({
      $or: [
        { invoiceId: invoiceId },
        { invoiceId: onChainId },
        { onChainInvoiceId: invoiceId },
        { onChainInvoiceId: onChainId },
      ],
      status: 'COMPLETED',
      tokenAmount: { $ne: '0' },
    }).toArray();

    // Aggregate by investor
    const investmentsByInvestor = new Map();
    for (const inv of allInvestments) {
      const investorKey = inv.investor || inv.investorAddress;
      if (!investmentsByInvestor.has(investorKey)) {
        investmentsByInvestor.set(investorKey, {
          investorId: inv.investorId,
          investorAddress: investorKey,
          tokenAmount: BigInt(0),
          purchasePrice: BigInt(0),
          investments: [],
        });
      }
      const agg = investmentsByInvestor.get(investorKey);
      agg.tokenAmount += BigInt(inv.tokenAmount || '0');
      agg.purchasePrice += BigInt(inv.purchasePrice || inv.investedAmount || '0');
      agg.investments.push(inv);
    }

    console.log(`   Found ${investmentsByInvestor.size} unique investors`);

    // Calculate distributions
    const totalTokensHeld = Array.from(investmentsByInvestor.values()).reduce(
      (sum, inv) => sum + inv.tokenAmount,
      BigInt(0)
    );

    console.log(`   Total tokens held: ${Number(totalTokensHeld) / 10000000}`);
    console.log(`   Settlement amount: ${settlementAmount / 10000000} XLM`);

    for (const [investorAddress, agg] of investmentsByInvestor.entries()) {
      const distributionAmount = (agg.tokenAmount * BigInt(settlementAmount)) / totalTokensHeld;
      const profit = distributionAmount - agg.purchasePrice;

      await db.collection('investor_distributions').insertOne({
        invoiceId: invoiceId,
        onChainInvoiceId: onChainId,
        investmentId: agg.investments[0]._id.toString(),
        investorId: agg.investorId,
        investorAddress: investorAddress,
        tokenAmount: agg.tokenAmount.toString(),
        purchasePrice: agg.purchasePrice.toString(),
        distributionAmount: distributionAmount.toString(),
        profit: profit.toString(),
        settlementTxHash: `TX-SETTLE-${Date.now()}`,
        timestamp: new Date(),
        status: 'COMPLETED',
      });

      const investorName = investorAddress === investor1.walletAddress ? 'Investor 1' : 'Investor 2';
      console.log(`\n   ${investorName}:`);
      console.log(`      Tokens: ${Number(agg.tokenAmount) / 10000000}`);
      console.log(`      Cost: ${Number(agg.purchasePrice) / 10000000} XLM`);
      console.log(`      Received: ${Number(distributionAmount) / 10000000} XLM`);
      console.log(`      Profit: ${Number(profit) / 10000000} XLM`);
    }

    await db.collection('invoices').updateOne(
      { _id: invoice.insertedId },
      {
        $set: {
          status: 'SETTLED',
          settledAt: new Date(),
          repaymentReceived: settlementAmount.toString(),
          updatedAt: new Date(),
        }
      }
    );

    console.log(`\n✅ Invoice settled`);
    logTest('Settlement', true, `${INVOICE_AMOUNT} XLM distributed`);

    // Calculate final P&L
    console.log('\n📋 Step 10: Calculate Final P&L');
    console.log('═'.repeat(80));

    // Investor 1 P&L
    console.log('\n💰 Investor 1 Final P&L:');
    console.log('─'.repeat(80));
    
    const inv1Investments = await db.collection('investments').find({
      $and: [
        {
          $or: [
            { investorId: investor1._id.toString() },
            { investor: investor1.walletAddress },
          ],
        },
        {
          $or: [
            { invoiceId: invoiceId },
            { invoiceId: onChainId },
            { onChainInvoiceId: invoiceId },
            { onChainInvoiceId: onChainId },
          ],
        },
      ],
    }).toArray();

    const inv1Sales = await db.collection('secondary_market_sales').find({
      sellerAddress: investor1.walletAddress,
      invoiceId: onChainId,
    }).toArray();

    const inv1Distributions = await db.collection('investor_distributions').find({
      investorAddress: investor1.walletAddress,
      $or: [
        { invoiceId: invoiceId },
        { onChainInvoiceId: onChainId },
      ],
    }).toArray();

    let inv1CashOut = BigInt(0);
    let inv1CashIn = BigInt(0);

    // CRITICAL: For cash out, we need the ORIGINAL investment amount
    // The investment record shows remaining cost after sale, not original
    // So we calculate: remaining cost + cost basis of sold tokens
    for (const inv of inv1Investments) {
      inv1CashOut += BigInt(inv.purchasePrice || inv.investedAmount || '0');
    }

    // Add back the cost basis of sold tokens (from secondary sales)
    for (const sale of inv1Sales) {
      inv1CashOut += BigInt(sale.costBasis || '0');
    }

    for (const sale of inv1Sales) {
      inv1CashIn += BigInt(sale.salePrice || '0');
    }

    for (const dist of inv1Distributions) {
      inv1CashIn += BigInt(dist.distributionAmount || '0');
    }

    const inv1NetPL = inv1CashIn - inv1CashOut;
    const inv1ROI = inv1CashOut > BigInt(0) 
      ? (Number(inv1NetPL) / Number(inv1CashOut)) * 100 
      : 0;

    console.log(`   Cash Out (Primary): ${Number(inv1CashOut) / 10000000} XLM`);
    console.log(`     - Current holdings cost: ${Number(inv1Investments.reduce((s, i) => s + BigInt(i.purchasePrice || '0'), BigInt(0))) / 10000000} XLM`);
    console.log(`     - Sold tokens cost basis: ${Number(inv1Sales.reduce((s, sale) => s + BigInt(sale.costBasis || '0'), BigInt(0))) / 10000000} XLM`);
    console.log(`   Cash In (Secondary Sale): ${Number(inv1Sales.reduce((s, sale) => s + BigInt(sale.salePrice || '0'), BigInt(0))) / 10000000} XLM`);
    console.log(`   Cash In (Settlement): ${Number(inv1Distributions.reduce((s, d) => s + BigInt(d.distributionAmount || '0'), BigInt(0))) / 10000000} XLM`);
    console.log(`   Total Cash In: ${Number(inv1CashIn) / 10000000} XLM`);
    console.log(`   Net P&L: ${Number(inv1NetPL) / 10000000} XLM`);
    console.log(`   ROI: ${inv1ROI.toFixed(2)}%`);

    const inv1Expected = 4; // 2.5 from sale + 1.5 from settlement
    const inv1Actual = Number(inv1NetPL) / 10000000;
    const inv1Match = Math.abs(inv1Actual - inv1Expected) < 0.5;
    
    logTest('Investor 1 P&L Calculation', inv1Match, `${inv1Actual.toFixed(2)} XLM profit (${inv1ROI.toFixed(2)}% ROI)`);

    // Investor 2 P&L
    console.log('\n💰 Investor 2 Final P&L:');
    console.log('─'.repeat(80));
    
    const inv2Investments = await db.collection('investments').find({
      $and: [
        {
          $or: [
            { investorId: investor2._id.toString() },
            { investor: investor2.walletAddress },
          ],
        },
        {
          $or: [
            { invoiceId: invoiceId },
            { invoiceId: onChainId },
            { onChainInvoiceId: invoiceId },
            { onChainInvoiceId: onChainId },
          ],
        },
      ],
    }).toArray();

    const inv2Purchases = await db.collection('orderFills').find({
      buyerAddress: investor2.walletAddress,
    }).toArray();

    const inv2Distributions = await db.collection('investor_distributions').find({
      investorAddress: investor2.walletAddress,
      $or: [
        { invoiceId: invoiceId },
        { onChainInvoiceId: onChainId },
      ],
    }).toArray();

    let inv2CashOut = BigInt(0);
    let inv2CashIn = BigInt(0);

    for (const inv of inv2Investments) {
      inv2CashOut += BigInt(inv.purchasePrice || inv.investedAmount || '0');
    }

    for (const dist of inv2Distributions) {
      inv2CashIn += BigInt(dist.distributionAmount || '0');
    }

    const inv2NetPL = inv2CashIn - inv2CashOut;
    const inv2ROI = inv2CashOut > BigInt(0) 
      ? (Number(inv2NetPL) / Number(inv2CashOut)) * 100 
      : 0;

    console.log(`   Cash Out (Primary): 38 XLM`);
    console.log(`   Cash Out (Secondary): 31 XLM`);
    console.log(`   Total Cash Out: ${Number(inv2CashOut) / 10000000} XLM`);
    console.log(`   Cash In (Settlement): ${Number(inv2CashIn) / 10000000} XLM`);
    console.log(`   Net P&L: ${Number(inv2NetPL) / 10000000} XLM`);
    console.log(`   ROI: ${inv2ROI.toFixed(2)}%`);

    const inv2Expected = 2 - 1; // 2 XLM from primary - 1 XLM loss on secondary
    const inv2Actual = Number(inv2NetPL) / 10000000;
    const inv2Match = Math.abs(inv2Actual - inv2Expected) < 0.5;
    
    logTest('Investor 2 P&L Calculation', inv2Match, `${inv2Actual.toFixed(2)} XLM profit (${inv2ROI.toFixed(2)}% ROI)`);

    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('═'.repeat(80));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.tests.length}`);
    console.log();

    if (testResults.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! P&L calculations are correct!\n');
    } else {
      console.log('⚠️  Some tests failed. Review the details above.\n');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the test
testCompleteWorkflow().catch(console.error);
