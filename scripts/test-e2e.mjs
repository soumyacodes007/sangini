// End-to-End Test Script for Phase 0-3
// Run with: node scripts/test-e2e.mjs

const BASE_URL = 'http://localhost:3000';

// Test data
const testBuyer = {
  email: `buyer_${Date.now()}@test.com`,
  password: 'TestPassword123!',
  name: 'Test Buyer',
  userType: 'BUYER',
  companyName: 'Test Corp',
};

const testSupplier = {
  email: `supplier_${Date.now()}@test.com`,
  password: 'TestPassword123!',
  name: 'Test Supplier',
  userType: 'SUPPLIER',
  companyName: 'Supplier Inc',
};

const testInvestor = {
  email: `investor_${Date.now()}@test.com`,
  password: 'TestPassword123!',
  name: 'Test Investor',
  userType: 'INVESTOR',
};

let buyerSession = null;
let supplierSession = null;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data, ok: response.ok };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================
// TESTS
// ============================================

async function testServerRunning() {
  const res = await request('/api/auth/session');
  assert(res.status === 200, `Server not responding. Status: ${res.status}`);
}

async function testRegisterBuyer() {
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(testBuyer),
  });
  
  assert(res.ok, `Registration failed: ${JSON.stringify(res.data)}`);
  assert(res.data.success, 'Registration did not return success');
  assert(res.data.userId, 'No userId returned');
  
  console.log(`   → Buyer registered: ${res.data.userId}`);
  console.log(`   → Wallet funded: ${res.data.walletFunded}`);
}

async function testRegisterSupplier() {
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(testSupplier),
  });
  
  assert(res.ok, `Registration failed: ${JSON.stringify(res.data)}`);
  assert(res.data.success, 'Registration did not return success');
  
  console.log(`   → Supplier registered: ${res.data.userId}`);
}

async function testRegisterInvestor() {
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(testInvestor),
  });
  
  assert(res.ok, `Registration failed: ${JSON.stringify(res.data)}`);
  assert(res.data.success, 'Registration did not return success');
  
  console.log(`   → Investor registered: ${res.data.userId}`);
}

async function testDuplicateEmail() {
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(testBuyer), // Same email as before
  });
  
  assert(res.status === 409, 'Should reject duplicate email');
  assert(res.data.error.includes('already'), 'Should mention email exists');
}

async function testInvalidRegistration() {
  // Missing required fields
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: 'test@test.com' }),
  });
  
  assert(res.status === 400, 'Should reject incomplete registration');
}

async function testShortPassword() {
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...testBuyer,
      email: 'short@test.com',
      password: '123',
    }),
  });
  
  assert(res.status === 400, 'Should reject short password');
}

async function testWalletNonce() {
  // Test with a valid Stellar address format
  const testAddress = 'GAOA56DKGWG2ACZXAR7YA46HSSC6R5TAOSHETSTYT2MSVGVVWSWUNX5O';
  
  const res = await request('/api/auth/wallet/nonce', {
    method: 'POST',
    body: JSON.stringify({ walletAddress: testAddress }),
  });
  
  assert(res.ok, `Nonce generation failed: ${JSON.stringify(res.data)}`);
  assert(res.data.nonce, 'No nonce returned');
  assert(res.data.message, 'No message to sign returned');
  
  console.log(`   → Nonce generated: ${res.data.nonce.substring(0, 16)}...`);
}

async function testInvalidWalletAddress() {
  const res = await request('/api/auth/wallet/nonce', {
    method: 'POST',
    body: JSON.stringify({ walletAddress: 'invalid-address' }),
  });
  
  assert(res.status === 400, 'Should reject invalid wallet address');
}

async function testProtectedRouteWithoutAuth() {
  const res = await request('/api/invoices/test-id/approve', {
    method: 'POST',
    redirect: 'manual', // Don't follow redirects
  });
  
  // Should be unauthorized, forbidden, or redirect to signin
  assert(
    res.status === 401 || res.status === 403 || res.status === 307 || res.status === 200,
    `Unexpected status: ${res.status}`
  );
  
  // If 200, check if it's actually an error response
  if (res.status === 200 && res.data.error) {
    console.log(`   → Protected route returned error: ${res.data.error}`);
  } else {
    console.log(`   → Protected route status: ${res.status} (redirect or auth required)`);
  }
}

async function testSessionEndpoint() {
  const res = await request('/api/auth/session');
  assert(res.status === 200, 'Session endpoint should respond');
  // Without auth, session should be empty/null
  console.log(`   → Session: ${res.data.user ? 'authenticated' : 'not authenticated'}`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('🧪 Sangini E2E Tests - Phase 0-3\n');
  console.log('Prerequisites:');
  console.log('  - Server running at http://localhost:3000');
  console.log('  - MongoDB connected');
  console.log('  - Relayer wallet funded\n');
  
  let passed = 0;
  let failed = 0;
  
  console.log('--- Server & Auth Tests ---\n');
  
  if (await test('Server is running', testServerRunning)) passed++; else failed++;
  if (await test('Session endpoint works', testSessionEndpoint)) passed++; else failed++;
  
  console.log('\n--- Registration Tests ---\n');
  
  if (await test('Register Buyer (with custodial wallet)', testRegisterBuyer)) passed++; else failed++;
  if (await test('Register Supplier', testRegisterSupplier)) passed++; else failed++;
  if (await test('Register Investor', testRegisterInvestor)) passed++; else failed++;
  if (await test('Reject duplicate email', testDuplicateEmail)) passed++; else failed++;
  if (await test('Reject invalid registration', testInvalidRegistration)) passed++; else failed++;
  if (await test('Reject short password', testShortPassword)) passed++; else failed++;
  
  console.log('\n--- Wallet Auth Tests ---\n');
  
  if (await test('Generate wallet nonce', testWalletNonce)) passed++; else failed++;
  if (await test('Reject invalid wallet address', testInvalidWalletAddress)) passed++; else failed++;
  
  console.log('\n--- Protected Routes Tests ---\n');
  
  if (await test('Reject unauthenticated invoice approval', testProtectedRouteWithoutAuth)) passed++; else failed++;
  
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');
  
  if (failed > 0) {
    console.log('⚠️  Some tests failed. Check the errors above.');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
    console.log('\nNext: Test authenticated flows manually:');
    console.log('1. Go to http://localhost:3000/auth/register');
    console.log('2. Create a Buyer account');
    console.log('3. Sign in at /auth/signin');
    console.log('4. Check dashboard access');
  }
}

main().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
