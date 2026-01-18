#!/usr/bin/env node

/**
 * Analyze Settlement Issues
 * Check why settlements are less than expected
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sangini';

async function analyzeSettlements() {
  console.log('🔍 Analyzing Settlement Issues\n');

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();

    // Get all settled invoices
    const invoices = await db.collection('invoices').find({
      status: 'SETTLED'
    }).toArray();

    console.log(`Found ${invoices.length} settled invoices\n`);

    for (const invoice of invoices) {
      console.log('═'.repeat(80));
      console.log(`📄 Invoice: ${invoice.invoiceId || invoice._id.toString()}`);
      console.log('═'.repeat(80));
      console.log(`  Original Amount:     ${(parseInt(invoice.amount || '0') / 10000000).toFixed(2)} XLM`);
      console.log(`  Total Tokens:        ${(parseInt(invoice.totalTokens || invoice.amount || '0') / 10000000).toFixed(2)}`);
      console.log(`  Tokens Sold:         ${(parseInt(invoice.tokensSold || '0') / 10000000).toFixed(2)}`);
      console.log(`  Amount Raised:       ${(parseInt(invoice.amountRaised || '0') / 10000000).toFixed(2)} XLM`);
      console.log(`  Repayment Received:  ${(parseInt(invoice.repaymentReceived || '0') / 10000000).toFixed(2)} XLM`);
      console.log(`  Status:              ${invoice.status}`);
      console.log(`  Due Date:            ${invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : 'Unknown'}`);
      console.log(`  Settled At:          ${invoice.settledAt ? new Date(invoice.settledAt).toISOString().split('T')[0] : 'Unknown'}`);
      console.log();

      // Get distributions for this invoice
      const distributions = await db.collection('investor_distributions').find({
        $or: [
          { invoiceId: invoice._id.toString() },
          { onChainInvoiceId: invoice.invoiceId },
          { onChainInvoiceId: invoice.onChainId },
        ]
      }).toArray();

      console.log(`  👥 Distributions: ${distributions.length}`);
      console.log('  ─'.repeat(40));

      let totalDistributed = BigInt(0);
      let totalTokensDistributed = BigInt(0);
      let totalCostBasis = BigInt(0);

      for (const dist of distributions) {
        const distAmount = BigInt(dist.distributionAmount || '0');
        const tokens = BigInt(dist.tokenAmount || '0');
        const cost = BigInt(dist.purchasePrice || '0');
        const profit = distAmount - cost;

        totalDistributed += distAmount;
        totalTokensDistributed += tokens;
        totalCostBasis += cost;

        console.log(`     Investor: ${dist.investorAddress?.slice(0, 12)}...`);
        console.log(`     Tokens:   ${(Number(tokens) / 10000000).toFixed(2)}`);
        console.log(`     Cost:     ${(Number(cost) / 10000000).toFixed(2)} XLM`);
        console.log(`     Received: ${(Number(distAmount) / 10000000).toFixed(2)} XLM`);
        console.log(`     Profit:   ${(Number(profit) / 10000000).toFixed(2)} XLM`);
        console.log();
      }

      console.log('  📊 Distribution Summary:');
      console.log(`     Total Distributed:  ${(Number(totalDistributed) / 10000000).toFixed(2)} XLM`);
      console.log(`     Total Tokens:       ${(Number(totalTokensDistributed) / 10000000).toFixed(2)}`);
      console.log(`     Total Cost Basis:   ${(Number(totalCostBasis) / 10000000).toFixed(2)} XLM`);
      console.log(`     Total Profit/Loss:  ${(Number(totalDistributed - totalCostBasis) / 10000000).toFixed(2)} XLM`);
      console.log();

      // Calculate per-token value
      const repayment = BigInt(invoice.repaymentReceived || invoice.amount || '0');
      const totalTokens = BigInt(invoice.totalTokens || invoice.amount || '0');
      const perTokenValue = totalTokens > BigInt(0) 
        ? Number(repayment) / Number(totalTokens)
        : 1.0;

      console.log('  💰 Settlement Analysis:');
      console.log(`     Repayment Amount:   ${(Number(repayment) / 10000000).toFixed(2)} XLM`);
      console.log(`     Total Tokens:       ${(Number(totalTokens) / 10000000).toFixed(2)}`);
      console.log(`     Per Token Value:    ${perTokenValue.toFixed(6)} (${(perTokenValue * 100).toFixed(2)}% of face value)`);
      
      if (perTokenValue < 1.0) {
        const shortfall = 1.0 - perTokenValue;
        console.log(`     ⚠️  SHORTFALL:       ${(shortfall * 100).toFixed(2)}% loss per token`);
        console.log(`     Reason:             ${perTokenValue < 0.6 ? 'Likely DEFAULT with insurance' : 'Penalties or early settlement'}`);
      } else if (perTokenValue > 1.0) {
        const premium = perTokenValue - 1.0;
        console.log(`     ✅ PREMIUM:          ${(premium * 100).toFixed(2)}% gain per token`);
        console.log(`     Reason:             Interest or late payment penalties`);
      } else {
        console.log(`     ✅ EXACT:            Settled at face value`);
      }

      console.log();
    }

    console.log('✅ Analysis Complete!\n');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the analysis
analyzeSettlements().catch(console.error);
