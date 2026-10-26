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

async function runProposalWorkflowTest() {
  console.log('===================================================================');
  console.log('🧪 TESTING WORKER-TO-OWNER WORK PROPOSAL WORKFLOW');
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
    // 1. Log in as Worker
    const workerAuth = await request('POST', '/api/auth/login', { identifier: 'murugan_weaver', password: 'Worker@123' });
    assert(workerAuth.status === 200, 'Worker authenticated successfully');
    const workerToken = workerAuth.data.token;

    // 2. Search Owners
    const searchRes = await request('GET', '/api/worker/search-owners', null, workerToken);
    assert(searchRes.status === 200 && Array.isArray(searchRes.data.businesses), 'Worker searched registered owners successfully');
    const targetTenant = searchRes.data.businesses.find(b => b.id === 'tnt_kanchi_01');
    assert(!!targetTenant, 'Target business Sri Venkateswara Handlooms (tnt_kanchi_01) found in directory');

    // 3. Submit Work Proposal
    const proposalPayload = {
      tenant_id: targetTenant.id,
      requested_process: 'Weaving / Loom',
      quantity: 20,
      unit: 'pieces',
      proposed_rate: 2500,
      expected_completion: '10 Days from Silk Yarn Handover',
      message: 'Namaste! Ready for temple border Korvai saree weaving run.'
    };

    const submitRes = await request('POST', '/api/workflow/work-requests', proposalPayload, workerToken);
    assert(submitRes.status === 201 && submitRes.data.success, 'Work proposal submitted to backend with 201 CREATED');
    const requestId = submitRes.data.requestId;

    // 4. Verify Proposal in Worker List
    const workerRequestsRes = await request('GET', '/api/workflow/work-requests', null, workerToken);
    assert(workerRequestsRes.status === 200, 'Worker retrieved my-requests list');
    const myReq = (workerRequestsRes.data.requests || []).find(r => r.id === requestId);
    assert(!!myReq && myReq.status === 'PENDING', 'Proposal persists in worker list with status PENDING');

    // 5. Log in as Recipient Owner (Sri Venkateswara Handlooms)
    const owner1Auth = await request('POST', '/api/auth/login', { identifier: 'owner_kanchi', password: 'Owner@123' });
    assert(owner1Auth.status === 200, 'Recipient Owner authenticated successfully');
    const owner1Token = owner1Auth.data.token;

    // 6. Verify Proposal in Owner Incoming List
    const owner1RequestsRes = await request('GET', '/api/workflow/work-requests', null, owner1Token);
    assert(owner1RequestsRes.status === 200, 'Owner 1 retrieved incoming requests list');
    const owner1Req = (owner1RequestsRes.data.requests || []).find(r => r.id === requestId);
    assert(!!owner1Req && owner1Req.status === 'PENDING', 'Proposal delivered to Recipient Owner with status PENDING');

    // 7. Owner 1 Requests Clarification
    const infoRes = await request('POST', `/api/workflow/work-requests/${requestId}/respond`, {
      action: 'INFO_REQUESTED',
      owner_response: 'Can you confirm yarn warp count and loom availability?'
    }, owner1Token);
    assert(infoRes.status === 200, 'Owner 1 requested clarification (INFO_REQUESTED)');

    // 8. Worker Replies to Clarification
    const replyRes = await request('POST', `/api/workflow/work-requests/${requestId}/reply`, {
      reply_message: 'Yes, 80/100 silk warp tension confirmed. Available starting tomorrow.'
    }, workerToken);
    assert(replyRes.status === 200, 'Worker replied to clarification request');

    // 9. Owner 1 Accepts Proposal
    const acceptRes = await request('POST', `/api/workflow/work-requests/${requestId}/respond`, {
      action: 'ACCEPTED',
      owner_response: 'Work request accepted! Loom assigned.'
    }, owner1Token);
    assert(acceptRes.status === 200 && acceptRes.data.jobId, 'Owner 1 accepted proposal and assigned job created');

    // 10. Verify Assigned Job in Worker Jobs List
    const workerJobsRes = await request('GET', '/api/workflow/jobs', null, workerToken);
    assert(workerJobsRes.status === 200, 'Worker retrieved active assigned jobs');
    const assignedJob = (workerJobsRes.data.jobs || []).find(j => j.id === acceptRes.data.jobId);
    assert(!!assignedJob, 'Assigned job is visible in worker jobs list');

    // 11. Tenant Isolation Check: Log in as Owner 2 (Arani Royal Silks - tnt_arani_02)
    const owner2Auth = await request('POST', '/api/auth/login', { identifier: 'owner_arani', password: 'Owner@123' });
    assert(owner2Auth.status === 200, 'Owner 2 authenticated');
    const owner2Token = owner2Auth.data.token;

    const owner2RequestsRes = await request('GET', '/api/workflow/work-requests', null, owner2Token);
    const owner2Req = (owner2RequestsRes.data.requests || []).find(r => r.id === requestId);
    assert(!owner2Req, 'Tenant Isolation Enforced: Owner 2 CANNOT see Owner 1 proposal');

    // 12. Owner 2 Attempting Response on Owner 1 Proposal
    const crossTenantRespond = await request('POST', `/api/workflow/work-requests/${requestId}/respond`, {
      action: 'REJECTED',
      owner_response: 'Illegal cross-tenant attempt'
    }, owner2Token);
    assert(crossTenantRespond.status === 403, 'Cross-tenant decision attempt rejected with HTTP 403 Forbidden');

    console.log('\n===================================================================');
    console.log(`🏁 WORK PROPOSAL WORKFLOW TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===================================================================');
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('💥 ERROR RUNNING WORK PROPOSAL TEST:', err);
    process.exit(1);
  }
}

runProposalWorkflowTest();
