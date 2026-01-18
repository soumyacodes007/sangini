#!/usr/bin/env node

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sangini';

async function debugInvestments() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();

    const invoiceId = 'INV-TEST-1768693920848';
    
    console.log(`Checking investments for ${invoiceId}\n`);

    const investments = await db.collection('investments').find({
      $or: [
        { invoiceId: { $regex: invoiceId } },
        { onChainInvoiceId: invoiceId },
      ]
    }).toArray();

    console.log(`Found ${investments.length} investment records:\n`);

    for (const inv of investments) {
      console.log(`ID: ${inv._id.toString()}`);
      console.log(`  Investor: ${inv.investor || inv.investorAddress}`);
      console.log(`  Tokens: ${(parseInt(inv.tokenAmount || '0') / 10000000).toFixed(2)}`);
      console.log(`  Purchase Price: ${(parseInt(inv.purchasePrice || inv.investedAmount || '0') / 10000000).toFixed(2)} XLM`);
      console.log(`  Status: ${inv.status || 'N/A'}`);
      console.log(`  Via: ${inv.acquiredVia || 'PRIMARY_MARKET'}`);
      console.log();
    }

  } finally {
    await client.close();
  }
}

debugInvestments().catch(console.error);
