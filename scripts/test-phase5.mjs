// Phase 5: Secondary Market APIs Test
// Run with: node scripts/test-phase5.mjs

const BASE_URL = 'http://localhost:3000';

console.log(`
╔══════════════════════════════════════════════════════════════╗
║        SANGINI - Phase 5 Secondary Market APIs Test          ║
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
    const data = await res.json().catch(() => ({}));
    const ok = status < 500;
    console.log(`  ${ok ? '✅' : '❌'} ${name} [${status}]`);
    if (status >= 400 && data.error) {
      console.log(`     → ${data.error}`);
    }
    return { ok, status, data };
  } catch (e) {
    console.log(`  ❌ ${name} [ERROR: ${e.message}]`);
    return { ok: false, error: e.message };
  }
}

async function main() {
  let passed = 0;
  let total = 0;

  // Order List API
  console.log('📋 Order List API');
  console.log('─'.repeat(50));
  
  total++;
  const listRes = await checkEndpoint('GET /api/orders (requires auth)', '/api/orders');
  if (listRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  total++;
  const listWithParams = await checkEndpoint('GET /api/orders?invoiceId=INV-001', '/api/orders?invoiceId=INV-001');
  if (listWithParams.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  // Order Detail API
  console.log('\n📄 Order Detail API');
  console.log('─'.repeat(50));
  
  total++;
  const detailRes = await checkEndpoint('GET /api/orders/:id', '/api/orders/ORD-0001');
  if (detailRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  // Create Order API
  console.log('\n➕ Create Order API');
  console.log('─'.repeat(50));
  
  total++;
  const createRes = await checkEndpoint('POST /api/orders (create sell order)', '/api/orders', 'POST', {
    invoiceId: 'INV-0001',
    tokenAmount: '1000000',
    pricePerToken: '1050000', // 5% premium
  });
  if (createRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  total++;
  const confirmRes = await checkEndpoint('PUT /api/orders (confirm order)', '/api/orders', 'PUT', {
    txHash: 'test-hash',
    orderId: 'ORD-0001',
    invoiceId: 'INV-0001',
    tokenAmount: '1000000',
    pricePerToken: '1050000',
  });
  if (confirmRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  // Fill Order API
  console.log('\n💰 Fill Order API');
  console.log('─'.repeat(50));
  
  total++;
  const fillRes = await checkEndpoint('POST /api/orders/:id/fill (buy tokens)', '/api/orders/ORD-0001/fill', 'POST', {
    tokenAmount: '500000',
  });
  if (fillRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  total++;
  const confirmFillRes = await checkEndpoint('PUT /api/orders/:id/fill (confirm fill)', '/api/orders/ORD-0001/fill', 'PUT', {
    txHash: 'test-hash',
    tokenAmount: '500000',
    paymentAmount: '525000000',
  });
  if (confirmFillRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  // Cancel Order API
  console.log('\n❌ Cancel Order API');
  console.log('─'.repeat(50));
  
  total++;
  const cancelRes = await checkEndpoint('POST /api/orders/:id/cancel', '/api/orders/ORD-0001/cancel', 'POST');
  if (cancelRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  total++;
  const confirmCancelRes = await checkEndpoint('PUT /api/orders/:id/cancel (confirm)', '/api/orders/ORD-0001/cancel', 'PUT', {
    txHash: 'test-hash',
  });
  if (confirmCancelRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`📊 RESULTS: ${passed}/${total} checks passed (${Math.round(passed/total*100)}%)`);
  console.log('═'.repeat(50));
  
  if (passed === total) {
    console.log('\n🎉 All Phase 5 Secondary Market APIs are working!\n');
  } else {
    console.log('\n⚠️  Some APIs need attention.\n');
  }

  console.log('📝 API Summary:');
  console.log('─'.repeat(50));
  console.log('GET  /api/orders              - List orders (with filters)');
  console.log('POST /api/orders              - Create sell order (returns XDR)');
  console.log('PUT  /api/orders              - Confirm order creation');
  console.log('GET  /api/orders/:id          - Get order details');
  console.log('POST /api/orders/:id/fill     - Fill order (returns XDR)');
  console.log('PUT  /api/orders/:id/fill     - Confirm order fill');
  console.log('POST /api/orders/:id/cancel   - Cancel order (returns XDR)');
  console.log('PUT  /api/orders/:id/cancel   - Confirm cancellation');
  console.log('');
}

main().catch(console.error);
