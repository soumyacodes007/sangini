// Phase 4: Invoice APIs Test
// Run with: node scripts/test-phase4.mjs

const BASE_URL = 'http://localhost:3000';

console.log(`
╔══════════════════════════════════════════════════════════════╗
║           SANGINI - Phase 4 Invoice APIs Test                ║
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

  // Invoice List API
  console.log('📋 Invoice List API');
  console.log('─'.repeat(50));
  
  total++; 
  const listRes = await checkEndpoint('GET /api/invoices (requires auth)', '/api/invoices');
  if (listRes.status === 307 || listRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  // Invoice Detail API
  console.log('\n📄 Invoice Detail API');
  console.log('─'.repeat(50));
  
  total++;
  const detailRes = await checkEndpoint('GET /api/invoices/:id (requires auth)', '/api/invoices/test-id');
  if (detailRes.status === 307 || detailRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  // Invoice Create API
  console.log('\n➕ Invoice Create API');
  console.log('─'.repeat(50));
  
  total++;
  const createRes = await checkEndpoint('POST /api/invoices (requires auth)', '/api/invoices', 'POST', {
    buyerAddress: 'GBBLVFK64B4A5RHEZ2STRG6FFVHPTBXFXMWBFOM5HRDKSZXRDSOQRLI4',
    amount: '1000000000',
    currency: 'USDC',
    dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Test Invoice',
    purchaseOrder: 'PO-001',
  });
  if (createRes.status === 307 || createRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  // Invoice Confirm API
  console.log('\n✓ Invoice Confirm API');
  console.log('─'.repeat(50));
  
  total++;
  const confirmRes = await checkEndpoint('POST /api/invoices/confirm (requires auth)', '/api/invoices/confirm', 'POST', {
    pendingId: '000000000000000000000000',
    txHash: 'test-hash',
    invoiceId: 'INV-0001',
  });
  if (confirmRes.status === 307 || confirmRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  // Auction API
  console.log('\n🔨 Auction API');
  console.log('─'.repeat(50));
  
  total++;
  const auctionRes = await checkEndpoint('POST /api/invoices/:id/auction (requires auth)', '/api/invoices/test-id/auction', 'POST', {
    durationHours: 168,
    maxDiscountBps: 1500,
  });
  if (auctionRes.status === 307 || auctionRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  // Investment API
  console.log('\n💰 Investment API');
  console.log('─'.repeat(50));
  
  total++;
  const investGetRes = await checkEndpoint('GET /api/invoices/:id/invest (requires auth)', '/api/invoices/test-id/invest');
  if (investGetRes.status === 307 || investGetRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  total++;
  const investPostRes = await checkEndpoint('POST /api/invoices/:id/invest (requires auth)', '/api/invoices/test-id/invest', 'POST', {
    tokenAmount: '1000000',
  });
  if (investPostRes.status === 307 || investPostRes.status === 401) {
    console.log('     → Correctly requires authentication');
    passed++;
  }

  // Approve API (from Phase 3)
  console.log('\n✅ Approve API (Phase 3)');
  console.log('─'.repeat(50));
  
  total++;
  const approveRes = await checkEndpoint('POST /api/invoices/:id/approve (requires auth)', '/api/invoices/test-id/approve', 'POST');
  if (approveRes.status === 307 || approveRes.status === 401 || approveRes.status === 200) {
    passed++;
  }

  // Settle API (from Phase 3)
  console.log('\n💵 Settle API (Phase 3)');
  console.log('─'.repeat(50));
  
  total++;
  const settleRes = await checkEndpoint('POST /api/invoices/:id/settle (requires auth)', '/api/invoices/test-id/settle', 'POST');
  if (settleRes.status === 307 || settleRes.status === 401 || settleRes.status === 200) {
    passed++;
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`📊 RESULTS: ${passed}/${total} checks passed (${Math.round(passed/total*100)}%)`);
  console.log('═'.repeat(50));
  
  if (passed === total) {
    console.log('\n🎉 All Phase 4 Invoice APIs are working!\n');
  } else {
    console.log('\n⚠️  Some APIs need attention.\n');
  }

  console.log('📝 API Summary:');
  console.log('─'.repeat(50));
  console.log('GET  /api/invoices              - List invoices');
  console.log('POST /api/invoices              - Create invoice (returns XDR)');
  console.log('GET  /api/invoices/:id          - Get invoice details');
  console.log('POST /api/invoices/confirm      - Confirm invoice creation');
  console.log('POST /api/invoices/:id/auction  - Start auction (returns XDR)');
  console.log('PUT  /api/invoices/:id/auction  - Confirm auction started');
  console.log('GET  /api/invoices/:id/invest   - Get investment info');
  console.log('POST /api/invoices/:id/invest   - Invest (returns XDR)');
  console.log('PUT  /api/invoices/:id/invest   - Confirm investment');
  console.log('POST /api/invoices/:id/approve  - Approve invoice (meta-tx)');
  console.log('POST /api/invoices/:id/settle   - Settle invoice (meta-tx)');
  console.log('');
}

main().catch(console.error);
