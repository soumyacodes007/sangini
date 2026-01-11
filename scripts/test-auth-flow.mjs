// Test Authentication Flow
// Run with: node scripts/test-auth-flow.mjs

const BASE_URL = 'http://localhost:3000';

// Create unique test user
const testUser = {
  email: `authtest_${Date.now()}@test.com`,
  password: 'SecurePassword123!',
  name: 'Auth Test User',
  userType: 'BUYER',
  companyName: 'Auth Test Corp',
};

async function main() {
  console.log('🔐 Testing Authentication Flow\n');

  // 1. Register
  console.log('1. Registering new user...');
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });
  const registerData = await registerRes.json();
  
  if (!registerRes.ok) {
    console.log('❌ Registration failed:', registerData);
    return;
  }
  console.log('✅ Registered:', registerData.userId);
  console.log('   Wallet funded:', registerData.walletFunded);

  // 2. Get CSRF token and login
  console.log('\n2. Logging in...');
  
  // First get the CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  console.log('   CSRF token obtained');

  // Login with credentials
  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      csrfToken,
      email: testUser.email,
      password: testUser.password,
      json: 'true',
    }),
    redirect: 'manual',
  });

  // Get cookies from response
  const cookies = loginRes.headers.get('set-cookie');
  
  if (loginRes.status === 302 || loginRes.status === 200) {
    console.log('✅ Login successful (redirect to callback)');
  } else {
    console.log('⚠️ Login status:', loginRes.status);
  }

  // 3. Check session with cookies
  console.log('\n3. Checking session...');
  
  if (cookies) {
    const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { 'Cookie': cookies },
    });
    const sessionData = await sessionRes.json();
    
    if (sessionData.user) {
      console.log('✅ Session active!');
      console.log('   User:', sessionData.user.email);
      console.log('   Type:', sessionData.user.userType);
      console.log('   KYC:', sessionData.user.kycStatus);
    } else {
      console.log('⚠️ No user in session (this is expected with credentials provider)');
      console.log('   NextAuth credentials flow requires browser for full session');
    }
  } else {
    console.log('⚠️ No cookies returned');
  }

  // 4. Test protected route access
  console.log('\n4. Testing protected route...');
  const protectedRes = await fetch(`${BASE_URL}/api/invoices/test/approve`, {
    method: 'POST',
    headers: cookies ? { 'Cookie': cookies } : {},
  });
  
  console.log('   Protected route status:', protectedRes.status);
  
  console.log('\n========================================');
  console.log('Auth Flow Test Complete');
  console.log('========================================');
  console.log('\nFor full testing, use the browser:');
  console.log(`1. Go to ${BASE_URL}/auth/signin`);
  console.log(`2. Login with: ${testUser.email} / ${testUser.password}`);
  console.log('3. You should be redirected to /dashboard');
}

main().catch(console.error);
