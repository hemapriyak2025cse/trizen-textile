import { Router, Response } from 'express';
import { db, DEFAULT_SAREE_STAGES } from './db.js';
import { authenticate, recordAuditLog, AuthenticatedRequest } from './auth.js';
import crypto from 'node:crypto';

export const workflowRouter = Router();

// All workflow routes require valid session authentication
workflowRouter.use(authenticate);

// Helper to send in-app notification
function sendNotification(tenantId: string | null, userId: string, title: string, message: string, type = 'INFO', link?: string) {
  const notifId = 'ntf_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO notifications (id, tenant_id, user_id, title, message, type, link, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(notifId, tenantId, userId, title, message, type, link || null, now);
}

// Helper for globally unique sequence numbers across all tenants and tables
function generateUniqueSequenceNumber(table: string, column: string, prefix: string): string {
  const year = new Date().getFullYear();
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
  let seq = countRow.count + 1;
  while (true) {
    const candidate = `${prefix}-${year}-${seq.toString().padStart(3, '0')}`;
    const exists = db.prepare(`SELECT 1 FROM ${table} WHERE ${column} = ?`).get(candidate);
    if (!exists) {
      return candidate;
    }
    seq++;
  }
}

function generateUniqueBatchNumber(sareeType: string): { productionId: string; batchNumber: string } {
  const year = new Date().getFullYear();
  const countRow = db.prepare('SELECT COUNT(*) as count FROM production_batches').get() as { count: number };
  let seq = countRow.count + 1;
  const tag = (sareeType || 'BTC').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  while (true) {
    const numStr = seq.toString().padStart(3, '0');
    const prodId = `PRD-${year}-${numStr}`;
    const batchNum = `BATCH-${year}-${tag}-${numStr}`;
    const exists = db.prepare('SELECT 1 FROM production_batches WHERE production_id = ? OR batch_number = ?').get(prodId, batchNum);
    if (!exists) {
      return { productionId: prodId, batchNumber: batchNum };
    }
    seq++;
  }
}

// ==========================================
// 1. PRODUCTION BATCHES & 7-STAGE PIPELINE
// ==========================================

// List batches for current tenant
workflowRouter.get('/batches', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'OWNER' && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only textile owners can view production batches.' });
    return;
  }

  const tenantId = req.user!.tenant_id;
  if (!tenantId) {
    res.status(400).json({ error: 'NO_TENANT', message: 'Owner user has no assigned tenant.' });
    return;
  }

  const batches = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM production_stages WHERE batch_id = b.id) as total_stages,
      (SELECT COUNT(*) FROM production_stages WHERE batch_id = b.id AND status = 'APPROVED') as completed_stages,
      (SELECT stage_name FROM production_stages WHERE batch_id = b.id AND status IN ('READY_FOR_ASSIGNMENT', 'WORK_OFFERED', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'REWORK_REQUIRED') ORDER BY stage_number ASC LIMIT 1) as active_stage_name
    FROM production_batches b
    WHERE b.tenant_id = ?
    ORDER BY b.created_at DESC
  `).all(tenantId);

  res.json({ batches });
});

// Search for workers eligible for a specific production stage
workflowRouter.get('/workers/eligible', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'OWNER' && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only owners can search for eligible workers.' });
    return;
  }

  const stageName = req.query.stage_name as string;
  
  let sql = `
    SELECT id, full_name, username, email, phone, location, address,
           status, skills, experience_years, loom_type, daily_capacity,
           availability, created_at
    FROM users
    WHERE role = 'WORKER' AND status = 'APPROVED'
  `;
  const params: any[] = [];

  if (stageName) {
    // Basic keyword matching for skills
    sql += ` AND (skills LIKE ? OR skills LIKE ?)`;
    params.push(`%${stageName}%`, `%${stageName.split(' / ')[0]}%`);
  }

  sql += ` ORDER BY full_name ASC`;
  
  const workers = db.prepare(sql).all(...params) as any[];
  const formatted = workers.map(w => {
    let parsedSkills = [];
    try {
      parsedSkills = JSON.parse(w.skills || '[]');
    } catch {
      parsedSkills = [w.skills];
    }
    return { ...w, skills: parsedSkills };
  });

  res.json({ workers: formatted });
});

// Create new production batch starting at Step 1
workflowRouter.post('/batches', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'OWNER') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only textile owners can start new production batches.' });
    return;
  }

  const tenantId = req.user!.tenant_id;
  const {
    saree_type,
    design_name,
    color,
    border_details,
    planned_quantity,
    unit_of_measure = 'pieces',
    start_date,
    target_completion_date,
    notes,
    raw_material_details
  } = req.body;

  if (!saree_type || !design_name || !color || !planned_quantity || !start_date || !target_completion_date) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Missing required batch fields (saree type, design, color, quantity, dates).' });
    return;
  }

  const batchId = 'btc_' + crypto.randomBytes(6).toString('hex');
  const { productionId, batchNumber } = generateUniqueBatchNumber(saree_type);
  const now = new Date().toISOString();

  // Insert batch
  db.prepare(`
    INSERT INTO production_batches (
      id, tenant_id, production_id, batch_number, saree_type, design_name,
      color, border_details, planned_quantity, unit_of_measure, start_date,
      target_completion_date, status, raw_material_details, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?, ?)
  `).run(
    batchId,
    tenantId,
    productionId,
    batchNumber,
    saree_type,
    design_name,
    color,
    border_details || null,
    Number(planned_quantity),
    unit_of_measure,
    start_date,
    target_completion_date,
    raw_material_details ? JSON.stringify(raw_material_details) : null,
    notes || null,
    now
  );

  // Initialize the 7 stages: Stage 1 is READY_FOR_ASSIGNMENT, remaining 6 are LOCKED
  DEFAULT_SAREE_STAGES.forEach((stageName, idx) => {
    const stageId = `stg_${batchId}_${idx + 1}`;
    const stageNumber = idx + 1;
    const stageStatus = idx === 0 ? 'READY_FOR_ASSIGNMENT' : 'LOCKED';
    const inputQty = idx === 0 ? Number(planned_quantity) : null;

    db.prepare(`
      INSERT INTO production_stages (
        id, batch_id, tenant_id, stage_number, stage_name, input_quantity,
        output_quantity, wastage_quantity, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `).run(stageId, batchId, tenantId, stageNumber, stageName, inputQty, stageStatus, now);
  });

  recordAuditLog(
    tenantId,
    req.user!.id,
    req.user!.username,
    'OWNER',
    'PRODUCTION_BATCH_CREATED',
    'BATCH',
    batchId,
    `Started batch ${batchNumber} (${saree_type} - ${design_name}) with 7 stages`,
    req.ip || '127.0.0.1'
  );

  const created = db.prepare('SELECT * FROM production_batches WHERE id = ?').get(batchId);
  const stages = db.prepare('SELECT * FROM production_stages WHERE batch_id = ? ORDER BY stage_number ASC').all(batchId);

  res.status(201).json({
    success: true,
    message: 'Production batch created successfully starting at Stage 1.',
    batch: created,
    stages
  });
});

// Get single batch with full 7-stage details and associated jobs
workflowRouter.get('/batches/:id', (req: AuthenticatedRequest, res: Response) => {
  const batchId = req.params.id;
  const batch = db.prepare('SELECT * FROM production_batches WHERE id = ?').get(batchId) as any;

  if (!batch) {
    res.status(404).json({ error: 'BATCH_NOT_FOUND', message: 'Batch not found.' });
    return;
  }

  // Tenant isolation check: Owners can only see their own batches
  if (req.user!.role === 'OWNER' && batch.tenant_id !== req.user!.tenant_id) {
    res.status(403).json({ error: 'TENANT_ISOLATION_VIOLATION', message: 'Cannot access production batch of another tenant.' });
    return;
  }

  const stages = db.prepare(`
    SELECT s.*,
           u.full_name as worker_name,
           u.phone as worker_phone,
           j.id as job_id,
           j.job_number,
           j.completed_quantity as job_completed_qty,
           j.status as job_status
    FROM production_stages s
    LEFT JOIN users u ON s.assigned_worker_id = u.id
    LEFT JOIN job_assignments j ON s.assigned_job_id = j.id
    WHERE s.batch_id = ?
    ORDER BY s.stage_number ASC
  `).all(batchId);

  res.json({ batch, stages });
});

// ==========================================
// 2. WORK OFFERS (OWNER -> WORKER)
// ==========================================

// List work offers
workflowRouter.get('/work-offers', (req: AuthenticatedRequest, res: Response) => {
  const role = req.user!.role;

  if (role === 'OWNER') {
    const tenantId = req.user!.tenant_id;
    const offers = db.prepare(`
      SELECT o.*,
             u.full_name as worker_name,
             u.phone as worker_phone,
             u.location as worker_location,
             b.batch_number,
             b.saree_type,
             b.design_name
      FROM work_offers o
      JOIN users u ON o.worker_id = u.id
      JOIN production_batches b ON o.batch_id = b.id
      WHERE o.tenant_id = ?
      ORDER BY o.created_at DESC
    `).all(tenantId);
    res.json({ offers });
  } else if (role === 'WORKER') {
    const offers = db.prepare(`
      SELECT o.*,
             t.business_name,
             t.location as business_location,
             b.batch_number,
             b.saree_type,
             b.design_name
      FROM work_offers o
      JOIN tenants t ON o.tenant_id = t.id
      JOIN production_batches b ON o.batch_id = b.id
      WHERE o.worker_id = ?
      ORDER BY o.created_at DESC
    `).all(req.user!.id);
    res.json({ offers });
  } else {
    res.status(403).json({ error: 'FORBIDDEN' });
  }
});

// Owner sends work offer to a worker
workflowRouter.post('/work-offers', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'OWNER') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only textile owners can send work offers.' });
    return;
  }

  const tenantId = req.user!.tenant_id;
  const {
    worker_id,
    batch_id,
    stage_id,
    work_instructions,
    quantity,
    unit = 'pieces',
    proposed_rate,
    rate_type = 'PER_PIECE',
    start_date,
    deadline,
    materials_provided,
    quality_requirements
  } = req.body;

  if (!worker_id || !batch_id || !stage_id || !work_instructions || !quantity || !proposed_rate || !start_date || !deadline) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Missing required work offer details.' });
    return;
  }

  // Verify stage exists and belongs to owner's tenant
  const stage = db.prepare('SELECT * FROM production_stages WHERE id = ? AND batch_id = ? AND tenant_id = ?').get(stage_id, batch_id, tenantId) as any;
  if (!stage) {
    res.status(404).json({ error: 'STAGE_NOT_FOUND', message: 'Stage not found in this production batch.' });
    return;
  }

  if (stage.status !== 'READY_FOR_ASSIGNMENT' && stage.status !== 'WORK_OFFERED' && stage.status !== 'REWORK_REQUIRED') {
    res.status(400).json({
      error: 'STAGE_NOT_READY',
      message: `Stage '${stage.stage_name}' is currently '${stage.status}'. Work offers can only be sent when a stage is READY_FOR_ASSIGNMENT or REWORK_REQUIRED.`
    });
    return;
  }

  // Verify worker exists and is approved
  const worker = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'WORKER'").get(worker_id) as any;
  if (!worker) {
    res.status(404).json({ error: 'WORKER_NOT_FOUND', message: 'Selected worker does not exist.' });
    return;
  }

  const offerId = 'ofr_' + crypto.randomBytes(6).toString('hex');
  const offerNumber = generateUniqueSequenceNumber('work_offers', 'offer_number', 'OF');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO work_offers (
      id, offer_number, tenant_id, worker_id, batch_id, stage_id, process_stage,
      work_instructions, quantity, unit, proposed_rate, rate_type, start_date,
      deadline, materials_provided, quality_requirements, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(
    offerId,
    offerNumber,
    tenantId,
    worker_id,
    batch_id,
    stage_id,
    stage.stage_name,
    work_instructions,
    Number(quantity),
    unit,
    Number(proposed_rate),
    rate_type,
    start_date,
    deadline,
    materials_provided || null,
    quality_requirements || null,
    now,
    now
  );

  // Update stage status to WORK_OFFERED
  db.prepare("UPDATE production_stages SET status = 'WORK_OFFERED', agreed_rate_inr = ? WHERE id = ?").run(Number(proposed_rate), stage_id);

  // Send notification to worker
  const tenant = db.prepare('SELECT business_name FROM tenants WHERE id = ?').get(tenantId) as any;
  sendNotification(
    tenantId,
    worker_id,
    'New Work Offer Received',
    `${tenant?.business_name || 'A textile owner'} sent you an offer for ${stage.stage_name} (${quantity} ${unit} at ₹${proposed_rate}/${unit}).`,
    'INFO',
    `/work-offers`
  );

  recordAuditLog(
    tenantId,
    req.user!.id,
    req.user!.username,
    'OWNER',
    'WORK_OFFER_SENT',
    'WORK_OFFER',
    offerId,
    `Sent offer ${offerNumber} for stage '${stage.stage_name}' to worker ${worker.full_name}`,
    req.ip || '127.0.0.1'
  );

  res.status(201).json({
    success: true,
    message: `Work offer sent to ${worker.full_name}.`,
    offerId,
    offerNumber
  });
});

// Worker responds to work offer (ACCEPT, DECLINE, CHANGES_REQUESTED)
workflowRouter.post('/work-offers/:id/respond', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'WORKER') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only workers can respond to work offers.' });
    return;
  }

  const offerId = req.params.id;
  const { action, worker_response } = req.body; // action: 'ACCEPTED' | 'DECLINED' | 'CHANGES_REQUESTED'

  if (!['ACCEPTED', 'DECLINED', 'CHANGES_REQUESTED'].includes(action)) {
    res.status(400).json({ error: 'INVALID_ACTION', message: 'Action must be ACCEPTED, DECLINED, or CHANGES_REQUESTED.' });
    return;
  }

  const offer = db.prepare('SELECT * FROM work_offers WHERE id = ? AND worker_id = ?').get(offerId, req.user!.id) as any;
  if (!offer) {
    res.status(404).json({ error: 'OFFER_NOT_FOUND', message: 'Work offer not found or not addressed to you.' });
    return;
  }

  if (offer.status !== 'PENDING') {
    res.status(400).json({ error: 'OFFER_ALREADY_RESOLVED', message: `This offer is already ${offer.status}.` });
    return;
  }

  const now = new Date().toISOString();

  if (action === 'ACCEPTED') {
    // 1. Update offer status
    db.prepare('UPDATE work_offers SET status = ?, worker_response = ?, updated_at = ? WHERE id = ?').run(
      'ACCEPTED',
      worker_response || 'Offer accepted by artisan.',
      now,
      offerId
    );

    // 2. Prevent duplicate active job assignment on same batch & stage
    const existingJob = db.prepare('SELECT id FROM job_assignments WHERE batch_id = ? AND stage_id = ?').get(offer.batch_id, offer.stage_id) as any;

    let jobId = existingJob?.id;
    let jobNumber = '';

    if (!existingJob) {
      jobId = 'job_' + crypto.randomBytes(6).toString('hex');
      jobNumber = generateUniqueSequenceNumber('job_assignments', 'job_number', 'JOB');

      db.prepare(`
        INSERT INTO job_assignments (
          id, job_number, tenant_id, worker_id, batch_id, stage_id, process_stage,
          work_instructions, required_quantity, completed_quantity, agreed_rate,
          rate_type, start_date, deadline, materials_provided, quality_requirements,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, ?)
      `).run(
        jobId,
        jobNumber,
        offer.tenant_id,
        req.user!.id,
        offer.batch_id,
        offer.stage_id,
        offer.process_stage,
        offer.work_instructions,
        offer.quantity,
        offer.proposed_rate,
        offer.rate_type,
        offer.start_date,
        offer.deadline,
        offer.materials_provided,
        offer.quality_requirements,
        now,
        now
      );
    }

    // 3. Update stage status to ASSIGNED with worker ID and job ID
    db.prepare(`
      UPDATE production_stages
      SET status = 'ASSIGNED',
          assigned_worker_id = ?,
          assigned_job_id = ?,
          agreed_rate_inr = ?
      WHERE id = ?
    `).run(req.user!.id, jobId, offer.proposed_rate, offer.stage_id);

    // 4. Notify owner
    const ownerUser = db.prepare('SELECT id FROM users WHERE tenant_id = ? AND role = ?').get(offer.tenant_id, 'OWNER') as any;
    if (ownerUser) {
      sendNotification(
        offer.tenant_id,
        ownerUser.id,
        'Work Offer Accepted',
        `${req.user!.full_name} accepted offer ${offer.offer_number} for ${offer.process_stage}. Job ${jobNumber} has been created.`,
        'SUCCESS',
        `/batches/${offer.batch_id}`
      );
    }

    recordAuditLog(
      offer.tenant_id,
      req.user!.id,
      req.user!.username,
      'WORKER',
      'WORK_OFFER_ACCEPTED',
      'JOB_ASSIGNMENT',
      jobId,
      `Worker accepted offer ${offer.offer_number}; job assignment ${jobNumber} established`,
      req.ip || '127.0.0.1'
    );

    res.json({
      success: true,
      message: 'Work offer accepted! Job assignment established.',
      jobId,
      jobNumber
    });
  } else {
    // DECLINED or CHANGES_REQUESTED
    db.prepare('UPDATE work_offers SET status = ?, worker_response = ?, updated_at = ? WHERE id = ?').run(
      action,
      worker_response || null,
      now,
      offerId
    );

    // Revert stage back to READY_FOR_ASSIGNMENT so owner can re-assign
    db.prepare("UPDATE production_stages SET status = 'READY_FOR_ASSIGNMENT' WHERE id = ? AND status = 'WORK_OFFERED'").run(offer.stage_id);

    const ownerUser = db.prepare('SELECT id FROM users WHERE tenant_id = ? AND role = ?').get(offer.tenant_id, 'OWNER') as any;
    if (ownerUser) {
      sendNotification(
        offer.tenant_id,
        ownerUser.id,
        action === 'DECLINED' ? 'Work Offer Declined' : 'Work Offer Changes Requested',
        `${req.user!.full_name} ${action === 'DECLINED' ? 'declined' : 'requested adjustments on'} offer ${offer.offer_number}: "${worker_response || 'No specific note'}"`,
        'INFO',
        `/work-offers`
      );
    }

    res.json({
      success: true,
      message: `Work offer marked as ${action}.`
    });
  }
});

// ==========================================
// 3. WORK REQUESTS (WORKER -> OWNER)
// ==========================================

// Search registered owners for work requests
workflowRouter.get('/owners/search', (req: AuthenticatedRequest, res: Response) => {
  const q = ((req.query.q || req.query.query || '') as string).toLowerCase().trim();
  const location = ((req.query.location || '') as string).toLowerCase().trim();

  let query = `
    SELECT t.id, t.business_name, t.slug, t.location, t.registration_number,
           t.textile_specialization, t.loom_count, t.loom_types,
           u.full_name as owner_name, u.phone as owner_phone, u.email as owner_email
    FROM tenants t
    JOIN users u ON t.owner_user_id = u.id
    WHERE u.status = 'APPROVED'
  `;
  const params: any[] = [];

  if (q) {
    query += ` AND (LOWER(t.business_name) LIKE ? OR LOWER(t.textile_specialization) LIKE ? OR LOWER(t.location) LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (location) {
    query += ` AND LOWER(t.location) LIKE ?`;
    params.push(`%${location}%`);
  }

  query += ` ORDER BY t.business_name ASC`;
  const owners = db.prepare(query).all(...params);
  res.json({ owners, businesses: owners });
});

// List work requests
workflowRouter.get('/work-requests', (req: AuthenticatedRequest, res: Response) => {
  const role = req.user!.role;

  if (role === 'WORKER') {
    const requests = db.prepare(`
      SELECT r.*,
             r.proposed_rate as proposed_rate_inr,
             r.expected_completion as expected_completion_date,
             r.owner_response as owner_response_note,
             t.business_name,
             t.location as business_location
      FROM work_requests r
      JOIN tenants t ON r.tenant_id = t.id
      WHERE r.worker_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user!.id);
    res.json({ requests });
  } else if (role === 'OWNER') {
    const requests = db.prepare(`
      SELECT r.*,
             r.proposed_rate as proposed_rate_inr,
             r.expected_completion as expected_completion_date,
             r.owner_response as owner_response_note,
             u.full_name as worker_name,
             u.phone as worker_phone,
             u.location as worker_location,
             u.skills as worker_skills,
             u.experience_years as worker_experience,
             u.experience_years as worker_experience_years
      FROM work_requests r
      JOIN users u ON r.worker_id = u.id
      WHERE r.tenant_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user!.tenant_id);
    res.json({ requests });
  } else {
    res.status(403).json({ error: 'FORBIDDEN' });
  }
});

// Worker sends work request to a tenant
workflowRouter.post('/work-requests', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'WORKER') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only workers can submit work requests.' });
    return;
  }

  try {
    const {
      tenant_id,
      requested_process,
      quantity,
      unit = 'pieces',
      proposed_rate,
      proposed_rate_inr,
      expected_completion,
      expected_completion_date,
      message
    } = req.body;

    if (!tenant_id || !requested_process || !quantity) {
      res.status(400).json({ error: 'MISSING_FIELDS', message: 'Missing required work request details (tenant_id, requested_process, quantity).' });
      return;
    }

    const finalRate = proposed_rate_inr !== undefined && proposed_rate_inr !== null ? Number(proposed_rate_inr) : (proposed_rate ? Number(proposed_rate) : null);
    const finalExpected = expected_completion_date || expected_completion || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id) as any;
    if (!tenant) {
      res.status(404).json({ error: 'TENANT_NOT_FOUND', message: 'Selected textile business not found.' });
      return;
    }

    const requestId = 'req_' + crypto.randomBytes(6).toString('hex');
    const requestNumber = generateUniqueSequenceNumber('work_requests', 'request_number', 'WR');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO work_requests (
        id, request_number, tenant_id, worker_id, requested_process, work_type,
        quantity, unit, proposed_rate, expected_completion, message, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'Contract Piece-Rate', ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `).run(
      requestId,
      requestNumber,
      tenant_id,
      req.user!.id,
      requested_process,
      Number(quantity),
      unit,
      finalRate,
      finalExpected,
      message || null,
      now,
      now
    );

    const ownerUser = db.prepare("SELECT id FROM users WHERE tenant_id = ? AND role = 'OWNER'").get(tenant_id) as any;
    if (ownerUser) {
      sendNotification(
        tenant_id,
        ownerUser.id,
        'New Worker Request Received',
        `${req.user!.full_name} submitted a work request for ${requested_process} (${quantity} ${unit}).`,
        'INFO',
        `/work-requests`
      );
    }

    res.status(201).json({
      success: true,
      message: `Work request sent to ${tenant.business_name}.`,
      requestId,
      requestNumber
    });
  } catch (err: any) {
    console.error('Error in POST /work-requests:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Failed to submit work request.' });
  }
});

// Owner responds to work request (ACCEPT, REJECT, INFO_REQUESTED)
workflowRouter.post('/work-requests/:id/respond', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'OWNER') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only textile owners can respond to worker requests.' });
    return;
  }

  const requestId = req.params.id;
  const { action, owner_response } = req.body; // 'ACCEPTED' | 'REJECTED' | 'INFO_REQUESTED'

  if (!['ACCEPTED', 'REJECTED', 'INFO_REQUESTED'].includes(action)) {
    res.status(400).json({ error: 'INVALID_ACTION', message: 'Action must be ACCEPTED, REJECTED, or INFO_REQUESTED.' });
    return;
  }

  // 1. Fetch request and enforce strict tenant isolation
  const request = db.prepare('SELECT * FROM work_requests WHERE id = ?').get(requestId) as any;
  if (!request) {
    res.status(404).json({ error: 'REQUEST_NOT_FOUND', message: 'Work request not found.' });
    return;
  }

  if (request.tenant_id !== req.user!.tenant_id) {
    res.status(403).json({
      error: 'TENANT_ISOLATION_VIOLATION',
      message: 'Access Denied: You cannot accept or modify work requests addressed to another textile business.'
    });
    return;
  }

  // 2. Validate current status to prevent duplicate actions or repeated acceptance
  if (request.status === 'ACCEPTED') {
    res.status(400).json({
      error: 'REQUEST_ALREADY_ACCEPTED',
      message: 'This work request has already been accepted and assigned.'
    });
    return;
  }

  if (request.status === 'REJECTED') {
    res.status(400).json({
      error: 'REQUEST_ALREADY_REJECTED',
      message: 'This work request has already been rejected.'
    });
    return;
  }

  const now = new Date().toISOString();

  if (action === 'ACCEPTED') {
    // 3. Anchor or assign to a production batch and stage
    let targetStage = db.prepare(`
      SELECT s.id as stage_id, s.batch_id, s.stage_name, b.batch_number, b.saree_type
      FROM production_stages s
      JOIN production_batches b ON s.batch_id = b.id
      WHERE s.tenant_id = ?
        AND (s.stage_name LIKE ? OR s.stage_name = ?)
        AND s.assigned_job_id IS NULL
        AND s.status IN ('READY_FOR_ASSIGNMENT', 'LOCKED', 'WORK_OFFERED')
      ORDER BY b.created_at DESC, s.stage_number ASC
      LIMIT 1
    `).get(request.tenant_id, `%${request.requested_process}%`, request.requested_process) as any;

    if (!targetStage) {
      targetStage = db.prepare(`
        SELECT s.id as stage_id, s.batch_id, s.stage_name, b.batch_number, b.saree_type
        FROM production_stages s
        JOIN production_batches b ON s.batch_id = b.id
        WHERE s.tenant_id = ?
          AND s.assigned_job_id IS NULL
          AND s.status IN ('READY_FOR_ASSIGNMENT', 'LOCKED', 'WORK_OFFERED')
        ORDER BY b.created_at DESC, s.stage_number ASC
        LIMIT 1
      `).get(request.tenant_id) as any;
    }

    // If no available stage exists, initialize a dedicated batch for this custom artisan run
    if (!targetStage) {
      const newBatchId = 'btc_' + crypto.randomBytes(6).toString('hex');
      const { productionId: prodId, batchNumber } = generateUniqueBatchNumber('Artisan');
      const todayStr = new Date().toISOString().split('T')[0];
      const deadlineStr = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      db.prepare(`
        INSERT INTO production_batches (
          id, tenant_id, production_id, batch_number, saree_type, design_name,
          color, border_details, planned_quantity, unit_of_measure, start_date,
          target_completion_date, status, created_at
        ) VALUES (?, ?, ?, ?, 'Kanchipuram Silk Saree', 'Artisan Handloom Project', 'Crimson & Pure Gold Zari', 'Temple Korvai', ?, 'pieces', ?, ?, 'IN_PROGRESS', ?)
      `).run(newBatchId, request.tenant_id, prodId, batchNumber, request.quantity, todayStr, deadlineStr, now);

      const stageNames = [
        'Thread / Raw Material Preparation',
        'Dyeing',
        'Warping (Vaarpu)',
        'Weaving / Loom',
        'Finishing',
        'Quality Inspection',
        'Finished Stock / Ready for Sale'
      ];

      for (let i = 0; i < stageNames.length; i++) {
        const stgId = `stg_${newBatchId}_${i + 1}`;
        db.prepare(`
          INSERT INTO production_stages (
            id, batch_id, tenant_id, stage_number, stage_name, input_quantity, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(stgId, newBatchId, request.tenant_id, i + 1, stageNames[i], request.quantity, i === 0 ? 'READY_FOR_ASSIGNMENT' : 'LOCKED', now);
      }

      targetStage = db.prepare(`
        SELECT s.id as stage_id, s.batch_id, s.stage_name, b.batch_number, b.saree_type
        FROM production_stages s
        JOIN production_batches b ON s.batch_id = b.id
        WHERE s.batch_id = ? AND (s.stage_name LIKE ? OR s.stage_number = 1)
        LIMIT 1
      `).get(newBatchId, `%${request.requested_process}%`) as any;
    }

    // 4. Create the assigned job
    const jobId = 'job_' + crypto.randomBytes(6).toString('hex');
    const jobNumber = generateUniqueSequenceNumber('job_assignments', 'job_number', 'JOB');
    const agreedRate = Number(request.proposed_rate) || 2400;
    const startDate = new Date().toISOString().split('T')[0];
    const deadlineDate = request.expected_completion || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO job_assignments (
        id, job_number, tenant_id, worker_id, batch_id, stage_id, process_stage,
        work_instructions, required_quantity, completed_quantity, agreed_rate,
        rate_type, start_date, deadline, materials_provided, quality_requirements,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'PER_PIECE', ?, ?, 'Silk yarn beams and gold zari spools provided at weaver loft', 'Silk Mark standard, zero reed marks', 'ASSIGNED', ?, ?)
    `).run(
      jobId,
      jobNumber,
      request.tenant_id,
      request.worker_id,
      targetStage.batch_id,
      targetStage.stage_id,
      request.requested_process,
      request.message || `Artisan job for ${request.requested_process} (${request.quantity} ${request.unit})`,
      request.quantity,
      agreedRate,
      startDate,
      deadlineDate,
      now,
      now
    );

    // 5. Update stage with assigned worker and job
    db.prepare(`
      UPDATE production_stages
      SET status = 'ASSIGNED',
          assigned_worker_id = ?,
          assigned_job_id = ?,
          agreed_rate_inr = ?
      WHERE id = ?
    `).run(request.worker_id, jobId, agreedRate, targetStage.stage_id);

    // 6. Update request record
    db.prepare(`
      UPDATE work_requests
      SET status = 'ACCEPTED',
          owner_response = ?,
          updated_at = ?
      WHERE id = ?
    `).run(owner_response || 'Work request accepted! Assigned job established.', now, requestId);

    // 7. Notify worker
    sendNotification(
      request.tenant_id,
      request.worker_id,
      'Work Request Accepted & Job Assigned',
      `Your request ${request.request_number} for ${request.requested_process} was accepted. Job ${jobNumber} is now assigned to you!`,
      'SUCCESS',
      `/jobs/${jobId}`
    );

    // 8. Audit log
    recordAuditLog(
      request.tenant_id,
      req.user!.id,
      req.user!.username,
      'OWNER',
      'WORK_REQUEST_ACCEPTED',
      'JOB_ASSIGNMENT',
      jobId,
      `Accepted request ${request.request_number} from worker ${request.worker_id}; created job ${jobNumber}`,
      req.ip || '127.0.0.1'
    );

    res.json({
      success: true,
      message: `Work request accepted! Job assignment ${jobNumber} created.`,
      jobId,
      jobNumber
    });
  } else if (action === 'REJECTED') {
    db.prepare(`
      UPDATE work_requests
      SET status = 'REJECTED',
          owner_response = ?,
          updated_at = ?
      WHERE id = ?
    `).run(owner_response || 'Declined at this time.', now, requestId);

    sendNotification(
      request.tenant_id,
      request.worker_id,
      'Work Request Declined',
      `Owner declined request ${request.request_number}: "${owner_response || 'Capacity currently committed'}"`,
      'INFO',
      `/work-requests`
    );

    recordAuditLog(
      request.tenant_id,
      req.user!.id,
      req.user!.username,
      'OWNER',
      'WORK_REQUEST_REJECTED',
      'WORK_REQUEST',
      requestId,
      `Owner rejected worker request ${request.request_number}: ${owner_response || 'No reason provided'}`,
      req.ip || '127.0.0.1'
    );

    res.json({
      success: true,
      message: 'Work request has been marked as REJECTED.'
    });
  } else {
    // INFO_REQUESTED
    db.prepare(`
      UPDATE work_requests
      SET status = 'INFO_REQUESTED',
          owner_response = ?,
          updated_at = ?
      WHERE id = ?
    `).run(owner_response || 'Please provide additional clarification on your timeline and loom type.', now, requestId);

    sendNotification(
      request.tenant_id,
      request.worker_id,
      'Clarification Requested on Work Request',
      `Owner requested details for request ${request.request_number}: "${owner_response || 'Please provide details'}"`,
      'INFO',
      `/work-requests`
    );

    recordAuditLog(
      request.tenant_id,
      req.user!.id,
      req.user!.username,
      'OWNER',
      'WORK_REQUEST_INFO_REQUESTED',
      'WORK_REQUEST',
      requestId,
      `Owner requested info on request ${request.request_number}: ${owner_response || ''}`,
      req.ip || '127.0.0.1'
    );

    res.json({
      success: true,
      message: 'Clarification request sent to artisan.'
    });
  }
});

// Worker replies to a clarification request (returns status to PENDING)
workflowRouter.post('/work-requests/:id/reply', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'WORKER') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only workers can reply to work requests.' });
    return;
  }

  const requestId = req.params.id;
  const { reply_message } = req.body;

  if (!reply_message || !reply_message.trim()) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Reply message cannot be empty.' });
    return;
  }

  const request = db.prepare('SELECT * FROM work_requests WHERE id = ?').get(requestId) as any;
  if (!request) {
    res.status(404).json({ error: 'REQUEST_NOT_FOUND', message: 'Work request not found.' });
    return;
  }

  if (request.worker_id !== req.user!.id) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'You are not authorized to reply to another artisan\'s work request.'
    });
    return;
  }

  const now = new Date().toISOString();
  const dateTag = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  const updatedMessage = request.message
    ? `${request.message}\n\n[Artisan Note ${dateTag}]: ${reply_message.trim()}`
    : reply_message.trim();

  db.prepare(`
    UPDATE work_requests
    SET message = ?,
        status = 'PENDING',
        updated_at = ?
    WHERE id = ?
  `).run(updatedMessage, now, requestId);

  // Notify owner
  const ownerUser = db.prepare("SELECT id FROM users WHERE tenant_id = ? AND role = 'OWNER'").get(request.tenant_id) as any;
  if (ownerUser) {
    sendNotification(
      request.tenant_id,
      ownerUser.id,
      'Artisan Replied to Request Clarification',
      `${req.user!.full_name} replied to request ${request.request_number}: "${reply_message.trim()}"`,
      'INFO',
      `/work-requests`
    );
  }

  res.json({
    success: true,
    message: 'Reply sent! Request is now back under review by the owner.'
  });
});

// ==========================================
// 4. JOBS & PROGRESS UPDATES
// ==========================================

// List jobs
workflowRouter.get('/jobs', (req: AuthenticatedRequest, res: Response) => {
  const role = req.user!.role;

  if (role === 'WORKER') {
    const jobs = db.prepare(`
      SELECT j.*,
             j.agreed_rate as agreed_rate_inr,
             j.required_quantity as quantity,
             t.business_name,
             t.location as business_location,
             b.batch_number,
             b.saree_type,
             b.design_name,
             b.color as saree_color,
             s.stage_number
      FROM job_assignments j
      JOIN tenants t ON j.tenant_id = t.id
      JOIN production_batches b ON j.batch_id = b.id
      JOIN production_stages s ON j.stage_id = s.id
      WHERE j.worker_id = ?
      ORDER BY j.created_at DESC
    `).all(req.user!.id);
    res.json({ jobs });
  } else if (role === 'OWNER') {
    const jobs = db.prepare(`
      SELECT j.*,
             j.agreed_rate as agreed_rate_inr,
             j.required_quantity as quantity,
             u.full_name as worker_name,
             u.phone as worker_phone,
             b.batch_number,
             b.saree_type,
             b.design_name,
             s.stage_number
      FROM job_assignments j
      JOIN users u ON j.worker_id = u.id
      JOIN production_batches b ON j.batch_id = b.id
      JOIN production_stages s ON j.stage_id = s.id
      WHERE j.tenant_id = ?
      ORDER BY j.created_at DESC
    `).all(req.user!.tenant_id);
    res.json({ jobs });
  } else {
    res.status(403).json({ error: 'FORBIDDEN' });
  }
});

// Get single job details with progress updates
workflowRouter.get('/jobs/:id', (req: AuthenticatedRequest, res: Response) => {
  const jobId = req.params.id;
  const job = db.prepare(`
    SELECT j.*,
           t.business_name,
           t.location as business_location,
           u.full_name as worker_name,
           u.phone as worker_phone,
           b.batch_number,
           b.saree_type,
           b.design_name,
           b.color as saree_color,
           s.stage_number
    FROM job_assignments j
    JOIN tenants t ON j.tenant_id = t.id
    JOIN users u ON j.worker_id = u.id
    JOIN production_batches b ON j.batch_id = b.id
    JOIN production_stages s ON j.stage_id = s.id
    WHERE j.id = ?
  `).get(jobId) as any;

  if (!job) {
    res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'Job assignment not found.' });
    return;
  }

  // Tenant or worker check
  if (req.user!.role === 'WORKER' && job.worker_id !== req.user!.id) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'You are not assigned to this job.' });
    return;
  }
  if (req.user!.role === 'OWNER' && job.tenant_id !== req.user!.tenant_id) {
    res.status(403).json({ error: 'TENANT_ISOLATION_VIOLATION', message: 'Job does not belong to your business.' });
    return;
  }

  const updates = db.prepare('SELECT * FROM job_progress_updates WHERE job_id = ? ORDER BY id DESC').all(jobId);

  res.json({ job, updates });
});

// Worker starts job
workflowRouter.post('/jobs/:id/start', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'WORKER') {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  const jobId = req.params.id;
  const job = db.prepare('SELECT * FROM job_assignments WHERE id = ? AND worker_id = ?').get(jobId, req.user!.id) as any;
  if (!job) {
    const exists = db.prepare('SELECT worker_id FROM job_assignments WHERE id = ?').get(jobId) as any;
    if (exists && exists.worker_id !== req.user!.id) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'You are not assigned to this job.' });
      return;
    }
    res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'Job assignment not found.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE job_assignments SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, ?), updated_at = ? WHERE id = ?").run(now, now, jobId);
  db.prepare("UPDATE production_stages SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, ?) WHERE id = ?").run(now, job.stage_id);

  res.json({ success: true, message: 'Work started on this job.' });
});

// Worker logs progress update
workflowRouter.post('/jobs/:id/progress', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'WORKER') {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  const jobId = req.params.id;
  const existingJob = db.prepare('SELECT * FROM job_assignments WHERE id = ?').get(jobId) as any;
  if (!existingJob) {
    res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'Job assignment not found.' });
    return;
  }

  if (existingJob.worker_id !== req.user!.id) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'You are not authorized to update another artisan\'s job.' });
    return;
  }

  const job = existingJob;
  const {
    completed_quantity,
    quantity_completed,
    wastage_quantity = 0,
    materials_used,
    notes,
    progress_notes,
    issues_reported
  } = req.body;

  const completedVal = completed_quantity !== undefined && completed_quantity !== null
    ? completed_quantity
    : quantity_completed;

  if (completedVal === undefined || completedVal === null) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Completed quantity is required.' });
    return;
  }

  const completed = Number(completedVal);
  const wastage = Number(wastage_quantity);
  const remaining = Math.max(0, job.required_quantity - completed);
  const percent = Math.min(100, Math.round((completed / job.required_quantity) * 100));
  const now = new Date().toISOString();
  const notesText = notes || progress_notes || null;

  // Insert progress record
  db.prepare(`
    INSERT INTO job_progress_updates (
      job_id, worker_id, completed_quantity, remaining_quantity,
      wastage_quantity, percentage_completed, materials_used, notes, issues_reported, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    jobId,
    req.user!.id,
    completed,
    remaining,
    wastage,
    percent,
    materials_used ? JSON.stringify(materials_used) : null,
    notesText,
    issues_reported || null,
    now
  );

  // Update job assignment summary
  db.prepare(`
    UPDATE job_assignments
    SET completed_quantity = ?,
        wastage_quantity = ?,
        status = 'IN_PROGRESS',
        updated_at = ?
    WHERE id = ?
  `).run(completed, wastage, now, jobId);

  // Also update stage
  db.prepare(`
    UPDATE production_stages
    SET output_quantity = ?,
        wastage_quantity = ?,
        status = 'IN_PROGRESS'
    WHERE id = ?
  `).run(completed, wastage, job.stage_id);

  res.json({
    success: true,
    message: 'Progress update logged successfully.',
    completedQuantity: completed,
    remainingQuantity: remaining,
    percent
  });
});

// Worker submits job for owner review
workflowRouter.post('/jobs/:id/submit', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'WORKER') {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  const jobId = req.params.id;
  const existingJob = db.prepare('SELECT * FROM job_assignments WHERE id = ?').get(jobId) as any;
  if (!existingJob) {
    res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'Job assignment not found.' });
    return;
  }

  if (existingJob.worker_id !== req.user!.id) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'You are not authorized to submit another artisan\'s job.' });
    return;
  }

  const job = existingJob;
  const {
    completion_notes,
    final_quantity,
    output_quantity,
    final_wastage = 0,
    wastage_quantity = 0
  } = req.body;

  const qty = output_quantity !== undefined ? output_quantity : final_quantity;
  const completedQty = qty !== undefined ? Number(qty) : job.completed_quantity;
  const wastageQty = Number(final_wastage || wastage_quantity);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE job_assignments
    SET status = 'SUBMITTED_FOR_REVIEW',
        completion_notes = ?,
        completed_quantity = ?,
        wastage_quantity = ?,
        submitted_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(completion_notes || 'Work submitted for final quality verification.', completedQty, wastageQty, now, now, jobId);

  db.prepare(`
    UPDATE production_stages
    SET status = 'SUBMITTED_FOR_REVIEW',
        output_quantity = ?,
        wastage_quantity = ?,
        submitted_at = ?
    WHERE id = ?
  `).run(completedQty, wastageQty, now, job.stage_id);

  const ownerUser = db.prepare("SELECT id FROM users WHERE tenant_id = ? AND role = 'OWNER'").get(job.tenant_id) as any;
  if (ownerUser) {
    sendNotification(
      job.tenant_id,
      ownerUser.id,
      'Work Submitted for Review',
      `${req.user!.full_name} completed job ${job.job_number} for ${job.process_stage} (${completedQty} pcs ready for verification).`,
      'ACTION_REQUIRED',
      `/batches/${job.batch_id}`
    );
  }

  recordAuditLog(
    job.tenant_id,
    req.user!.id,
    req.user!.username,
    'WORKER',
    'JOB_SUBMITTED_FOR_REVIEW',
    'JOB_ASSIGNMENT',
    jobId,
    `Worker submitted job ${job.job_number} for review`,
    req.ip || '127.0.0.1'
  );

  res.json({
    success: true,
    message: 'Work successfully submitted for owner quality review!'
  });
});

// ==========================================
// 5. OWNER STAGE REVIEW (APPROVE OR REWORK)
// ==========================================

workflowRouter.post('/jobs/:id/review', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'OWNER') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only textile owners can review and approve stage completions.' });
    return;
  }

  const jobId = req.params.id;
  const { action, approved_quantity, rework_reason, owner_notes, payment_advance = 0 } = req.body;
  // action: 'APPROVE' | 'REWORK'

  if (action !== 'APPROVE' && action !== 'REWORK') {
    res.status(400).json({ error: 'INVALID_ACTION', message: "Review action must be 'APPROVE' or 'REWORK'." });
    return;
  }

  const job = db.prepare('SELECT * FROM job_assignments WHERE id = ? AND tenant_id = ?').get(jobId, req.user!.tenant_id) as any;
  if (!job) {
    res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'Job not found in your business.' });
    return;
  }

  const stage = db.prepare('SELECT * FROM production_stages WHERE id = ?').get(job.stage_id) as any;
  if (!stage) {
    res.status(404).json({ error: 'STAGE_NOT_FOUND' });
    return;
  }

  const now = new Date().toISOString();

  if (action === 'REWORK') {
    if (!rework_reason || rework_reason.trim().length === 0) {
      res.status(400).json({ error: 'REASON_REQUIRED', message: 'A specific explanation of rework or defects is required.' });
      return;
    }

    db.prepare(`
      UPDATE job_assignments
      SET status = 'REWORK_REQUIRED',
          rework_reason = ?,
          updated_at = ?
      WHERE id = ?
    `).run(rework_reason, now, jobId);

    db.prepare(`
      UPDATE production_stages
      SET status = 'REWORK_REQUIRED',
          rework_reason = ?,
          owner_notes = ?
      WHERE id = ?
    `).run(rework_reason, owner_notes || null, job.stage_id);

    sendNotification(
      job.tenant_id,
      job.worker_id,
      'Rework Required on Job',
      `Owner requested adjustments for ${job.process_stage}: "${rework_reason}"`,
      'ALERT',
      `/jobs/${jobId}`
    );

    recordAuditLog(
      job.tenant_id,
      req.user!.id,
      req.user!.username,
      'OWNER',
      'STAGE_REWORK_REQUESTED',
      'JOB_ASSIGNMENT',
      jobId,
      `Requested rework on job ${job.job_number}: ${rework_reason}`,
      req.ip || '127.0.0.1'
    );

    res.json({
      success: true,
      message: 'Rework request sent to worker.'
    });
  } else {
    // APPROVE
    const approvedQty = approved_quantity !== undefined ? Number(approved_quantity) : job.completed_quantity || job.required_quantity;

    // 1. Update job to APPROVED
    db.prepare(`
      UPDATE job_assignments
      SET status = 'APPROVED',
          completed_quantity = ?,
          approved_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(approvedQty, now, now, jobId);

    // 2. Update stage to APPROVED
    db.prepare(`
      UPDATE production_stages
      SET status = 'APPROVED',
          output_quantity = ?,
          owner_notes = ?,
          approved_at = ?
      WHERE id = ?
    `).run(approvedQty, owner_notes || null, now, job.stage_id);

    // 3. Compute and Record Worker Payment Ledger Entry
    const gross = job.agreed_rate * approvedQty;
    const advance = Number(payment_advance) || 0;
    const net = Math.max(0, gross - advance);
    const paymentId = 'pay_' + crypto.randomBytes(6).toString('hex');

    db.prepare(`
      INSERT INTO worker_payments (
        id, tenant_id, job_id, worker_id, production_id, stage_name, rate_type,
        agreed_rate, approved_quantity, gross_amount, advance_amount, deductions,
        net_payable, amount_paid, balance_remaining, payment_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'PENDING', ?)
    `).run(
      paymentId,
      job.tenant_id,
      jobId,
      job.worker_id,
      job.batch_id,
      job.process_stage,
      job.rate_type,
      job.agreed_rate,
      approvedQty,
      gross,
      advance,
      0,
      net,
      net,
      now
    );

    // 4. Automatically Unlock the Next Sequential Stage in this Batch!
    const nextStage = db.prepare(`
      SELECT * FROM production_stages
      WHERE batch_id = ? AND stage_number = ?
    `).get(job.batch_id, stage.stage_number + 1) as any;
    
    let unlockedNextStage = null;
    let batchCompleted = false;

    if (nextStage) {
      db.prepare(`
        UPDATE production_stages
        SET status = 'READY_FOR_ASSIGNMENT',
            input_quantity = ?
        WHERE id = ?
      `).run(approvedQty, nextStage.id);
      unlockedNextStage = nextStage.stage_name;
    } else {
      // Reached final stage! Mark entire batch COMPLETED
      db.prepare("UPDATE production_batches SET status = 'COMPLETED' WHERE id = ?").run(job.batch_id);
      batchCompleted = true;

      // Auto-populate finished sarees inventory
      const batch = db.prepare('SELECT * FROM production_batches WHERE id = ?').get(job.batch_id) as any;
      if (batch) {
        const stockId = 'sk_' + crypto.randomBytes(6).toString('hex');
        const sareeCode = `SKU-${batch.saree_type.substring(0, 3).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        db.prepare(`
          INSERT INTO finished_sarees (
            id, tenant_id, batch_id, saree_code, saree_title, saree_type, color,
            design_pattern, silk_mark_certified, quantity, cost_price_inr, selling_price_inr,
            rack_location, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 12000, 24000, 'Showroom Rack A1', 'IN_STOCK', ?)
        `).run(
          stockId,
          job.tenant_id,
          batch.id,
          sareeCode,
          `${batch.saree_type} (${batch.design_name})`,
          batch.saree_type,
          batch.color,
          batch.design_name,
          approvedQty,
          now
        );
      }
    }

    sendNotification(
      job.tenant_id,
      job.worker_id,
      'Stage Approved & Payment Recorded',
      `Your work on ${job.process_stage} (${approvedQty} pcs) was approved. Payment entry of ₹${net.toLocaleString()} created.`,
      'SUCCESS',
      `/payments`
    );

    recordAuditLog(
      job.tenant_id,
      req.user!.id,
      req.user!.username,
      'OWNER',
      'STAGE_APPROVED',
      'JOB_ASSIGNMENT',
      jobId,
      `Approved stage ${stage.stage_name} (${approvedQty} pcs). Next: ${unlockedNextStage || 'Batch Complete'}. Payment ₹${net} generated`,
      req.ip || '127.0.0.1'
    );

    res.json({
      success: true,
      message: `Stage '${stage.stage_name}' approved successfully!`,
      approvedQuantity: approvedQty,
      unlockedNextStage,
      batchCompleted,
      paymentId,
      grossAmount: gross,
      netPayable: net
    });
  }
});

// ==========================================
// 6. RAW MATERIAL INVENTORY & PURCHASES
// ==========================================

// List inventory
workflowRouter.get('/inventory', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  if (!tenantId) {
    res.status(400).json({ error: 'NO_TENANT' });
    return;
  }

  const items = db.prepare('SELECT * FROM raw_materials WHERE tenant_id = ? ORDER BY name ASC').all(tenantId);
  res.json({ items });
});

// Add new raw material
workflowRouter.post('/inventory', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'OWNER') {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  const tenantId = req.user!.tenant_id;
  const { name, material_code, unit_of_measurement, available_quantity, reorder_level = 10, purchase_cost_inr, supplier_name } = req.body;

  if (!name || !material_code || !unit_of_measurement || available_quantity === undefined || !purchase_cost_inr) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Missing required material specifications.' });
    return;
  }

  const materialId = 'raw_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO raw_materials (
      id, tenant_id, material_code, name, unit_of_measurement,
      available_quantity, reorder_level, purchase_cost_inr, supplier_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    materialId,
    tenantId,
    material_code,
    name,
    unit_of_measurement,
    Number(available_quantity),
    Number(reorder_level),
    Number(purchase_cost_inr),
    supplier_name || null,
    now
  );

  res.status(201).json({
    success: true,
    message: 'Raw material stock item added.',
    materialId
  });
});

// Consume raw material for production batch
workflowRouter.post('/inventory/consume', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'OWNER') {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  const tenantId = req.user!.tenant_id;
  const { material_id, quantity_used, batch_id, stage_name, notes } = req.body;

  if (!material_id || !quantity_used || Number(quantity_used) <= 0) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Valid material and quantity required.' });
    return;
  }

  const material = db.prepare('SELECT * FROM raw_materials WHERE id = ? AND tenant_id = ?').get(material_id, tenantId) as any;
  if (!material) {
    res.status(404).json({ error: 'MATERIAL_NOT_FOUND' });
    return;
  }

  const deduct = Number(quantity_used);
  if (material.available_quantity < deduct) {
    res.status(400).json({
      error: 'INSUFFICIENT_STOCK',
      message: `Only ${material.available_quantity} ${material.unit_of_measurement} available in inventory (requested ${deduct}).`
    });
    return;
  }

  const newQty = material.available_quantity - deduct;
  db.prepare('UPDATE raw_materials SET available_quantity = ? WHERE id = ?').run(newQty, material_id);

  recordAuditLog(
    tenantId,
    req.user!.id,
    req.user!.username,
    'OWNER',
    'RAW_MATERIAL_CONSUMED',
    'RAW_MATERIAL',
    material_id,
    `Consumed ${deduct} ${material.unit_of_measurement} of ${material.name} for ${stage_name || 'Production'}`,
    req.ip || '127.0.0.1'
  );

  res.json({
    success: true,
    message: `Consumed ${deduct} ${material.unit_of_measurement} of ${material.name}.`,
    remainingQuantity: newQty
  });
});

// ==========================================
// 7. WORKER PAYMENTS LEDGER
// ==========================================

// List payments
workflowRouter.get('/payments', (req: AuthenticatedRequest, res: Response) => {
  const role = req.user!.role;

  if (role === 'OWNER') {
    const tenantId = req.user!.tenant_id;
    const payments = db.prepare(`
      SELECT p.*,
             u.full_name as worker_name,
             u.phone as worker_phone
      FROM worker_payments p
      JOIN users u ON p.worker_id = u.id
      WHERE p.tenant_id = ?
      ORDER BY p.created_at DESC
    `).all(tenantId);
    res.json({ payments });
  } else if (role === 'WORKER') {
    const payments = db.prepare(`
      SELECT p.*,
             t.business_name
      FROM worker_payments p
      JOIN tenants t ON p.tenant_id = t.id
      WHERE p.worker_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user!.id);
    res.json({ payments });
  } else {
    res.status(403).json({ error: 'FORBIDDEN' });
  }
});

// Owner marks payment as paid / records transaction
workflowRouter.post('/payments/:id/pay', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'OWNER') {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  const paymentId = req.params.id;
  const { amount_paid, payment_method = 'UPI', transaction_ref } = req.body;

  const payment = db.prepare('SELECT * FROM worker_payments WHERE id = ? AND tenant_id = ?').get(paymentId, req.user!.tenant_id) as any;
  if (!payment) {
    res.status(404).json({ error: 'PAYMENT_NOT_FOUND' });
    return;
  }

  const paying = Number(amount_paid) || payment.balance_remaining;
  const newAmountPaid = (payment.amount_paid || 0) + paying;
  const newBalance = Math.max(0, payment.net_payable - newAmountPaid);
  const status = newBalance === 0 ? 'PAID' : 'PARTIAL';
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE worker_payments
    SET amount_paid = ?,
        balance_remaining = ?,
        payment_status = ?,
        payment_method = ?,
        transaction_ref = ?,
        paid_at = ?
    WHERE id = ?
  `).run(newAmountPaid, newBalance, status, payment_method, transaction_ref || null, now, paymentId);

  sendNotification(
    payment.tenant_id,
    payment.worker_id,
    'Payment Disbursed',
    `You received ₹${paying.toLocaleString()} via ${payment_method} for ${payment.stage_name} (Ref: ${transaction_ref || 'Direct'}).`,
    'SUCCESS',
    `/payments`
  );

  res.json({
    success: true,
    message: `Payment of ₹${paying.toLocaleString()} recorded. Status: ${status}.`,
    paymentStatus: status,
    balanceRemaining: newBalance
  });
});

// ==========================================
// 8. FINISHED SAREE STOCK & SALES ORDERS
// ==========================================

// List finished stock
workflowRouter.get('/stock', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  if (!tenantId) {
    res.status(400).json({ error: 'NO_TENANT' });
    return;
  }

  const sarees = db.prepare(`
    SELECT s.*, b.batch_number
    FROM finished_sarees s
    LEFT JOIN production_batches b ON s.batch_id = b.id
    WHERE s.tenant_id = ?
    ORDER BY s.created_at DESC
  `).all(tenantId);

  res.json({ sarees });
});

// List sales orders
workflowRouter.get('/sales', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  if (!tenantId) {
    res.status(400).json({ error: 'NO_TENANT' });
    return;
  }

  const sales = db.prepare('SELECT * FROM sales_orders WHERE tenant_id = ? ORDER BY sale_date DESC').all(tenantId);
  res.json({ sales });
});

// Record new sale order and deduct finished stock
workflowRouter.post('/sales', (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'OWNER') {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  const tenantId = req.user!.tenant_id;
  const {
    customer_name,
    customer_phone,
    customer_city,
    sale_type = 'WHOLESALE',
    saree_id,
    quantity,
    selling_price_inr,
    discount_inr = 0,
    payment_method = 'UPI',
    notes
  } = req.body;

  if (!customer_name || !customer_phone || !saree_id || !quantity || !selling_price_inr) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Customer, saree, quantity and price are required.' });
    return;
  }

  const saree = db.prepare('SELECT * FROM finished_sarees WHERE id = ? AND tenant_id = ?').get(saree_id, tenantId) as any;
  if (!saree) {
    res.status(404).json({ error: 'SAREE_NOT_FOUND' });
    return;
  }

  const qty = Number(quantity);
  if (saree.quantity < qty) {
    res.status(400).json({ error: 'INSUFFICIENT_STOCK', message: `Only ${saree.quantity} sarees available in stock.` });
    return;
  }

  const totalAmount = Number(selling_price_inr) * qty;
  const netAmount = Math.max(0, totalAmount - Number(discount_inr));
  const orderId = 'so_' + crypto.randomBytes(6).toString('hex');
  const orderNumber = generateUniqueSequenceNumber('sales_orders', 'order_number', 'SO');
  const now = new Date().toISOString();
  const saleDate = now.split('T')[0];

  // 1. Insert sales order
  db.prepare(`
    INSERT INTO sales_orders (
      id, order_number, tenant_id, sale_type, customer_name, customer_phone,
      customer_city, total_items, total_amount_inr, discount_inr, net_amount_inr,
      payment_method, payment_status, notes, sale_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?)
  `).run(
    orderId,
    orderNumber,
    tenantId,
    sale_type,
    customer_name,
    customer_phone,
    customer_city || null,
    qty,
    totalAmount,
    Number(discount_inr),
    netAmount,
    payment_method,
    notes || null,
    saleDate,
    now
  );

  // 2. Deduct finished stock
  const remainingStock = saree.quantity - qty;
  const newStockStatus = remainingStock === 0 ? 'SOLD' : 'IN_STOCK';
  db.prepare('UPDATE finished_sarees SET quantity = ?, status = ? WHERE id = ?').run(remainingStock, newStockStatus, saree_id);

  recordAuditLog(
    tenantId,
    req.user!.id,
    req.user!.username,
    'OWNER',
    'SALE_RECORDED',
    'SALES_ORDER',
    orderId,
    `Recorded sale ${orderNumber} to ${customer_name}: ${qty} sarees for ₹${netAmount.toLocaleString()}`,
    req.ip || '127.0.0.1'
  );

  res.status(201).json({
    success: true,
    message: `Sales order ${orderNumber} created successfully.`,
    orderId,
    orderNumber,
    netAmount,
    remainingStock
  });
});

// Notifications endpoint
workflowRouter.get('/notifications', (req: AuthenticatedRequest, res: Response) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(req.user!.id);

  res.json({ notifications });
});

workflowRouter.post('/notifications/:id/read', (req: AuthenticatedRequest, res: Response) => {
  db.prepare('UPDATE notifications SET read_status = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  res.json({ success: true });
});
