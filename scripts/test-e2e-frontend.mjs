#!/usr/bin/env node

/**
 * End-to-End Frontend Feature Test
 * Tests all API endpoints and frontend flows
 */

const BASE_URL = 'http://localhost:3000';

// Test results tracking
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

async function testEndpoint(name, url, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await res.json().catch(() => ({}));
    
    if (options.expectStatus) {
      const passed = res.status === options.expectStatus;
      recordTest(name, passed, passed ? '' : `Expected ${options.expectStatus}, got ${res.status}`);
      return { res, data, passed };
    }
    
    const passed = res.ok || (options.allowUnauth && res.status === 401);
    recordTest(name, passed, passed ? '' : `Status ${res.status}: ${data.error || 'Unknown error'}`);
    return { res, data, passed };
  } catch (error) {
    recordTest(name, false, error.message);
    return { res: null, data: null, passed: false };
  }
}

async function runTests() {
  log('\n========================================', 'info');
  log('  SANGINI E2E FRONTEND TESTS', 'info');
  log('========================================\n', 'info');

  // ==========================================
  // PHASE 1: Health & Basic Endpoints
  // ==========================================
  log('\n📋 PHASE 1: Health & Basic Endpoints\n', 'warn');

  await testEndpoint('Health Check', '/api/health');

  // ==========================================
  // PHASE 2: Auth Endpoints (Unauthenticated)
  // ==========================================
  log('\n📋 PHASE 2: Auth Endpoints\n', 'warn');

  await testEndpoint('Auth - Get Providers', '/api/auth/providers');
  
  await testEndpoint('Auth - Get Session (no auth)', '/api/auth/session');

  await testEndpoint('Auth - Wallet Nonce', '/api/auth/wallet/nonce', {
    method: 'POST',
    body: JSON.stringify({ walletAddress: 'GTEST123456789' }),
    expectStatus: 200
  });

  // ==========================================
  // PHASE 3: Invoice Endpoints (Unauthenticated - expect 401)
  // ==========================================
  log('\n📋 PHASE 3: Invoice Endpoints (Auth Required)\n', 'warn');

  await testEndpoint('Invoices - List (no auth)', '/api/invoices', {
    expectStatus: 401
  });

  await testEndpoint('Invoices - Get Single (no auth)', '/api/invoices/test123', {
    expectStatus: 401
  });

  // ==========================================
  // PHASE 4: Stats Endpoint
  // ==========================================
  log('\n📋 PHASE 4: Stats Endpoint\n', 'warn');

  await testEndpoint('Stats - Get (no auth)', '/api/stats', {
    expectStatus: 401
  });

  // ==========================================
  // PHASE 5: Orders Endpoints
  // ==========================================
  log('\n📋 PHASE 5: Orders Endpoints\n', 'warn');

  await testEndpoint('Orders - List (no auth)', '/api/orders', {
    expectStatus: 401
  });

  // ==========================================
  // PHASE 6: Portfolio Endpoint
  // ==========================================
  log('\n📋 PHASE 6: Portfolio Endpoint\n', 'warn');

  await testEndpoint('Portfolio - Get (no auth)', '/api/portfolio', {
    expectStatus: 401
  });

  // ==========================================
  // PHASE 7: KYC Endpoints
  // ==========================================
  log('\n📋 PHASE 7: KYC Endpoints\n', 'warn');

  await testEndpoint('KYC - Get Status (no auth)', '/api/kyc', {
    expectStatus: 401
  });

  // ==========================================
  // PHASE 8: Insurance Endpoints
  // ==========================================
  log('\n📋 PHASE 8: Insurance Endpoints\n', 'warn');

  await testEndpoint('Insurance - Get Pool (no auth)', '/api/insurance', {
    expectStatus: 401
  });

  // ==========================================
  // PHASE 9: Upload Endpoint
  // ==========================================
  log('\n📋 PHASE 9: Upload Endpoint\n', 'warn');

  await testEndpoint('Upload - POST (no auth)', '/api/upload', {
    method: 'POST',
    expectStatus: 401
  });

  // ==========================================
  // PHASE 10: Frontend Pages (Check they load)
  // ==========================================
  log('\n📋 PHASE 10: Frontend Pages\n', 'warn');

  const pages = [
    { name: 'Home Page', url: '/' },
    { name: 'Sign In Page', url: '/auth/signin' },
    { name: 'Register Page', url: '/auth/register' },
  ];

  for (const page of pages) {
    try {
      const res = await fetch(`${BASE_URL}${page.url}`);
      const passed = res.ok;
      recordTest(page.name, passed, passed ? '' : `Status ${res.status}`);
    } catch (error) {
      recordTest(page.name, false, error.message);
    }
  }

  // ==========================================
  // PHASE 11: Dashboard Pages (Redirect to login expected)
  // ==========================================
  log('\n📋 PHASE 11: Dashboard Pages (Auth Redirect)\n', 'warn');

  const dashboardPages = [
    '/dashboard',
    '/dashboard/create',
    '/dashboard/requests',
    '/dashboard/market',
    '/dashboard/portfolio',
    '/dashboard/orders',
    '/dashboard/settlements',
    '/dashboard/profile',
  ];

  for (const url of dashboardPages) {
    try {
      const res = await fetch(`${BASE_URL}${url}`, { redirect: 'manual' });
      // Should redirect to login or return page
      const passed = res.status === 200 || res.status === 307 || res.status === 302;
      recordTest(`Dashboard: ${url}`, passed, passed ? '' : `Status ${res.status}`);
    } catch (error) {
      recordTest(`Dashboard: ${url}`, false, error.message);
    }
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

  // Exit with error code if tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

// Check if server is running
async function checkServer() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { timeout: 5000 });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  log('Checking if server is running...', 'info');
  
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    log('\n⚠️  Server is not running at ' + BASE_URL, 'error');
    log('Please start the dev server with: npm run dev\n', 'warn');
    process.exit(1);
  }

  log('Server is running ✓\n', 'success');
  await runTests();
}

main().catch(console.error);
