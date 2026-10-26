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

async function runFullProductionWorkflowTest() {
  console.log('🧪 TESTING FULL 7-STAGE PRODUCTION WORKFLOW (BATCH -> PACKING)');

  try {
    const ownerAuth = await request('POST', '/api/auth/login', { identifier: 'owner_kanchi', password: 'Owner@123' });
    const ownerToken = ownerAuth.data.token;
    
    const workerAuth = await request('POST', '/api/auth/login', { identifier: 'murugan_weaver', password: 'Worker@123' });
    const workerToken = workerAuth.data.token;
    const workerId = workerAuth.data.user.id;

    const batchRes = await request('POST', '/api/workflow/batches', {
      saree_type: 'Kanchipuram Silk',
      design_name: 'Temple Border',
      color: 'Red & Gold',
      planned_quantity: 10,
      start_date: '2026-11-01',
      target_completion_date: '2026-12-01'
    }, ownerToken);
    const batchId = batchRes.data.batch.id;

    for (let stageNum = 1; stageNum <= 7; stageNum++) {
      console.log(`\n--- Stage ${stageNum} ---`);
      
      let batchDetails = await request('GET', `/api/workflow/batches/${batchId}`, null, ownerToken);
      let stage = batchDetails.data.stages.find(s => s.stage_number === stageNum);
      
      const offerRes = await request('POST', '/api/workflow/work-offers', {
        worker_id: workerId,
        batch_id: batchId,
        stage_id: stage.id,
        work_instructions: 'Proceed',
        quantity: 10,
        proposed_rate: 500,
        start_date: '2026-11-01',
        deadline: '2026-12-01'
      }, ownerToken);
      console.log('Offer response:', JSON.stringify(offerRes, null, 2));
      
      const offerId = offerRes.data.offerId;
      const respondRes = await request('POST', `/api/workflow/work-offers/${offerId}/respond`, { action: 'ACCEPTED' }, workerToken);
      console.log('Respond response:', JSON.stringify(respondRes, null, 2));
      
      
      let job = null;
      for (let i = 0; i < 5; i++) {
        const workerJobsRes = await request('GET', '/api/workflow/jobs', null, workerToken);
        job = workerJobsRes.data.jobs.find(j => j.stage_id === stage.id && j.batch_id === batchId);
        if (job) break;
        await new Promise(r => setTimeout(r, 500));
      }
      
      if (!job) {
          throw new Error(`Job for stage ${stage.id} in batch ${batchId} not found.`);
      }
      
      await request('POST', `/api/workflow/jobs/${job.id}/start`, {}, workerToken);
      await request('POST', `/api/workflow/jobs/${job.id}/progress`, { completed_quantity: 10 }, workerToken);
      await request('POST', `/api/workflow/jobs/${job.id}/submit`, {}, workerToken);
      
      await request('POST', `/api/workflow/jobs/${job.id}/review`, { action: 'APPROVE', approved_quantity: 10 }, ownerToken);
      console.log(`  ✅ Stage ${stageNum} completed and approved`);
    }

    console.log(`\n🏁 FULL WORKFLOW TEST PASSED`);
    
  } catch (err) {
    console.error('💥 ERROR RUNNING FULL PRODUCTION WORKFLOW TEST:', err);
    process.exit(1);
  }
}
runFullProductionWorkflowTest();
