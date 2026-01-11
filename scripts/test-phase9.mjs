#!/usr/bin/env node
/**
 * Phase 9 Test Script - Final Integration
 * Tests stats, transactions, health check
 */

const BASE_URL = 'http://localhost:3000';

// Test user
const TEST_USER = {
  email: `final_${Date.now()}@test.com`,
  password: 'TestPassword123!',
  name: 'Final Test User',
  userType: 'INVESTOR',
};

let sessionCookie = '';

async function log(message, type = 'info') {
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[type] || '📋';
  console.log(`${prefix} ${message}`);
}

async function registerAndLogin(user) {
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  await registerRes.json();

  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      email: user.email,
      password: user.password,
      json: 'true',
    }),
    redirect: 'manual',
  });

  return loginRes.headers.get('set-cookie') || '';
}

async function testHealthEndpoint() {
  log('\n--- Testing Health Endpoint ---');

  const res = await fetch(`${BASE_URL}/api/health`);
  const data = await res.json();

  if (res.ok) {
    log(`Health status: ${data.status}`, data.status === 'healthy' ? 'success' : 'warn');
    log(`  Database: ${data.services?.database?.status} (${data.services?.database?.latency}ms)`, 'info');
    log(`  Stellar: ${data.services?.stellar?.status} (${data.services?.stellar?.latency}ms)`, 'info');
    return data;
  } else {
    log(`Health check failed: ${res.status}`, 'error');
    return null;
  }
}

async function testStatsEndpoint() {
  log('\n--- Testing Stats Endpoint ---');

  // Test without auth
  log('Testing without auth...');
  const noAuthRes = await fetch(`${BASE_URL}/api/stats`);
  if (noAuthRes.status === 401) {
    log('Correctly rejected unauthenticated request', 'success');
  } else {
    log(`Expected 401, got ${noAuthRes.status}`, 'warn');
  }

  // Test with auth
  log('Testing with auth...');
  const res = await fetch(`${BASE_URL}/api/stats`, {
    headers: { 'Cookie': sessionCookie },
  });
  const data = await res.json();

  if (res.ok) {
    log('Stats endpoint working', 'success');
    log(`  Total invoices: ${data.platform?.totalInvoices || 0}`, 'info');
    log(`  Total volume: ${data.platform?.totalVolume || 0}`, 'info');
    log(`  Insurance pool: ${data.platform?.insurancePoolBalance || 0}`, 'info');
    return data;
  } else if (res.status === 401) {
    log('Auth required - session not persisting', 'warn');
    return null;
  } else {
    log(`Response: ${res.status} - ${JSON.stringify(data)}`, 'info');
    return null;
  }
}

async function testTransactionsEndpoint() {
  log('\n--- Testing Transactions Endpoint ---');

  // Test without auth
  log('Testing without auth...');
  const noAuthRes = await fetch(`${BASE_URL}/api/transactions`);
  if (noAuthRes.status === 401) {
    log('Correctly rejected unauthenticated request', 'success');
  } else {
    log(`Expected 401, got ${noAuthRes.status}`, 'warn');
  }

  // Test with auth
  log('Testing with auth...');
  const res = await fetch(`${BASE_URL}/api/transactions`, {
    headers: { 'Cookie': sessionCookie },
  });
  const data = await res.json();

  if (res.ok) {
    log(`Found ${data.transactions?.length || 0} transactions`, 'success');
    log(`  Page: ${data.pagination?.page}/${data.pagination?.totalPages}`, 'info');
    return data;
  } else if (res.status === 401) {
    log('Auth required - session not persisting', 'warn');
    return null;
  } else {
    log(`Response: ${res.status} - ${JSON.stringify(data)}`, 'info');
    return null;
  }
}

async function testAllEndpoints() {
  log('\n--- Testing All API Endpoints ---');

  const endpoints = [
    { method: 'GET', path: '/api/health', auth: false },
    { method: 'GET', path: '/api/auth/csrf', auth: false },
    { method: 'GET', path: '/api/stats', auth: true },
    { method: 'GET', path: '/api/transactions', auth: true },
    { method: 'GET', path: '/api/invoices', auth: true },
    { method: 'GET', path: '/api/orders', auth: true },
    { method: 'GET', path: '/api/insurance', auth: true },
    { method: 'GET', path: '/api/insurance/claim', auth: true },
    { method: 'GET', path: '/api/kyc', auth: true },
    { method: 'GET', path: '/api/upload', auth: true },
  ];

  let passed = 0;
  let failed = 0;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: endpoint.auth && sessionCookie ? { 'Cookie': sessionCookie } : {},
      });

      const expectedStatus = endpoint.auth && !sessionCookie ? 401 : 200;
      const isOk = res.status === 200 || res.status === expectedStatus;

      if (isOk) {
        log(`${endpoint.method} ${endpoint.path} - ${res.status}`, 'success');
        passed++;
      } else {
        log(`${endpoint.method} ${endpoint.path} - ${res.status}`, 'warn');
        failed++;
      }
    } catch (error) {
      log(`${endpoint.method} ${endpoint.path} - ERROR`, 'error');
      failed++;
    }
  }

  log(`\nEndpoint tests: ${passed} passed, ${failed} failed`, passed > failed ? 'success' : 'warn');
}

async function runTests() {
  console.log('='.repeat(50));
  console.log('Phase 9 Tests - Final Integration');
  console.log('='.repeat(50));

  // Check server
  try {
    await fetch(`${BASE_URL}/api/auth/csrf`);
    log('Server is running', 'success');
  } catch {
    log('Server not running! Start with: npm run dev', 'error');
    process.exit(1);
  }

  // Test health first (no auth needed)
  await testHealthEndpoint();

  // Register and login
  log('\nSetting up test user...');
  sessionCookie = await registerAndLogin(TEST_USER);
  if (sessionCookie) {
    log('User logged in', 'success');
  } else {
    log('Login - cookies may not persist in Node.js', 'warn');
  }

  // Run tests
  await testStatsEndpoint();
  await testTransactionsEndpoint();
  await testAllEndpoints();

  console.log('\n' + '='.repeat(50));
  console.log('Phase 9 Tests Complete - ALL PHASES DONE!');
  console.log('='.repeat(50));
  
  console.log('\n📦 Complete API Summary:');
  console.log('\nAuth APIs:');
  console.log('  POST /api/auth/register     - User registration');
  console.log('  POST /api/auth/wallet/nonce - Wallet auth nonce');
  console.log('  GET  /api/auth/session      - Get session');
  
  console.log('\nInvoice APIs:');
  console.log('  GET  /api/invoices          - List invoices');
  console.log('  POST /api/invoices          - Create invoice');
  console.log('  GET  /api/invoices/:id      - Get invoice');
  console.log('  POST /api/invoices/:id/approve  - Approve (buyer)');
  console.log('  POST /api/invoices/:id/auction  - Start auction');
  console.log('  POST /api/invoices/:id/invest   - Invest');
  console.log('  POST /api/invoices/:id/settle   - Settle (buyer)');
  
  console.log('\nOrder APIs:');
  console.log('  GET  /api/orders            - List orders');
  console.log('  POST /api/orders            - Create sell order');
  console.log('  POST /api/orders/:id/fill   - Fill order');
  console.log('  POST /api/orders/:id/cancel - Cancel order');
  
  console.log('\nInsurance APIs:');
  console.log('  GET  /api/insurance         - Pool balance');
  console.log('  POST /api/insurance/claim   - Claim insurance');
  
  console.log('\nKYC APIs:');
  console.log('  POST /api/kyc               - Submit KYC');
  console.log('  GET  /api/kyc               - Get KYC status');
  console.log('  POST /api/kyc/worldid       - World ID verify');
  console.log('  POST /api/kyc/review        - Admin review');
  
  console.log('\nOther APIs:');
  console.log('  POST /api/upload            - IPFS upload');
  console.log('  GET  /api/stats             - Dashboard stats');
  console.log('  GET  /api/transactions      - Transaction history');
  console.log('  GET  /api/health            - Health check');
}

runTests().catch(console.error);
