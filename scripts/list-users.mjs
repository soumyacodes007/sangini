#!/usr/bin/env node

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sangini';

async function listUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();

    const users = await db.collection('users').find({}).toArray();

    console.log(`Found ${users.length} users:\n`);

    for (const user of users) {
      console.log(`${user.userType}: ${user.email || user.walletAddress}`);
      console.log(`  ID: ${user._id.toString()}`);
      console.log(`  Wallet: ${user.walletAddress || 'N/A'}`);
      console.log();
    }

  } finally {
    await client.close();
  }
}

listUsers().catch(console.error);
