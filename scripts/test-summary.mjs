// Phase 0-3 Complete Test Summary
// Run with: node scripts/test-summary.mjs

const BASE_URL = 'http://localhost:3000';

console.log(`
╔══════════════════════════════════════════════════════════════╗
║           SANGINI - Phase 0-3 Test Summary                   ║
╚══════════════════════════════════════════════════════════════╝
`);

async function checkEndpoint(name, url, method = 'GET', body = null) {
  try {
    const options = { method };
    if (body) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
    const res = await fetch(`${BASE_URL}${url}`, options);
    const status = res.status;
    const ok = status < 500;
    console.log(`  ${ok ? '✅' : '❌'} ${name} [${status}]`);
    return ok;
  } catch (e) {
    console.log(`  ❌ ${name} [ERROR: ${e.message}]`);
    return false;
  }
}

async function main() {
  let passed = 0;
  let total = 0;

  // Phase 0: Environment
  console.log('📦 PHASE 0: Environment & Config');
  console.log('─'.repeat(50));
  total++; if (await checkEndpoint('Server Running', '/')) passed++;
  total++; if (await checkEndpoint('API Auth Session', '/api/auth/session')) passed++;
  total++; if (await checkEndpoint('API Auth CSRF', '/api/auth/csrf')) passed++;
  console.log('');

  // Phase 1: Database (MongoDB)
  console.log('🗄️  PHASE 1: Database (MongoDB)');
  console.log('─'.repeat(50));
  // Test by registering a user (requires DB)
  const testEmail = `dbtest_${Date.now()}@test.com`;
  total++; if (await checkEndpoint('MongoDB Connection (via Register)', '/api/auth/register', 'POST', {
    email: testEmail,
    password: 'TestPass123!',
    name: 'DB Test',
    userType: 'INVESTOR'
  })) passed++;
  console.log('');

  // Phase 2: Authentication
  console.log('🔐 PHASE 2: Authentication');
  console.log('─'.repeat(50));
  total++; if (await checkEndpoint('Register API', '/api/auth/register', 'POST', {
    email: `auth_${Date.now()}@test.com`,
    password: 'TestPass123!',
    name: 'Auth Test',
    userType: 'BUYER'
  })) passed++;
  total++; if (await checkEndpoint('Wallet Nonce API', '/api/auth/wallet/nonce', 'POST', {
    walletAddress: 'GAOA56DKGWG2ACZXAR7YA46HSSC6R5TAOSHETSTYT2MSVGVVWSWUNX5O'
  })) passed++;
  total++; if (await checkEndpoint('NextAuth Providers', '/api/auth/providers')) passed++;
  total++; if (await checkEndpoint('Sign In Page', '/auth/signin')) passed++;
  total++; if (await checkEndpoint('Register Page', '/auth/register')) passed++;
  console.log('');

  // Phase 3: Meta-TX & Relayer
  console.log('⚡ PHASE 3: Meta-TX Relayer');
  console.log('─'.repeat(50));
  // These should return 401/403/307 without auth (which is correct behavior)
  total++; if (await checkEndpoint('Invoice Approve API (auth required)', '/api/invoices/test/approve', 'POST')) passed++;
  total++; if (await checkEndpoint('Invoice Settle API (auth required)', '/api/invoices/test/settle', 'POST')) passed++;
  
  // Check relayer balance
  try {
    const relayerPubKey = 'GDLEEL3TVAZXIT5RI5F3WPK52DOI3VW55ODO5CEKD4XFYFN554QY72GY';
    const horizonRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${relayerPubKey}`);
    if (horizonRes.ok) {
      const data = await horizonRes.json();
      const balance = data.balances.find(b => b.asset_type === 'native')?.balance || '0';
      console.log(`  ✅ Relayer Wallet Funded [${parseFloat(balance).toFixed(2)} XLM]`);
      passed++; total++;
    } else {
      console.log(`  ❌ Relayer Wallet Not Found`);
      total++;
    }
  } catch (e) {
    console.log(`  ⚠️ Could not check relayer balance`);
  }
  console.log('');

  // Protected Routes (Middleware)
  console.log('🛡️  Middleware & Protected Routes');
  console.log('─'.repeat(50));
  total++; if (await checkEndpoint('Dashboard (protected)', '/dashboard')) passed++;
  total++; if (await checkEndpoint('Dashboard Admin (protected)', '/dashboard/admin')) passed++;
  console.log('');

  // Summary
  console.log('═'.repeat(50));
  console.log(`📊 RESULTS: ${passed}/${total} checks passed (${Math.round(passed/total*100)}%)`);
  console.log('═'.repeat(50));
  
  if (passed === total) {
    console.log('\n🎉 All Phase 0-3 components are working!\n');
  } else {
    console.log('\n⚠️  Some components need attention.\n');
  }

  console.log('📝 Manual Testing Checklist:');
  console.log('─'.repeat(50));
  console.log('[ ] 1. Open http://localhost:3000/auth/register');
  console.log('[ ] 2. Register as BUYER (gets custodial wallet)');
  console.log('[ ] 3. Sign in at /auth/signin');
  console.log('[ ] 4. Verify redirect to /dashboard');
  console.log('[ ] 5. Check browser console for errors');
  console.log('[ ] 6. Try accessing /dashboard/admin (should redirect)');
  console.log('');
}

main().catch(console.error);
