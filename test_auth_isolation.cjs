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

async function runAuthTests() {
  console.log('====================================================');
  console.log('🔒 STARTING TRIZEN AUTHENTICATION & ISOLATION TESTS');
  console.log('====================================================\n');

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
    // 1. Unauthenticated request rejected with 401
    const unauthRes = await request('GET', '/api/auth/me');
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/auth/me returns 401 UNAUTHORIZED');

    // 2. Invalid login returns 401
    const invalidLoginRes = await request('POST', '/api/auth/login', { identifier: 'owner_kanchi', password: 'WrongPassword' });
    assert(invalidLoginRes.status === 401, 'Invalid password returns 401 INVALID_CREDENTIALS');

    // 3. Valid logins work and return unique tokens & role information
    const ownerRes = await request('POST', '/api/auth/login', { identifier: 'owner_kanchi', password: 'Owner@123' });
    assert(ownerRes.status === 200 && ownerRes.data.user?.role === 'OWNER', 'Owner kanchi login returns 200 OK with OWNER role');
    const ownerToken = ownerRes.data.token;

    const workerRes = await request('POST', '/api/auth/login', { identifier: 'murugan_weaver', password: 'Worker@123' });
    assert(workerRes.status === 200 && workerRes.data.user?.role === 'WORKER', 'Worker murugan login returns 200 OK with WORKER role');
    const workerToken = workerRes.data.token;

    const adminRes = await request('POST', '/api/auth/login', { identifier: 'admin', password: 'Admin@123' });
    assert(adminRes.status === 200 && adminRes.data.user?.role === 'ADMIN', 'Admin login returns 200 OK with ADMIN role');
    const adminToken = adminRes.data.token;

    // 4. Session check /me returns correct user details
    const meRes = await request('GET', '/api/auth/me', null, ownerToken);
    assert(meRes.status === 200 && meRes.data.user?.username === 'owner_kanchi', '/api/auth/me retrieves correct authenticated owner');

    // 5. Tenant isolation check: Owner Kanchi cannot verify/access another tenant
    const crossTenantRes = await request('GET', '/api/tenant/verify-isolation/tnt_arani_02', null, ownerToken);
    assert(crossTenantRes.status === 403 && crossTenantRes.data.error === 'TENANT_ISOLATION_VIOLATION', 'Cross-tenant verification returns 403 TENANT_ISOLATION_VIOLATION');

    // 6. Worker cannot access admin routes
    const workerAdminRes = await request('GET', '/api/admin/overview', null, workerToken);
    assert(workerAdminRes.status === 403, 'Worker accessing admin overview returns 403 FORBIDDEN');

    // 7. Logout invalidates session
    const logoutRes = await request('POST', '/api/auth/logout', null, ownerToken);
    assert(logoutRes.status === 200, 'Logout returns 200 OK');

    const meAfterLogout = await request('GET', '/api/auth/me', null, ownerToken);
    assert(meAfterLogout.status === 401, 'Request after logout returns 401 SESSION_INVALID');

    console.log('\n====================================================');
    console.log(`🏁 AUTH TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('💥 ERROR RUNNING AUTH TESTS:', err);
    process.exit(1);
  }
}

runAuthTests();
