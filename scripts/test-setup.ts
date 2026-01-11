// Test Setup Script - Generate and fund test wallets
// Run with: npx ts-node scripts/test-setup.ts

import { Keypair } from '@stellar/stellar-sdk';

async function main() {
  console.log('🔧 Sangini Test Setup\n');

  // Generate Relayer Wallet
  const relayer = Keypair.random();
  console.log('📦 RELAYER WALLET (add to .env.local):');
  console.log(`RELAYER_SECRET_KEY=${relayer.secret()}`);
  console.log(`RELAYER_PUBLIC_KEY=${relayer.publicKey()}`);
  console.log('');

  // Fund via Friendbot
  console.log('💰 Funding relayer via Friendbot...');
  try {
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${relayer.publicKey()}`
    );
    if (response.ok) {
      console.log('✅ Relayer funded with 10,000 XLM (testnet)');
    } else {
      console.log('⚠️ Friendbot request failed. Fund manually at:');
      console.log(`   https://laboratory.stellar.org/#account-creator?network=test`);
    }
  } catch (error) {
    console.log('⚠️ Could not reach Friendbot. Fund manually.');
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Copy the RELAYER keys above to .env.local');
  console.log('2. Start MongoDB (or use Atlas connection string)');
  console.log('3. Run: npm run dev');
  console.log('4. Run: npx ts-node scripts/test-e2e.ts');
}

main().catch(console.error);
