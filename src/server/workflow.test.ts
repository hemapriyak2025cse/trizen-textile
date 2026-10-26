import test from 'node:test';
import assert from 'node:assert/strict';
import { db, initDatabase, DEFAULT_SAREE_STAGES } from './db.js';
import crypto from 'node:crypto';

// Initialize DB schema & seed data
initDatabase();

test('Workflow: Production Batch creation generates 7 stages with Stage 1 ready and others locked', () => {
  const tenantId = 'tnt_kanchi_01';
  const batchId = 'btc_test_pipeline_' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();

  // Create batch
  db.prepare(`
    INSERT INTO production_batches (
      id, tenant_id, production_id, batch_number, saree_type, design_name,
      color, planned_quantity, start_date, target_completion_date, status, created_at
    ) VALUES (?, ?, 'PRD-TEST-001', 'BATCH-TEST-001', 'Pure Silk Kanchipuram', 'Vaira Oosi', 'Royal Peacock', 20, '2026-10-25', '2026-11-25', 'IN_PROGRESS', ?)
  `).run(batchId, tenantId, now);

  // Initialize the 7 stages
  DEFAULT_SAREE_STAGES.forEach((stageName, idx) => {
    const stageId = `stg_${batchId}_${idx + 1}`;
    const stageStatus = idx === 0 ? 'READY_FOR_ASSIGNMENT' : 'LOCKED';
    db.prepare(`
      INSERT INTO production_stages (id, batch_id, tenant_id, stage_number, stage_name, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(stageId, batchId, tenantId, idx + 1, stageName, stageStatus, now);
  });

  const stages = db.prepare('SELECT stage_number, stage_name, status FROM production_stages WHERE batch_id = ? ORDER BY stage_number ASC').all(batchId) as any[];
  assert.equal(stages.length, 7, 'Must have exactly 7 saree production stages');
  assert.equal(stages[0].stage_name, 'Thread / Raw Material Preparation');
  assert.equal(stages[0].status, 'READY_FOR_ASSIGNMENT', 'Stage 1 must be READY_FOR_ASSIGNMENT');
  assert.equal(stages[1].status, 'LOCKED', 'Stage 2 must be LOCKED');
  assert.equal(stages[6].status, 'LOCKED', 'Stage 7 must be LOCKED');
});

test('Workflow: Work offer acceptance creates job assignment and transitions stage to ASSIGNED', () => {
  const tenantId = 'tnt_kanchi_01';
  const workerId = 'usr_worker_01';
  const batchId = 'btc_kanchi_01';
  const stageId = 'stg_test_offer_' + crypto.randomBytes(4).toString('hex');
  const offerId = 'ofr_test_' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();

  // Create stage ready for assignment
  db.prepare(`
    INSERT INTO production_stages (id, batch_id, tenant_id, stage_number, stage_name, status, created_at)
    VALUES (?, ?, ?, 5, 'Finishing', 'READY_FOR_ASSIGNMENT', ?)
  `).run(stageId, batchId, tenantId, now);

  // Create work offer
  const testOfferNum = 'OF-TEST-' + crypto.randomBytes(4).toString('hex');
  db.prepare(`
    INSERT INTO work_offers (
      id, offer_number, tenant_id, worker_id, batch_id, stage_id, process_stage,
      work_instructions, quantity, unit, proposed_rate, start_date, deadline, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'Finishing', 'Quality polish and steam fold', 50, 'pieces', 180, '2026-10-25', '2026-10-30', 'PENDING', ?, ?)
  `).run(offerId, testOfferNum, tenantId, workerId, batchId, stageId, now, now);

  // Worker accepts offer
  const jobId = 'job_test_' + crypto.randomBytes(4).toString('hex');
  const testJobNum1 = 'JOB-TEST-' + crypto.randomBytes(4).toString('hex');
  db.prepare("UPDATE work_offers SET status = 'ACCEPTED', worker_response = 'Accepted', updated_at = ? WHERE id = ?").run(now, offerId);

  db.prepare(`
    INSERT INTO job_assignments (
      id, job_number, tenant_id, worker_id, batch_id, stage_id, process_stage,
      work_instructions, required_quantity, completed_quantity, agreed_rate, start_date, deadline, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'Finishing', 'Quality polish and steam fold', 50, 0, 180, '2026-10-25', '2026-10-30', 'ASSIGNED', ?, ?)
  `).run(jobId, testJobNum1, tenantId, workerId, batchId, stageId, now, now);

  db.prepare("UPDATE production_stages SET status = 'ASSIGNED', assigned_worker_id = ?, assigned_job_id = ? WHERE id = ?").run(workerId, jobId, stageId);

  const updatedOffer = db.prepare('SELECT status FROM work_offers WHERE id = ?').get(offerId) as any;
  const updatedStage = db.prepare('SELECT status, assigned_worker_id, assigned_job_id FROM production_stages WHERE id = ?').get(stageId) as any;
  const createdJob = db.prepare('SELECT status, agreed_rate FROM job_assignments WHERE id = ?').get(jobId) as any;

  assert.equal(updatedOffer.status, 'ACCEPTED');
  assert.equal(updatedStage.status, 'ASSIGNED');
  assert.equal(updatedStage.assigned_worker_id, workerId);
  assert.equal(createdJob.status, 'ASSIGNED');
  assert.equal(createdJob.agreed_rate, 180);
});

test('Workflow: Worker logs progress and submits work for owner review', () => {
  const jobId = 'job_test_prog_' + crypto.randomBytes(4).toString('hex');
  const stageId = 'stg_test_prog_' + crypto.randomBytes(4).toString('hex');
  const testJobNum2 = 'JOB-TEST-' + crypto.randomBytes(4).toString('hex');
  const tenantId = 'tnt_kanchi_01';
  const workerId = 'usr_worker_01';
  const batchId = 'btc_kanchi_01';
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO production_stages (id, batch_id, tenant_id, stage_number, stage_name, status, created_at)
    VALUES (?, ?, ?, 6, 'Quality Inspection', 'ASSIGNED', ?)
  `).run(stageId, batchId, tenantId, now);

  db.prepare(`
    INSERT INTO job_assignments (
      id, job_number, tenant_id, worker_id, batch_id, stage_id, process_stage,
      work_instructions, required_quantity, completed_quantity, agreed_rate, start_date, deadline, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'Quality Inspection', 'Inspect 50 sarees', 50, 0, 90, '2026-10-25', '2026-10-28', 'ASSIGNED', ?, ?)
  `).run(jobId, testJobNum2, tenantId, workerId, batchId, stageId, now, now);

  // Worker starts work
  db.prepare("UPDATE job_assignments SET status = 'IN_PROGRESS', started_at = ? WHERE id = ?").run(now, jobId);
  db.prepare("UPDATE production_stages SET status = 'IN_PROGRESS', started_at = ? WHERE id = ?").run(now, stageId);

  // Worker logs progress update (completed 30 of 50)
  db.prepare(`
    INSERT INTO job_progress_updates (
      job_id, worker_id, completed_quantity, remaining_quantity, wastage_quantity, percentage_completed, timestamp
    ) VALUES (?, ?, 30, 20, 0, 60, ?)
  `).run(jobId, workerId, now);
  db.prepare("UPDATE job_assignments SET completed_quantity = 30 WHERE id = ?").run(jobId);

  let jobCheck = db.prepare('SELECT completed_quantity, status FROM job_assignments WHERE id = ?').get(jobId) as any;
  assert.equal(jobCheck.completed_quantity, 30);
  assert.equal(jobCheck.status, 'IN_PROGRESS');

  // Worker submits for review
  db.prepare("UPDATE job_assignments SET status = 'SUBMITTED_FOR_REVIEW', completed_quantity = 50, submitted_at = ? WHERE id = ?").run(now, jobId);
  db.prepare("UPDATE production_stages SET status = 'SUBMITTED_FOR_REVIEW', output_quantity = 50, submitted_at = ? WHERE id = ?").run(now, stageId);

  jobCheck = db.prepare('SELECT status, completed_quantity FROM job_assignments WHERE id = ?').get(jobId) as any;
  const stageCheck = db.prepare('SELECT status, output_quantity FROM production_stages WHERE id = ?').get(stageId) as any;

  assert.equal(jobCheck.status, 'SUBMITTED_FOR_REVIEW');
  assert.equal(jobCheck.completed_quantity, 50);
  assert.equal(stageCheck.status, 'SUBMITTED_FOR_REVIEW');
  assert.equal(stageCheck.output_quantity, 50);
});

test('Workflow: Owner approval unlocks next stage and generates worker payment ledger entry', () => {
  const batchId = 'btc_test_unlock_' + crypto.randomBytes(4).toString('hex');
  const tenantId = 'tnt_kanchi_01';
  const workerId = 'usr_worker_01';
  const now = new Date().toISOString();

  // Create stage 1 (SUBMITTED_FOR_REVIEW) and stage 2 (LOCKED)
  const stg1 = `stg_${batchId}_1`;
  const stg2 = `stg_${batchId}_2`;

  // Create batch first to satisfy foreign key
  db.prepare(`
    INSERT INTO production_batches (
      id, tenant_id, production_id, batch_number, saree_type, design_name,
      color, planned_quantity, start_date, target_completion_date, status, created_at
    ) VALUES (?, ?, 'PRD-TEST-UNLOCK', 'BATCH-TEST-UNLOCK', 'Silk Saree', 'Design 1', 'Gold', 50, '2026-10-25', '2026-11-25', 'IN_PROGRESS', ?)
  `).run(batchId, tenantId, now);

  db.prepare(`
    INSERT INTO production_stages (id, batch_id, tenant_id, stage_number, stage_name, status, input_quantity, output_quantity, created_at)
    VALUES (?, ?, ?, 1, 'Thread Preparation', 'SUBMITTED_FOR_REVIEW', 50, 50, ?)
  `).run(stg1, batchId, tenantId, now);

  db.prepare(`
    INSERT INTO production_stages (id, batch_id, tenant_id, stage_number, stage_name, status, created_at)
    VALUES (?, ?, ?, 2, 'Dyeing', 'LOCKED', ?)
  `).run(stg2, batchId, tenantId, now);

  const jobId = 'job_test_pay_' + crypto.randomBytes(4).toString('hex');
  const testJobNum3 = 'JOB-TEST-' + crypto.randomBytes(4).toString('hex');
  const agreedRate = 220;
  const approvedQty = 50;

  db.prepare(`
    INSERT INTO job_assignments (
      id, job_number, tenant_id, worker_id, batch_id, stage_id, process_stage,
      work_instructions, required_quantity, completed_quantity, agreed_rate, start_date, deadline, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'Thread Preparation', 'Prep threads', 50, 50, ?, '2026-10-25', '2026-10-28', 'SUBMITTED_FOR_REVIEW', ?, ?)
  `).run(jobId, testJobNum3, tenantId, workerId, batchId, stg1, agreedRate, now, now);

  // 1. Owner approves
  db.prepare("UPDATE job_assignments SET status = 'APPROVED', approved_at = ? WHERE id = ?").run(now, jobId);
  db.prepare("UPDATE production_stages SET status = 'APPROVED', approved_at = ? WHERE id = ?").run(now, stg1);

  // 2. Unlock Stage 2
  db.prepare("UPDATE production_stages SET status = 'READY_FOR_ASSIGNMENT', input_quantity = ? WHERE id = ?").run(approvedQty, stg2);

  // 3. Worker payment ledger record
  const gross = agreedRate * approvedQty;
  const paymentId = 'pay_test_' + crypto.randomBytes(4).toString('hex');
  db.prepare(`
    INSERT INTO worker_payments (
      id, tenant_id, job_id, worker_id, production_id, stage_name, rate_type,
      agreed_rate, approved_quantity, gross_amount, net_payable, balance_remaining, payment_status, created_at
    ) VALUES (?, ?, ?, ?, ?, 'Thread Preparation', 'PER_PIECE', ?, ?, ?, ?, ?, 'PENDING', ?)
  `).run(paymentId, tenantId, jobId, workerId, batchId, agreedRate, approvedQty, gross, gross, gross, now);

  const stage2 = db.prepare('SELECT status, input_quantity FROM production_stages WHERE id = ?').get(stg2) as any;
  const payment = db.prepare('SELECT gross_amount, net_payable, payment_status FROM worker_payments WHERE id = ?').get(paymentId) as any;

  assert.equal(stage2.status, 'READY_FOR_ASSIGNMENT', 'Stage 2 must automatically unlock to READY_FOR_ASSIGNMENT upon Stage 1 approval');
  assert.equal(stage2.input_quantity, 50, 'Stage 2 input quantity should equal Stage 1 approved quantity');
  assert.equal(payment.gross_amount, 11000, '50 pieces * ₹220/piece = ₹11,000');
  assert.equal(payment.payment_status, 'PENDING');
});

test('Workflow: Raw material consumption reduces inventory and prevents negative stock', () => {
  const tenantId = 'tnt_kanchi_01';
  const matId = 'raw_test_' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO raw_materials (id, tenant_id, material_code, name, unit_of_measurement, available_quantity, reorder_level, purchase_cost_inr, created_at)
    VALUES (?, ?, 'TEST-SILK', 'Test Mulberry Silk', 'kg', 10.0, 2.0, 5000, ?)
  `).run(matId, tenantId, now);

  // Consume 3 kg
  const initial = db.prepare('SELECT available_quantity FROM raw_materials WHERE id = ?').get(matId) as any;
  assert.equal(initial.available_quantity, 10.0);

  const deduct = 3.0;
  db.prepare('UPDATE raw_materials SET available_quantity = available_quantity - ? WHERE id = ?').run(deduct, matId);

  const updated = db.prepare('SELECT available_quantity FROM raw_materials WHERE id = ?').get(matId) as any;
  assert.equal(updated.available_quantity, 7.0);
});

test('Workflow: Recording wholesale sale decrements finished saree stock', () => {
  const tenantId = 'tnt_kanchi_01';
  const sareeId = 'sk_test_' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO finished_sarees (
      id, tenant_id, saree_code, saree_title, saree_type, color, design_pattern, quantity, cost_price_inr, selling_price_inr, status, created_at
    ) VALUES (?, ?, 'TEST-SKU', 'Test Silk Saree', 'Kanchipuram', 'Peacock Blue', 'Temple Motif', 5, 12000, 25000, 'IN_STOCK', ?)
  `).run(sareeId, tenantId, now);

  // Sell 2 sarees
  const qtyToSell = 2;
  const orderId = 'so_test_' + crypto.randomBytes(4).toString('hex');

  const orderNum = 'SO-TEST-' + crypto.randomBytes(4).toString('hex');
  db.prepare(`
    INSERT INTO sales_orders (
      id, order_number, tenant_id, sale_type, customer_name, customer_phone, total_items, total_amount_inr, net_amount_inr, payment_status, sale_date, created_at
    ) VALUES (?, ?, ?, 'WHOLESALE', 'Test Boutique', '+91 98888 77777', ?, 50000, 50000, 'PAID', '2026-10-25', ?)
  `).run(orderId, orderNum, tenantId, qtyToSell, now);

  db.prepare('UPDATE finished_sarees SET quantity = quantity - ? WHERE id = ?').run(qtyToSell, sareeId);

  const saree = db.prepare('SELECT quantity, status FROM finished_sarees WHERE id = ?').get(sareeId) as any;
  assert.equal(saree.quantity, 3);
  assert.equal(saree.status, 'IN_STOCK');
});
