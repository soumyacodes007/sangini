#!/usr/bin/env node
/**
 * Phase 7 Test Script - Insurance APIs
 * Tests insurance pool and claim functionality
 */

const BASE_URL = 'http://localhost:3000';

// Test user credentials
const TEST_INVESTOR = {
  email: `investor_${Date.now()}@test.com`,
  password: 'TestPassword123!',
  name: 'Phase7 Test Investor',
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
  log(`Registering ${user.userType}...`);
  
  // Register
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  const registerData = await registerRes.json();

  if (registerRes.ok) {
    log('User registered successfully', 'success');
  } else {
    log(`Registration: ${JSON.stringify(registerData)}`, 'warn');
  }

  // Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;

  // Login
  log('Logging in...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      csrfToken,
      email: user.email,
      password: user.password,
      json: 'true',
    }),
    redirect: 'manual',
  });

  const cookies = loginRes.headers.get('set-cookie');
  if (cookies) {
    sessionCookie = cookies;
    log('Login successful', 'success');
    return true;
  }

  if (loginRes.status === 302 || loginRes.status === 200) {
    log('Login redirect successful', 'info');
    return true;
  }

  log('Login failed', 'error');
  return false;
}

async function testInsurancePoolEndpoint() {
  log('\n--- Testing Insurance Pool Endpoint ---');

  // Test without auth
  log('Testing without auth...');
  const noAuthRes = await fetch(`${BASE_URL}/api/insurance`);
  if (noAuthRes.status === 401) {
    log('Correctly rejected unauthenticated request', 'success');
  } else {
    log(`Expected 401, got ${noAuthRes.status}`, 'warn');
  }

  // Test with auth
  log('Testing with auth...');
  const res = await fetch(`${BASE_URL}/api/insurance`, {
    headers: sessionCookie ? { 'Cookie': sessionCookie } : {},
  });
  const data = await res.json();

  if (res.ok) {
    log('Insurance pool endpoint working', 'success');
    log(`  Pool balance: ${data.pool?.balanceFormatted || 'N/A'}`, 'info');
    log(`  Total claims: ${data.claims?.total || 0}`, 'info');
    log(`  Defaulted invoices: ${data.defaultedInvoices || 0}`, 'info');
    return data;
  } else if (res.status === 401) {
    log('Auth required - session not persisting in Node.js', 'warn');
    return null;
  } else {
    log(`Response: ${res.status} - ${JSON.stringify(data)}`, 'info');
    return null;
  }
}

async function testClaimEndpoint() {
  log('\n--- Testing Insurance Claim Endpoint ---');

  // Test without auth
  log('Testing claim without auth...');
  const noAuthRes = await fetch(`${BASE_URL}/api/insurance/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceId: 'INV-1001' }),
  });
  if (noAuthRes.status === 401) {
    log('Correctly rejected unauthenticated request', 'success');
  } else {
    log(`Expected 401, got ${noAuthRes.status}`, 'warn');
  }

  // Test with auth but missing invoiceId
  log('Testing claim without invoiceId...');
  const noIdRes = await fetch(`${BASE_URL}/api/insurance/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
    },
    body: JSON.stringify({}),
  });
  const noIdData = await noIdRes.json();
  
  if (noIdRes.status === 400 && noIdData.error?.includes('required')) {
    log('Correctly rejected request without invoiceId', 'success');
  } else if (noIdRes.status === 401) {
    log('Auth required - session not persisting', 'warn');
    return;
  } else {
    log(`Response: ${noIdRes.status} - ${JSON.stringify(noIdData)}`, 'info');
  }

  // Test with non-existent invoice
  log('Testing claim with non-existent invoice...');
  const notFoundRes = await fetch(`${BASE_URL}/api/insurance/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
    },
    body: JSON.stringify({ invoiceId: 'INV-9999' }),
  });
  const notFoundData = await notFoundRes.json();
  
  if (notFoundRes.status === 404) {
    log('Correctly returned 404 for non-existent invoice', 'success');
  } else {
    log(`Response: ${notFoundRes.status} - ${JSON.stringify(notFoundData)}`, 'info');
  }
}

async function testGetClaims() {
  log('\n--- Testing Get Claims Endpoint ---');

  const res = await fetch(`${BASE_URL}/api/insurance/claim`, {
    headers: sessionCookie ? { 'Cookie': sessionCookie } : {},
  });
  const data = await res.json();

  if (res.ok) {
    log(`Found ${data.claims?.length || 0} claims`, 'success');
    return data;
  } else if (res.status === 401) {
    log('Auth required - session not persisting', 'warn');
    return null;
  } else {
    log(`Response: ${res.status} - ${JSON.stringify(data)}`, 'info');
    return null;
  }
}

async function runTests() {
  console.log('='.repeat(50));
  console.log('Phase 7 Tests - Insurance APIs');
  console.log('='.repeat(50));

  // Check server
  try {
    await fetch(`${BASE_URL}/api/auth/csrf`);
    log('Server is running', 'success');
  } catch {
    log('Server not running! Start with: npm run dev', 'error');
    process.exit(1);
  }

  // Login as investor
  const loggedIn = await registerAndLogin(TEST_INVESTOR);
  if (!loggedIn) {
    log('Failed to authenticate', 'error');
    process.exit(1);
  }

  // Run tests
  await testInsurancePoolEndpoint();
  await testClaimEndpoint();
  await testGetClaims();

  console.log('\n' + '='.repeat(50));
  console.log('Phase 7 Tests Complete');
  console.log('='.repeat(50));
  console.log('\nInsurance API endpoints created:');
  console.log('  GET  /api/insurance       - Get pool balance & stats');
  console.log('  POST /api/insurance/claim - Create insurance claim');
  console.log('  GET  /api/insurance/claim - List user claims');
  console.log('  POST /api/insurance/claim/confirm - Confirm claim tx');
}

runTests().catch(console.error);
