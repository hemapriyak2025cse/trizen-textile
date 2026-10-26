const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body) headers['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function runConsoleAuthTests() {
  console.log('===================================================================');
  console.log('🛡️  VERIFYING ENTER OPERATIONS CONSOLE & AUTHENTICATION SECURITY');
  console.log('===================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Unauthenticated request to Admin API
    const unauthAdminRes = await request('GET', '/api/admin/overview');
    assert(unauthAdminRes.status === 401, 'Unauthenticated request to GET /api/admin/overview returns 401 UNAUTHORIZED');

    // 2. Unauthenticated request to Tenant API
    const unauthTenantRes = await request('GET', '/api/tenant/profile');
    assert(unauthTenantRes.status === 401, 'Unauthenticated request to GET /api/tenant/profile returns 401 UNAUTHORIZED');

    // 3. Invalid Login Credentials
    const invalidLoginRes = await request('POST', '/api/auth/login', { identifier: 'admin', password: 'WrongPassword' });
    assert(invalidLoginRes.status === 401, 'Invalid password attempt returns 401 INVALID_CREDENTIALS');

    // 4. Authenticate as Textile Owner
    const ownerRes = await request('POST', '/api/auth/login', { identifier: 'owner_kanchi', password: 'Owner@123' });
    assert(ownerRes.status === 200 && ownerRes.data.user?.role === 'OWNER', 'Owner kanchi authenticates with 200 OK and OWNER role');
    const ownerToken = ownerRes.data.token;

    // 5. Authenticate as Worker
    const workerRes = await request('POST', '/api/auth/login', { identifier: 'murugan_weaver', password: 'Worker@123' });
    assert(workerRes.status === 200 && workerRes.data.user?.role === 'WORKER', 'Worker murugan authenticates with 200 OK and WORKER role');
    const workerToken = workerRes.data.token;

    // 6. Authenticate as Platform Admin
    const adminRes = await request('POST', '/api/auth/login', { identifier: 'admin', password: 'Admin@123' });
    assert(adminRes.status === 200 && adminRes.data.user?.role === 'ADMIN', 'Platform Admin authenticates with 200 OK and ADMIN role');
    const adminToken = adminRes.data.token;

    // 7. Role Restriction: Textile Owner cannot access Admin Overview
    const ownerAdminRes = await request('GET', '/api/admin/overview', null, ownerToken);
    assert(ownerAdminRes.status === 403, 'Textile Owner attempting GET /api/admin/overview is REJECTED with 403 FORBIDDEN');

    // 8. Role Restriction: Worker cannot access Admin Overview
    const workerAdminRes = await request('GET', '/api/admin/overview', null, workerToken);
    assert(workerAdminRes.status === 403, 'Worker attempting GET /api/admin/overview is REJECTED with 403 FORBIDDEN');

    // 9. Admin Authorized Access: Platform Admin gets 200 OK on Admin Overview
    const adminOverviewRes = await request('GET', '/api/admin/overview', null, adminToken);
    assert(adminOverviewRes.status === 200 && adminOverviewRes.data.platformStatus === 'OPERATIONAL', 'Platform Admin successfully accesses GET /api/admin/overview with 200 OK');

    // 10. Session Expiry & Logout
    const logoutRes = await request('POST', '/api/auth/logout', null, adminToken);
    assert(logoutRes.status === 200, 'Admin logout returns 200 OK');

    const adminMeAfterLogout = await request('GET', '/api/auth/me', null, adminToken);
    assert(adminMeAfterLogout.status === 401, 'Admin session after logout returns 401 SESSION_INVALID');

    console.log('\n===================================================================');
    console.log(`🏁 CONSOLE AUTHENTICATION SECURITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===================================================================');
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('💥 ERROR RUNNING CONSOLE AUTH TESTS:', err);
    process.exit(1);
  }
}

runConsoleAuthTests();
