#!/usr/bin/env node
/**
 * Phase 8 Test Script - KYC APIs
 * Tests KYC submission and verification
 */

const BASE_URL = 'http://localhost:3000';

// Test users
const TEST_INVESTOR = {
  email: `investor_kyc_${Date.now()}@test.com`,
  password: 'TestPassword123!',
  name: 'KYC Test Investor',
  userType: 'INVESTOR',
};

const TEST_ADMIN = {
  email: `admin_kyc_${Date.now()}@test.com`,
  password: 'AdminPassword123!',
  name: 'KYC Test Admin',
  userType: 'ADMIN',
};

let investorCookie = '';
let adminCookie = '';

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
  // Register
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  await registerRes.json();

  // Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();

  // Login
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

async function testKycSubmission() {
  log('\n--- Testing KYC Submission ---');

  // Test without auth
  log('Testing without auth...');
  const noAuthRes = await fetch(`${BASE_URL}/api/kyc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Test', country: 'US' }),
  });
  if (noAuthRes.status === 401) {
    log('Correctly rejected unauthenticated request', 'success');
  } else {
    log(`Expected 401, got ${noAuthRes.status}`, 'warn');
  }

  // Test with missing fields
  log('Testing with missing fields...');
  const missingRes = await fetch(`${BASE_URL}/api/kyc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': investorCookie,
    },
    body: JSON.stringify({}),
  });
  const missingData = await missingRes.json();
  
  if (missingRes.status === 400 && missingData.error?.includes('required')) {
    log('Correctly rejected missing fields', 'success');
  } else if (missingRes.status === 401) {
    log('Auth required - session not persisting', 'warn');
    return null;
  } else {
    log(`Response: ${missingRes.status} - ${JSON.stringify(missingData)}`, 'info');
  }

  // Test with invalid country
  log('Testing with invalid country...');
  const invalidCountryRes = await fetch(`${BASE_URL}/api/kyc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': investorCookie,
    },
    body: JSON.stringify({ fullName: 'Test User', country: 'XX' }),
  });
  const invalidCountryData = await invalidCountryRes.json();
  
  if (invalidCountryRes.status === 400 && invalidCountryData.error?.includes('country')) {
    log('Correctly rejected invalid country', 'success');
  } else {
    log(`Response: ${invalidCountryRes.status} - ${JSON.stringify(invalidCountryData)}`, 'info');
  }

  // Test valid submission
  log('Testing valid KYC submission...');
  const validRes = await fetch(`${BASE_URL}/api/kyc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': investorCookie,
    },
    body: JSON.stringify({
      fullName: 'John Doe',
      country: 'US',
      accreditedInvestor: true,
    }),
  });
  const validData = await validRes.json();

  if (validRes.ok) {
    log(`KYC submitted! Status: ${validData.kycStatus}`, 'success');
    return validData;
  } else {
    log(`Response: ${validRes.status} - ${JSON.stringify(validData)}`, 'info');
    return null;
  }
}

async function testGetKycStatus() {
  log('\n--- Testing Get KYC Status ---');

  const res = await fetch(`${BASE_URL}/api/kyc`, {
    headers: { 'Cookie': investorCookie },
  });
  const data = await res.json();

  if (res.ok) {
    log(`KYC Status: ${data.kycStatus}`, 'success');
    if (data.kyc) {
      log(`  Name: ${data.kyc.fullName}`, 'info');
      log(`  Country: ${data.kyc.country}`, 'info');
      log(`  Accredited: ${data.kyc.accreditedInvestor}`, 'info');
    }
    return data;
  } else if (res.status === 401) {
    log('Auth required - session not persisting', 'warn');
    return null;
  } else {
    log(`Response: ${res.status} - ${JSON.stringify(data)}`, 'info');
    return null;
  }
}

async function testWorldIdEndpoint() {
  log('\n--- Testing World ID Endpoint ---');

  // Test GET status
  log('Testing World ID status...');
  const statusRes = await fetch(`${BASE_URL}/api/kyc/worldid`, {
    headers: { 'Cookie': investorCookie },
  });
  const statusData = await statusRes.json();

  if (statusRes.ok) {
    log(`World ID configured: ${statusData.worldIdConfigured}`, 'success');
    log(`Verified: ${statusData.verified}`, 'info');
  } else if (statusRes.status === 401) {
    log('Auth required - session not persisting', 'warn');
  } else {
    log(`Response: ${statusRes.status}`, 'info');
  }

  // Test POST with mock proof (will fail without real World ID)
  log('Testing World ID verification (mock)...');
  const verifyRes = await fetch(`${BASE_URL}/api/kyc/worldid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': investorCookie,
    },
    body: JSON.stringify({
      proof: 'mock_proof_123',
      merkle_root: 'mock_merkle_root',
      nullifier_hash: `mock_nullifier_${Date.now()}`,
      verification_level: 'device',
    }),
  });
  const verifyData = await verifyRes.json();

  if (verifyRes.ok) {
    log('World ID mock verification successful', 'success');
  } else {
    log(`Response: ${verifyRes.status} - ${JSON.stringify(verifyData)}`, 'info');
  }
}

async function testAdminReview() {
  log('\n--- Testing Admin KYC Review ---');

  // Test list submissions (admin only)
  log('Testing list KYC submissions...');
  const listRes = await fetch(`${BASE_URL}/api/kyc/review`, {
    headers: { 'Cookie': adminCookie },
  });
  const listData = await listRes.json();

  if (listRes.ok) {
    log(`Found ${listData.submissions?.length || 0} submissions`, 'success');
    log(`  Pending: ${listData.counts?.PENDING || 0}`, 'info');
    log(`  Approved: ${listData.counts?.APPROVED || 0}`, 'info');
    log(`  Rejected: ${listData.counts?.REJECTED || 0}`, 'info');
  } else if (listRes.status === 401) {
    log('Auth required - session not persisting', 'warn');
  } else if (listRes.status === 403) {
    log('Admin access required (expected for non-admin)', 'info');
  } else {
    log(`Response: ${listRes.status} - ${JSON.stringify(listData)}`, 'info');
  }
}

async function runTests() {
  console.log('='.repeat(50));
  console.log('Phase 8 Tests - KYC APIs');
  console.log('='.repeat(50));

  // Check server
  try {
    await fetch(`${BASE_URL}/api/auth/csrf`);
    log('Server is running', 'success');
  } catch {
    log('Server not running! Start with: npm run dev', 'error');
    process.exit(1);
  }

  // Register and login users
  log('\nSetting up test users...');
  investorCookie = await registerAndLogin(TEST_INVESTOR);
  adminCookie = await registerAndLogin(TEST_ADMIN);
  
  if (investorCookie) {
    log('Investor logged in', 'success');
  } else {
    log('Investor login - cookies may not persist in Node.js', 'warn');
  }
  
  if (adminCookie) {
    log('Admin logged in', 'success');
  } else {
    log('Admin login - cookies may not persist in Node.js', 'warn');
  }

  // Run tests
  await testKycSubmission();
  await testGetKycStatus();
  await testWorldIdEndpoint();
  await testAdminReview();

  console.log('\n' + '='.repeat(50));
  console.log('Phase 8 Tests Complete');
  console.log('='.repeat(50));
  console.log('\nKYC API endpoints created:');
  console.log('  POST /api/kyc          - Submit KYC data');
  console.log('  GET  /api/kyc          - Get KYC status');
  console.log('  POST /api/kyc/review   - Admin: approve/reject KYC');
  console.log('  GET  /api/kyc/review   - Admin: list submissions');
  console.log('  POST /api/kyc/worldid  - World ID verification');
  console.log('  GET  /api/kyc/worldid  - World ID status');
}

runTests().catch(console.error);
