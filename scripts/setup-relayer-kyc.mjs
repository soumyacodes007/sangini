#!/usr/bin/env node
/**
 * Setup Relayer KYC Permissions
 * 
 * This script sets up the relayer account to be able to set KYC status on-chain.
 * It needs to be run by the contract admin.
 * 
 * Usage:
 *   node scripts/setup-relayer-kyc.mjs
 * 
 * Prerequisites:
 *   - Stellar CLI installed
 *   - Admin identity configured in Stellar CLI
 *   - Contract deployed and initialized
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const CONTRACT_ID = process.env.NEXT_PUBLIC_INVOICE_CONTRACT;
const RELAYER_PUBLIC_KEY = process.env.RELAYER_PUBLIC_KEY;

if (!CONTRACT_ID) {
  console.error('❌ NEXT_PUBLIC_INVOICE_CONTRACT not set in .env.local');
  process.exit(1);
}

if (!RELAYER_PUBLIC_KEY) {
  console.error('❌ RELAYER_PUBLIC_KEY not set in .env.local');
  process.exit(1);
}

console.log('🔧 Setting up relayer KYC permissions...');
console.log(`   Contract: ${CONTRACT_ID}`);
console.log(`   Relayer:  ${RELAYER_PUBLIC_KEY}`);
console.log('');

// First, let's try to set the relayer as authorized
// This requires the admin identity to be configured in Stellar CLI
const adminIdentity = process.argv[2] || 'admin';

console.log(`📝 Using admin identity: ${adminIdentity}`);
console.log('');

try {
  // Get admin address
  const adminAddress = execSync(`stellar keys address ${adminIdentity}`, { encoding: 'utf-8' }).trim();
  console.log(`   Admin address: ${adminAddress}`);
  console.log('');

  // Set relayer as authorized
  console.log('🔐 Setting relayer as authorized...');
  const result = execSync(`stellar contract invoke \\
    --id ${CONTRACT_ID} \\
    --source ${adminIdentity} \\
    --network testnet \\
    -- \\
    set_relayer \\
    --admin ${adminAddress} \\
    --relayer ${RELAYER_PUBLIC_KEY} \\
    --authorized true`, { encoding: 'utf-8', stdio: 'pipe' });
  
  console.log('✅ Relayer authorized successfully!');
  console.log(result);
} catch (error) {
  console.error('❌ Failed to set relayer as authorized');
  console.error('');
  console.error('This could be because:');
  console.error('1. The admin identity is not configured in Stellar CLI');
  console.error('2. The admin identity does not match the contract admin');
  console.error('3. The contract was initialized with a different admin');
  console.error('');
  console.error('To fix this:');
  console.error('1. Find out who the contract admin is');
  console.error('2. Configure their secret key in Stellar CLI:');
  console.error('   stellar keys add admin --secret-key <ADMIN_SECRET_KEY>');
  console.error('3. Run this script again');
  console.error('');
  console.error('Alternatively, update RELAYER_SECRET_KEY in .env.local to use the admin\'s secret key');
  console.error('');
  if (error.stderr) {
    console.error('Error details:', error.stderr.toString());
  }
  process.exit(1);
}

// Now let's test setting KYC for a test investor
console.log('');
console.log('🧪 Testing KYC setting...');

const testInvestor = 'GDVWTEBXRQKHFT4W73RRXOHYGPZ7WB4TLBD5P2QEBG4YEBMCGHD7ACSM';

try {
  const adminAddress = execSync(`stellar keys address ${adminIdentity}`, { encoding: 'utf-8' }).trim();
  
  const kycResult = execSync(`stellar contract invoke \\
    --id ${CONTRACT_ID} \\
    --source ${adminIdentity} \\
    --network testnet \\
    -- \\
    set_investor_kyc \\
    --admin ${adminAddress} \\
    --investor ${testInvestor} \\
    --approved true`, { encoding: 'utf-8', stdio: 'pipe' });
  
  console.log(`✅ KYC set for test investor: ${testInvestor}`);
  console.log(kycResult);
} catch (error) {
  console.error('❌ Failed to set KYC for test investor');
  if (error.stderr) {
    console.error('Error details:', error.stderr.toString());
  }
}

console.log('');
console.log('🎉 Setup complete!');
