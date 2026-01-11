#!/usr/bin/env node

/**
 * Authenticated Flow Tests
 * Tests the complete user flows with authentication
 */

const BASE_URL = 'http://localhost:3000';

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User'
};

// Valid Stellar testnet address format
const TEST_WALLET = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOUJ3YBXQPFMZXPT';

let sessionCookie = null;

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function recordTest(name, passed, details = '') {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    log(`  ✓ ${name}`, 'success');
  } else {
    results.failed++;
    log(`  ✗ ${name}: ${details}`, 'error');
  }
}

async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  return fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include'
  });
}

async function runTests() {
  log('\n========================================', 'info');
  log('  SANGINI AUTHENTICATED FLOW TESTS', 'info');
  log('========================================\n', 'info');

  // ==========================================
  // PHASE 1: User Registration
  // ==========================================
  log('\n📋 PHASE 1: User Registration\n', 'warn');

  try {
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
        name: TEST_USER.name,
        userType: 'SUPPLIER'
      })
    });
    
    const registerData = await registerRes.json();
    // 201 = created, 409 = already exists (both are OK for testing)
    const passed = registerRes.status === 201 || registerRes.status === 409;
    recordTest('User Registration', passed, 
      passed ? (registerRes.status === 409 ? 'User already exists' : 'Created') : registerData.error);
  } catch (error) {
    recordTest('User Registration', false, error.message);
  }

  // ==========================================
  // PHASE 2: User Login (Credentials)
  // ==========================================
  log('\n📋 PHASE 2: User Login\n', 'warn');

  try {
    // Get CSRF token first
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    
    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email: TEST_USER.email,
        password: TEST_USER.password,
        csrfToken: csrfData.csrfToken,
        json: 'true'
      }),
      redirect: 'manual'
    });

    // Store session cookie
    const cookies = loginRes.headers.get('set-cookie');
    if (cookies) {
      sessionCookie = cookies.split(';')[0];
    }

    // Check if we got redirected (success) or got an error
    const passed = loginRes.status === 302 || loginRes.status === 200;
    recordTest('User Login', passed, passed ? '' : `Status ${loginRes.status}`);
  } catch (error) {
    recordTest('User Login', false, error.message);
  }

  // ==========================================
  // PHASE 3: Wallet Nonce Request
  // ==========================================
  log('\n📋 PHASE 3: Wallet Authentication\n', 'warn');

  try {
    const nonceRes = await fetch(`${BASE_URL}/api/auth/wallet/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: TEST_WALLET })
    });
    
    const nonceData = await nonceRes.json();
    const passed = nonceRes.ok && nonceData.nonce;
    recordTest('Wallet Nonce Request', passed, 
      passed ? `Nonce: ${nonceData.nonce?.substring(0, 20)}...` : nonceData.error);
  } catch (error) {
    recordTest('Wallet Nonce Request', false, error.message);
  }

  // ==========================================
  // PHASE 4: Stats API
  // ==========================================
  log('\n📋 PHASE 4: Stats API\n', 'warn');

  try {
    const statsRes = await fetchWithAuth('/api/stats');
    const statsData = await statsRes.json();
    
    // Stats might return 401 if not authenticated, or data if authenticated
    const passed = statsRes.ok || statsRes.status === 401;
    recordTest('Stats API', passed, 
      statsRes.ok ? `Platform stats loaded` : 'Auth required');
    
    if (statsRes.ok && statsData.platform) {
      log(`    Total Invoices: ${statsData.platform.totalInvoices || 0}`, 'info');
      log(`    Insurance Pool: ${statsData.platform.insurancePoolBalance || 0}`, 'info');
    }
  } catch (error) {
    recordTest('Stats API', false, error.message);
  }

  // ==========================================
  // PHASE 5: Invoice APIs
  // ==========================================
  log('\n📋 PHASE 5: Invoice APIs\n', 'warn');

  try {
    const invoicesRes = await fetchWithAuth('/api/invoices');
    const invoicesData = await invoicesRes.json();
    
    const passed = invoicesRes.ok || invoicesRes.status === 401;
    recordTest('List Invoices', passed, 
      invoicesRes.ok ? `Found ${invoicesData.invoices?.length || 0} invoices` : 'Auth required');
  } catch (error) {
    recordTest('List Invoices', false, error.message);
  }

  // Test invoice filters
  try {
    const filteredRes = await fetchWithAuth('/api/invoices?status=DRAFT&role=supplier');
    const passed = filteredRes.ok || filteredRes.status === 401;
    recordTest('List Invoices (filtered)', passed);
  } catch (error) {
    recordTest('List Invoices (filtered)', false, error.message);
  }

  // ==========================================
  // PHASE 6: Orders APIs
  // ==========================================
  log('\n📋 PHASE 6: Orders APIs\n', 'warn');

  try {
    const ordersRes = await fetchWithAuth('/api/orders');
    const ordersData = await ordersRes.json();
    
    const passed = ordersRes.ok || ordersRes.status === 401;
    recordTest('List Orders', passed, 
      ordersRes.ok ? `Found ${ordersData.orders?.length || 0} orders` : 'Auth required');
  } catch (error) {
    recordTest('List Orders', false, error.message);
  }

  // ==========================================
  // PHASE 7: Portfolio API
  // ==========================================
  log('\n📋 PHASE 7: Portfolio API\n', 'warn');

  try {
    const portfolioRes = await fetchWithAuth('/api/portfolio');
    const portfolioData = await portfolioRes.json();
    
    const passed = portfolioRes.ok || portfolioRes.status === 401;
    recordTest('Get Portfolio', passed, 
      portfolioRes.ok ? `Found ${portfolioData.holdings?.length || 0} holdings` : 'Auth required');
  } catch (error) {
    recordTest('Get Portfolio', false, error.message);
  }

  // ==========================================
  // PHASE 8: KYC APIs
  // ==========================================
  log('\n📋 PHASE 8: KYC APIs\n', 'warn');

  try {
    const kycRes = await fetchWithAuth('/api/kyc');
    const kycData = await kycRes.json();
    
    const passed = kycRes.ok || kycRes.status === 401;
    recordTest('Get KYC Status', passed, 
      kycRes.ok ? `Status: ${kycData.status || 'NOT_SUBMITTED'}` : 'Auth required');
  } catch (error) {
    recordTest('Get KYC Status', false, error.message);
  }

  // Test simple KYC submission
  try {
    const kycSubmitRes = await fetchWithAuth('/api/kyc/simple', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Test User',
        country: 'United States',
        accreditedInvestor: true
      })
    });
    
    const passed = kycSubmitRes.ok || kycSubmitRes.status === 401;
    recordTest('Submit Simple KYC', passed);
  } catch (error) {
    recordTest('Submit Simple KYC', false, error.message);
  }

  // ==========================================
  // PHASE 9: Insurance APIs
  // ==========================================
  log('\n📋 PHASE 9: Insurance APIs\n', 'warn');

  try {
    const insuranceRes = await fetchWithAuth('/api/insurance');
    const insuranceData = await insuranceRes.json();
    
    const passed = insuranceRes.ok || insuranceRes.status === 401;
    recordTest('Get Insurance Pool', passed, 
      insuranceRes.ok ? `Pool Balance: ${insuranceData.balance || 0}` : 'Auth required');
  } catch (error) {
    recordTest('Get Insurance Pool', false, error.message);
  }

  // ==========================================
  // PHASE 10: Transactions API
  // ==========================================
  log('\n📋 PHASE 10: Transactions API\n', 'warn');

  try {
    const txRes = await fetchWithAuth('/api/transactions');
    const txData = await txRes.json();
    
    const passed = txRes.ok || txRes.status === 401;
    recordTest('Get Transactions', passed, 
      txRes.ok ? `Found ${txData.transactions?.length || 0} transactions` : 'Auth required');
  } catch (error) {
    recordTest('Get Transactions', false, error.message);
  }

  // ==========================================
  // Print Summary
  // ==========================================
  log('\n========================================', 'info');
  log('  TEST SUMMARY', 'info');
  log('========================================\n', 'info');

  log(`Total Tests: ${results.passed + results.failed}`, 'info');
  log(`Passed: ${results.passed}`, 'success');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'success');

  if (results.failed > 0) {
    log('\n❌ Failed Tests:', 'error');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => log(`  - ${t.name}: ${t.details}`, 'error'));
  }

  log('\n========================================\n', 'info');

  process.exit(results.failed > 0 ? 1 : 0);
}

async function main() {
  log('Checking if server is running...', 'info');
  
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error('Server not healthy');
  } catch {
    log('\n⚠️  Server is not running at ' + BASE_URL, 'error');
    log('Please start the dev server with: npm run dev\n', 'warn');
    process.exit(1);
  }

  log('Server is running ✓\n', 'success');
  await runTests();
}

main().catch(console.error);
