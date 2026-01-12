import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://harshdb:harsh9142@cluster0.5otc0jk.mongodb.net/sangini?retryWrites=true&w=majority';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const users = await db.collection('users').find({}).toArray();
  
  console.log('=== Registered Users ===\n');
  
  if (users.length === 0) {
    console.log('No users found in database.');
  } else {
    users.forEach(u => {
      console.log('Email:', u.email);
      console.log('Name:', u.name);
      console.log('Type:', u.userType);
      console.log('Custodial Wallet:', u.custodialPubKey || 'N/A (not a buyer)');
      console.log('Wallet Funded:', u.walletFunded || false);
      console.log('KYC Status:', u.kycStatus || 'N/A');
      console.log('Created:', u.createdAt);
      console.log('---');
    });
  }
  
  console.log(`\nTotal users: ${users.length}`);
  
  await client.close();
}

main().catch(console.error);
