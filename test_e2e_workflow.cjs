// E2E Test Suite for TRIZEN Worker-Owner Work Request Workflow
const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

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
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function login(identifier, password) {
  const res = await request('POST', '/api/auth/login', { identifier, password });
  if (res.status !== 200 || !res.data.token) {
    throw new Error(`Login failed for ${identifier}: ${JSON.stringify(res.data)}`);
  }
  return res.data.token;
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 STARTING TRIZEN WORKER-OWNER WORKFLOW E2E TESTS');
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
    // 1. Authenticate users
    console.log('--- Step 0: Authentication ---');
    const workerToken = await login('murugan_weaver', 'Worker@123');
    const worker2Token = await login('selvi_dyer', 'Worker@123');
    const ownerToken = await login('owner_kanchi', 'Owner@123');
    const ownerAraniToken = await login('owner_arani', 'Owner@123');
    console.log('  Authenticated worker (murugan_weaver), worker2 (selvi_dyer), owner (owner_kanchi), and owner2 (owner_arani)\n');

    // TEST A: WORKER REQUEST
    console.log('--- TEST A: Worker Request Creation & Persistence ---');
    
    // A.1: Search registered owners
    const searchRes = await request('GET', '/api/workflow/owners/search?q=Kanchi', null, workerToken);
    assert(searchRes.status === 200, 'Worker searches registered owners returns 200');
    assert(Array.isArray(searchRes.data.owners) && searchRes.data.owners.length > 0, 'Found registered owners list');
    const targetOwner = searchRes.data.owners.find(o => o.id === 'tnt_kanchi_01');
    assert(!!targetOwner, `Owner 'tnt_kanchi_01' found in real database search (Business: ${targetOwner?.business_name})`);

    // A.2: Submit Work Request to target owner
    const createReqRes = await request('POST', '/api/workflow/work-requests', {
      tenant_id: 'tnt_kanchi_01',
      requested_process: 'Weaving / Loom',
      quantity: 3,
      unit: 'pieces',
      proposed_rate_inr: 2500,
      expected_completion_date: '2026-11-20',
      message: 'Master weaver offering 18 years Korvai silk loom experience for bridal orders.'
    }, workerToken);

    assert(createReqRes.status === 201, `Submit work request returned 201 Created (got ${createReqRes.status})`);
    const createdRequestId = createReqRes.data.requestId;
    const createdRequestNumber = createReqRes.data.requestNumber;
    assert(!!createdRequestId, `Request created with ID: ${createdRequestId}`);
    assert(!!createdRequestNumber, `Request created with Number: ${createdRequestNumber}`);

    // A.3: Verify request exists in worker's My Requests list (refresh simulation)
    const workerReqsRes = await request('GET', '/api/workflow/work-requests', null, workerToken);
    assert(workerReqsRes.status === 200, 'Fetch worker requests returns 200');
    const foundInWorkerList = workerReqsRes.data.requests.find(r => r.id === createdRequestId);
    assert(!!foundInWorkerList, 'New request found in worker My Requests list after reload');
    assert(foundInWorkerList?.status === 'PENDING', `Request status is PENDING (got ${foundInWorkerList?.status})`);
    assert(foundInWorkerList?.proposed_rate_inr === 2500, 'Proposed rate saved accurately');
    console.log();

    // TEST B: OWNER ACCEPTANCE
    console.log('--- TEST B: Owner View & Acceptance ---');

    // B.1: Owner fetches incoming requests
    const ownerReqsRes = await request('GET', '/api/workflow/work-requests', null, ownerToken);
    assert(ownerReqsRes.status === 200, 'Owner fetches incoming requests returns 200');
    const foundInOwnerList = ownerReqsRes.data.requests.find(r => r.id === createdRequestId);
    assert(!!foundInOwnerList, 'Created request is visible in owner incoming work requests');
    assert(foundInOwnerList?.worker_name === 'K. Murugan', `Artisan details visible: ${foundInOwnerList?.worker_name}`);

    // B.2: Owner accepts request
    const acceptRes = await request('POST', `/api/workflow/work-requests/${createdRequestId}/respond`, {
      action: 'ACCEPTED',
      owner_response: 'Work proposal accepted. Production job initiated for upcoming wedding order.'
    }, ownerToken);

    assert(acceptRes.status === 200, `Owner accept request returned 200 OK (got ${acceptRes.status})`);
    assert(acceptRes.data.success === true, 'Response payload confirms success: true');
    const assignedJobId = acceptRes.data.jobId;
    const assignedJobNumber = acceptRes.data.jobNumber;
    assert(!!assignedJobId, `Assigned job record created with ID: ${assignedJobId}`);
    assert(!!assignedJobNumber, `Assigned job number generated: ${assignedJobNumber}`);

    // B.3: Verify status is persisted as ACCEPTED
    const ownerReqsAfterAccept = await request('GET', '/api/workflow/work-requests', null, ownerToken);
    const updatedReq = ownerReqsAfterAccept.data.requests.find(r => r.id === createdRequestId);
    assert(updatedReq?.status === 'ACCEPTED', `Saved request status is now ACCEPTED (got ${updatedReq?.status})`);
    console.log();

    // TEST C: WORKER RECEIVES RESULT & LOGS PROGRESS
    console.log('--- TEST C: Worker Receives Job & Logs Progress ---');

    // C.1: Worker checks My Requests - status updated
    const workerReqsAfterAccept = await request('GET', '/api/workflow/work-requests', null, workerToken);
    const workerViewReq = workerReqsAfterAccept.data.requests.find(r => r.id === createdRequestId);
    assert(workerViewReq?.status === 'ACCEPTED', `Worker sees updated status ACCEPTED (got ${workerViewReq?.status})`);

    // C.2: Worker checks My Assigned Work (GET /jobs)
    const workerJobsRes = await request('GET', '/api/workflow/jobs', null, workerToken);
    assert(workerJobsRes.status === 200, 'Worker fetches assigned jobs returns 200');
    const assignedJob = workerJobsRes.data.jobs.find(j => j.id === assignedJobId);
    assert(!!assignedJob, `Job ${assignedJobNumber} appears in My Assigned Work`);
    assert(assignedJob?.agreed_rate_inr === 2500, `Agreed rate matches proposal: ₹${assignedJob?.agreed_rate_inr}`);

    // C.3: Worker starts the job
    const startJobRes = await request('POST', `/api/workflow/jobs/${assignedJobId}/start`, {}, workerToken);
    assert(startJobRes.status === 200, `Worker started job successfully (got ${startJobRes.status})`);

    // C.4: Worker logs progress update
    const progressRes = await request('POST', `/api/workflow/jobs/${assignedJobId}/progress`, {
      quantity_completed: 1,
      progress_notes: 'First pure silk sari border weaving completed on pit loom with temple Korvai.'
    }, workerToken);
    assert(progressRes.status === 200, `Worker submitted progress update (got ${progressRes.status})`);

    // C.5: Owner verifies progress update is reflected
    const ownerBatchesRes = await request('GET', '/api/workflow/batches', null, ownerToken);
    assert(ownerBatchesRes.status === 200, 'Owner loads production batches to view artisan progress');

    // C.6: Worker submits completed work
    const submitJobRes = await request('POST', `/api/workflow/jobs/${assignedJobId}/submit`, {
      output_quantity: 3,
      wastage_quantity: 0.1,
      completion_notes: 'All 3 sarees woven to specification. Ready for owner quality inspection.'
    }, workerToken);
    assert(submitJobRes.status === 200, `Worker submitted work for owner inspection (got ${submitJobRes.status})`);
    console.log();

    // TEST D: NEGATIVE CASES & SECURITY CHECKS
    console.log('--- TEST D: Negative Cases, Security, & Tenant Isolation ---');

    // D.1: Prevent repeated acceptance of already accepted request
    const doubleAcceptRes = await request('POST', `/api/workflow/work-requests/${createdRequestId}/respond`, {
      action: 'ACCEPTED',
      owner_response: 'Attempting duplicate accept'
    }, ownerToken);
    assert(doubleAcceptRes.status === 400 && doubleAcceptRes.data.error === 'REQUEST_ALREADY_ACCEPTED',
      `Duplicate accept safely rejected with 400 REQUEST_ALREADY_ACCEPTED (got ${doubleAcceptRes.status} ${doubleAcceptRes.data?.error})`);

    // D.2: Tenant Isolation - Another owner (owner_arani) cannot accept/respond to Kanchi request
    const foreignOwnerRes = await request('POST', `/api/workflow/work-requests/${createdRequestId}/respond`, {
      action: 'REJECTED',
      owner_response: 'Unauthorized attempt from another tenant'
    }, ownerAraniToken);
    assert(foreignOwnerRes.status === 403 && foreignOwnerRes.data.error === 'TENANT_ISOLATION_VIOLATION',
      `Cross-tenant request response blocked with 403 TENANT_ISOLATION_VIOLATION (got ${foreignOwnerRes.status})`);

    // D.3: Foreign owner does NOT see Kanchi owner's private incoming requests
    const foreignReqsRes = await request('GET', '/api/workflow/work-requests', null, ownerAraniToken);
    const foreignSeesPrivate = foreignReqsRes.data.requests.some(r => r.id === createdRequestId);
    assert(!foreignSeesPrivate, 'Foreign owner cannot view another business incoming requests');

    // D.4: Cross-worker job access - Another worker (selvi_dyer) cannot start or log progress on Murugan\'s job
    const unauthorizedJobProgressRes = await request('POST', `/api/workflow/jobs/${assignedJobId}/progress`, {
      quantity_completed: 1,
      progress_notes: 'Imposter progress update'
    }, worker2Token);
    assert(unauthorizedJobProgressRes.status === 403 && unauthorizedJobProgressRes.data.error === 'FORBIDDEN',
      `Cross-worker job progress blocked with 403 FORBIDDEN (got ${unauthorizedJobProgressRes.status})`);

    // D.5: Reject flow verification
    console.log('  Testing Rejection Flow:');
    const rejectReqRes = await request('POST', '/api/workflow/work-requests', {
      tenant_id: 'tnt_kanchi_01',
      requested_process: 'Yarn Dyeing',
      quantity: 10,
      unit: 'kg',
      proposed_rate_inr: 400,
      message: 'Offering yarn dyeing capacity'
    }, workerToken);
    const rejectReqId = rejectReqRes.data.requestId;

    const doRejectRes = await request('POST', `/api/workflow/work-requests/${rejectReqId}/respond`, {
      action: 'REJECTED',
      owner_response: 'Dye house capacity fully booked for this month.'
    }, ownerToken);
    assert(doRejectRes.status === 200, `Reject action returned 200 OK (got ${doRejectRes.status})`);

    // Check worker sees rejection
    const workerReqsAfterReject = await request('GET', '/api/workflow/work-requests', null, workerToken);
    const rejectedReqItem = workerReqsAfterReject.data.requests.find(r => r.id === rejectReqId);
    assert(rejectedReqItem?.status === 'REJECTED', `Worker sees REJECTED status (got ${rejectedReqItem?.status})`);
    assert(rejectedReqItem?.owner_response_note?.includes('fully booked'), 'Owner rejection reason saved and displayed');

    // D.6: Clarification / Request Info flow & Worker reply
    console.log('  Testing Clarification / Info Requested Flow:');
    const infoReqRes = await request('POST', '/api/workflow/work-requests', {
      tenant_id: 'tnt_kanchi_01',
      requested_process: 'Warping (Vaarpu)',
      quantity: 5,
      unit: 'warps',
      proposed_rate_inr: 500,
      message: 'Offering drum warping'
    }, workerToken);
    const infoReqId = infoReqRes.data.requestId;

    // Owner requests more info
    const doInfoRes = await request('POST', `/api/workflow/work-requests/${infoReqId}/respond`, {
      action: 'INFO_REQUESTED',
      owner_response: 'Can you handle 4000 ends pure silk warp on our beams?'
    }, ownerToken);
    assert(doInfoRes.status === 200, `Request Info returned 200 OK (got ${doInfoRes.status})`);

    // Worker checks status is INFO_REQUESTED
    const workerReqsAfterInfo = await request('GET', '/api/workflow/work-requests', null, workerToken);
    const infoReqItem = workerReqsAfterInfo.data.requests.find(r => r.id === infoReqId);
    assert(infoReqItem?.status === 'INFO_REQUESTED', `Worker sees INFO_REQUESTED status (got ${infoReqItem?.status})`);

    // Worker replies to clarification
    const replyRes = await request('POST', `/api/workflow/work-requests/${infoReqId}/reply`, {
      reply_message: 'Yes, confirmed. I have standard horizontal beaming frame for up to 4800 ends.'
    }, workerToken);
    assert(replyRes.status === 200, `Worker clarification reply returned 200 OK (got ${replyRes.status})`);

    // Owner checks status returned to PENDING with updated message
    const ownerReqsAfterReply = await request('GET', '/api/workflow/work-requests', null, ownerToken);
    const repliedReqItem = ownerReqsAfterReply.data.requests.find(r => r.id === infoReqId);
    assert(repliedReqItem?.status === 'PENDING', `Status transitioned back to PENDING after reply (got ${repliedReqItem?.status})`);
    assert(repliedReqItem?.message?.includes('4800 ends'), 'Artisan reply appended to proposal message for owner review');

    // D.7: Validation of missing required fields
    const invalidRes = await request('POST', '/api/workflow/work-requests', {
      tenant_id: 'tnt_kanchi_01'
      // missing requested_process and quantity
    }, workerToken);
    assert(invalidRes.status === 400 && invalidRes.data.error === 'MISSING_FIELDS',
      `Invalid request rejected with 400 MISSING_FIELDS (got ${invalidRes.status})`);

    console.log('\n====================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('💥 UNEXPECTED ERROR IN TEST SUITE:', error);
    process.exit(1);
  }
}

runTests();
