#!/usr/bin/env node

/**
 * Check for Duplicate Investments
 * Find investments that might be counted multiple times
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sangini';

async function checkDuplicates() {
  console.log('🔍 Checking for Duplicate Investments\n');

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();

    // Check INV-1012 specifically
    const invoiceId = 'INV-1012';
    
    const invoice = await db.collection('invoices').findOne({
      $or: [
        { invoiceId },
        { onChainId: invoiceId },
      ]
    });

    if (!invoice) {
      console.log('Invoice not found');
      return;
    }

    console.log(`📄 Invoice: ${invoiceId}`);
    console.log(`   DB ID: ${invoice._id.toString()}`);
    console.log(`   On-Chain ID: ${invoice.onChainId || 'N/A'}`);
    console.log(`   Total Tokens: ${(parseInt(invoice.totalTokens || '0') / 10000000).toFixed(2)}`);
    console.log();

    const invoiceIdStr = invoice._id.toString();
    const onChainId = invoice.onChainId || invoice.invoiceId;

    // Query exactly like settlement code does
    const investments = await db.collection('investments').find({
      $and: [
        {
          $or: [
            { invoiceId: invoiceIdStr },
            { invoiceId: onChainId },
            { onChainInvoiceId: invoiceIdStr },
            { onChainInvoiceId: onChainId },
          ],
        },
        {
          $or: [
            { status: 'COMPLETED' },
            { status: { $exists: false } },
          ],
        },
        {
          tokenAmount: { $ne: '0' },
        },
      ],
    }).toArray();

    console.log(`Found ${investments.length} investments\n`);

    // Group by investor to find duplicates
    const byInvestor = new Map();

    for (const inv of investments) {
      const investor = inv.investor || inv.investorAddress;
      if (!byInvestor.has(investor)) {
        byInvestor.set(investor, []);
      }
      byInvestor.get(investor).push(inv);
    }

    console.log('📊 Investments by Investor:');
    console.log('═'.repeat(80));

    let totalTokens = BigInt(0);

    for (const [investor, invs] of byInvestor.entries()) {
      console.log(`\n👤 ${investor?.slice(0, 12)}...`);
      console.log(`   Count: ${invs.length} investment records`);
      
      let investorTotal = BigInt(0);
      
      for (const inv of invs) {
        const tokens = BigInt(inv.tokenAmount || '0');
        const cost = BigInt(inv.purchasePrice || inv.investedAmount || '0');
        investorTotal += tokens;
        totalTokens += tokens;

        console.log(`   - ID: ${inv._id.toString()}`);
        console.log(`     invoiceId: ${inv.invoiceId}`);
        console.log(`     onChainInvoiceId: ${inv.onChainInvoiceId || 'N/A'}`);
        console.log(`     Tokens: ${(Number(tokens) / 10000000).toFixed(2)}`);
        console.log(`     Cost: ${(Number(cost) / 10000000).toFixed(2)} XLM`);
        console.log(`     Status: ${inv.status || 'N/A'}`);
        console.log(`     Via: ${inv.acquiredVia || 'PRIMARY_MARKET'}`);
      }

      console.log(`   Total Tokens: ${(Number(investorTotal) / 10000000).toFixed(2)}`);
      
      if (invs.length > 1) {
        console.log(`   ⚠️  MULTIPLE RECORDS - Check for duplicates!`);
      }
    }

    console.log('\n═'.repeat(80));
    console.log(`📊 TOTAL TOKENS FOUND: ${(Number(totalTokens) / 10000000).toFixed(2)}`);
    console.log(`📊 INVOICE TOTAL TOKENS: ${(parseInt(invoice.totalTokens || '0') / 10000000).toFixed(2)}`);
    
    if (totalTokens > BigInt(invoice.totalTokens || '0')) {
      const excess = totalTokens - BigInt(invoice.totalTokens || '0');
      console.log(`⚠️  EXCESS TOKENS: ${(Number(excess) / 10000000).toFixed(2)} (${((Number(excess) / Number(totalTokens)) * 100).toFixed(1)}%)`);
      console.log(`❌ This causes investors to receive less than they should!`);
    } else if (totalTokens < BigInt(invoice.totalTokens || '0')) {
      const shortfall = BigInt(invoice.totalTokens || '0') - totalTokens;
      console.log(`⚠️  MISSING TOKENS: ${(Number(shortfall) / 10000000).toFixed(2)}`);
    } else {
      console.log(`✅ Token count matches!`);
    }

    console.log('\n✅ Check Complete!\n');

  } catch (error) {
    console.error('❌ Check failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the check
checkDuplicates().catch(console.error);
