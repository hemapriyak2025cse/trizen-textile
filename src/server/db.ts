import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Ensure data directory exists
const DATA_DIR = path.resolve('data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'trizen.db');
export const db = new DatabaseSync(DB_FILE);

// Enable WAL mode, busy timeout & foreign keys
try {
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch {
  // Pragma may be already active in concurrent process
}

// Password hashing helper using crypto PBKDF2
export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return derived === hash;
}

export function generateToken(): string {
  return 'trz_' + crypto.randomBytes(32).toString('hex');
}

// 7 Default Saree Production Stages
export const DEFAULT_SAREE_STAGES = [
  'Thread / Raw Material Preparation',
  'Dyeing',
  'Warping (Vaarpu)',
  'Weaving / Loom',
  'Finishing',
  'Quality Inspection',
  'Finished Stock / Ready for Sale'
];

// Initialize complete database schema
export function initDatabase() {
  db.exec(`
    -- Tenants (Independent Small-Scale Saree Businesses)
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_user_id TEXT,
      location TEXT NOT NULL,
      registration_number TEXT,
      textile_specialization TEXT NOT NULL,
      loom_count INTEGER NOT NULL DEFAULT 4,
      loom_types TEXT NOT NULL DEFAULT '["Traditional Pit Handloom", "Frame Loom"]',
      subscription_status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL
    );

    -- Platform Users (Admin, Owners, Independent Weavers / Workers)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'OWNER', 'WORKER')),
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      address TEXT,
      location TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED')),
      rejection_reason TEXT,
      additional_info_requested TEXT,
      skills TEXT DEFAULT '[]',
      experience_years INTEGER DEFAULT 0,
      loom_type TEXT,
      daily_capacity TEXT,
      availability TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(availability IN ('AVAILABLE', 'BUSY')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
    );

    -- Active Authentication Sessions
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Password Reset Tokens
    CREATE TABLE IF NOT EXISTS password_resets (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Permanent Security & Audit Logs (Tenant-Isolated)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT,
      user_id TEXT NOT NULL,
      actor_username TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT NOT NULL,
      ip_address TEXT,
      timestamp TEXT NOT NULL
    );

    -- Saree Production Batches
    CREATE TABLE IF NOT EXISTS production_batches (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      production_id TEXT NOT NULL,
      batch_number TEXT NOT NULL,
      saree_type TEXT NOT NULL,
      design_name TEXT NOT NULL,
      color TEXT NOT NULL,
      border_details TEXT,
      planned_quantity REAL NOT NULL,
      unit_of_measure TEXT NOT NULL DEFAULT 'pieces',
      start_date TEXT NOT NULL,
      target_completion_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      raw_material_details TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id)
    );

    -- Saree Production Stages (Configurable 7 Stages)
    CREATE TABLE IF NOT EXISTS production_stages (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      stage_number INTEGER NOT NULL,
      stage_name TEXT NOT NULL,
      input_quantity REAL,
      output_quantity REAL,
      wastage_quantity REAL DEFAULT 0,
      assigned_worker_id TEXT,
      assigned_job_id TEXT,
      agreed_rate_inr REAL,
      rate_type TEXT DEFAULT 'PER_PIECE',
      status TEXT NOT NULL DEFAULT 'LOCKED' CHECK(status IN (
        'LOCKED', 'READY_FOR_ASSIGNMENT', 'WORK_OFFERED', 'ASSIGNED',
        'IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'REWORK_REQUIRED',
        'APPROVED', 'NOT_REQUIRED'
      )),
      worker_notes TEXT,
      owner_notes TEXT,
      quality_result TEXT,
      rework_reason TEXT,
      started_at TEXT,
      submitted_at TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(batch_id) REFERENCES production_batches(id) ON DELETE CASCADE,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id),
      FOREIGN KEY(assigned_worker_id) REFERENCES users(id)
    );

    -- Work Requests (Worker -> Owner)
    CREATE TABLE IF NOT EXISTS work_requests (
      id TEXT PRIMARY KEY,
      request_number TEXT UNIQUE NOT NULL,
      tenant_id TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      batch_id TEXT,
      requested_process TEXT NOT NULL,
      work_type TEXT NOT NULL DEFAULT 'Contract Piece-Rate',
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'pieces',
      proposed_rate REAL,
      expected_completion TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'INFO_REQUESTED', 'CANCELLED')),
      owner_response TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id),
      FOREIGN KEY(worker_id) REFERENCES users(id)
    );

    -- Work Offers (Owner -> Worker)
    CREATE TABLE IF NOT EXISTS work_offers (
      id TEXT PRIMARY KEY,
      offer_number TEXT UNIQUE NOT NULL,
      tenant_id TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      stage_id TEXT NOT NULL,
      process_stage TEXT NOT NULL,
      work_instructions TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'pieces',
      proposed_rate REAL NOT NULL,
      rate_type TEXT NOT NULL DEFAULT 'PER_PIECE',
      start_date TEXT NOT NULL,
      deadline TEXT NOT NULL,
      materials_provided TEXT,
      quality_requirements TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CHANGES_REQUESTED', 'CANCELLED')),
      worker_response TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id),
      FOREIGN KEY(worker_id) REFERENCES users(id),
      FOREIGN KEY(batch_id) REFERENCES production_batches(id),
      FOREIGN KEY(stage_id) REFERENCES production_stages(id)
    );

    -- Job Assignments (Agreed Active/Completed Job)
    CREATE TABLE IF NOT EXISTS job_assignments (
      id TEXT PRIMARY KEY,
      job_number TEXT UNIQUE NOT NULL,
      tenant_id TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      stage_id TEXT NOT NULL,
      process_stage TEXT NOT NULL,
      work_instructions TEXT NOT NULL,
      required_quantity REAL NOT NULL,
      completed_quantity REAL NOT NULL DEFAULT 0,
      wastage_quantity REAL NOT NULL DEFAULT 0,
      agreed_rate REAL NOT NULL,
      rate_type TEXT NOT NULL DEFAULT 'PER_PIECE',
      start_date TEXT NOT NULL,
      deadline TEXT NOT NULL,
      materials_provided TEXT,
      quality_requirements TEXT,
      status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK(status IN (
        'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'REWORK_REQUIRED', 'APPROVED', 'CANCELLED'
      )),
      rework_reason TEXT,
      completion_notes TEXT,
      started_at TEXT,
      submitted_at TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(batch_id, stage_id),
      FOREIGN KEY(tenant_id) REFERENCES tenants(id),
      FOREIGN KEY(worker_id) REFERENCES users(id),
      FOREIGN KEY(batch_id) REFERENCES production_batches(id),
      FOREIGN KEY(stage_id) REFERENCES production_stages(id)
    );

    -- Job Progress Updates History
    CREATE TABLE IF NOT EXISTS job_progress_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      completed_quantity REAL NOT NULL,
      remaining_quantity REAL NOT NULL,
      wastage_quantity REAL NOT NULL DEFAULT 0,
      percentage_completed REAL,
      materials_used TEXT,
      notes TEXT,
      issues_reported TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY(job_id) REFERENCES job_assignments(id)
    );

    -- Raw Material Inventory
    CREATE TABLE IF NOT EXISTS raw_materials (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      material_code TEXT NOT NULL,
      name TEXT NOT NULL,
      unit_of_measurement TEXT NOT NULL,
      available_quantity REAL NOT NULL DEFAULT 0,
      reorder_level REAL NOT NULL DEFAULT 10,
      purchase_cost_inr REAL NOT NULL,
      supplier_name TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id)
    );

    -- Worker Payments
    CREATE TABLE IF NOT EXISTS worker_payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      job_id TEXT,
      worker_id TEXT NOT NULL,
      production_id TEXT,
      stage_name TEXT,
      rate_type TEXT NOT NULL,
      agreed_rate REAL NOT NULL,
      approved_quantity REAL NOT NULL,
      gross_amount REAL NOT NULL,
      advance_amount REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      net_payable REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      balance_remaining REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      payment_method TEXT,
      transaction_ref TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id)
    );

    -- In-app Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'INFO',
      link TEXT,
      read_status INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Finished Saree Stock
    CREATE TABLE IF NOT EXISTS finished_sarees (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      batch_id TEXT,
      saree_code TEXT NOT NULL,
      saree_title TEXT NOT NULL,
      saree_type TEXT NOT NULL,
      color TEXT NOT NULL,
      design_pattern TEXT NOT NULL,
      silk_mark_certified INTEGER NOT NULL DEFAULT 1,
      quantity INTEGER NOT NULL DEFAULT 1,
      cost_price_inr REAL NOT NULL,
      selling_price_inr REAL NOT NULL,
      rack_location TEXT DEFAULT 'Showroom Display A-1',
      status TEXT NOT NULL DEFAULT 'IN_STOCK' CHECK(status IN ('IN_STOCK', 'SOLD', 'RESERVED')),
      created_at TEXT NOT NULL,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id),
      FOREIGN KEY(batch_id) REFERENCES production_batches(id)
    );

    -- Wholesale & Retail Sales Orders
    CREATE TABLE IF NOT EXISTS sales_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      tenant_id TEXT NOT NULL,
      sale_type TEXT NOT NULL CHECK(sale_type IN ('WHOLESALE', 'RETAIL', 'BOUTIQUE')),
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_city TEXT,
      total_items INTEGER NOT NULL,
      total_amount_inr REAL NOT NULL,
      discount_inr REAL DEFAULT 0,
      net_amount_inr REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'UPI',
      payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK(payment_status IN ('PAID', 'PARTIAL', 'PENDING')),
      notes TEXT,
      sale_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id)
    );
  `);

  // Safe schema migrations for SQLite tables
  const ensureColumn = (table: string, column: string, definition: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
    } catch {
      // Column already exists
    }
  };

  ensureColumn('production_batches', 'production_id', 'TEXT');
  ensureColumn('production_batches', 'raw_material_details', 'TEXT');
  ensureColumn('production_stages', 'assigned_job_id', 'TEXT');
  ensureColumn('production_stages', 'rate_type', "TEXT DEFAULT 'PER_PIECE'");
  ensureColumn('production_stages', 'rework_reason', 'TEXT');
  ensureColumn('production_stages', 'started_at', 'TEXT');
  ensureColumn('production_stages', 'submitted_at', 'TEXT');
  ensureColumn('notifications', 'link', 'TEXT');
  ensureColumn('notifications', 'type', "TEXT DEFAULT 'INFO'");
  ensureColumn('notifications', 'read_status', "INTEGER DEFAULT 0");

  // Seed default data
  seedInitialData();
}

// Seed authentic small-scale saree production data
export function seedInitialData() {
  const now = new Date().toISOString();
  const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = (userCountStmt.get() as { count: number }).count;

  if (userCount === 0) {

  // 1. Platform Admin
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const adminPass = hashPassword('Admin@123', adminSalt);
  db.prepare(`
    INSERT INTO users (
      id, tenant_id, role, full_name, username, email, phone,
      password_hash, salt, address, location, status, created_at, updated_at
    ) VALUES (
      'usr_admin_01', NULL, 'ADMIN', 'TRIZEN Platform Administrator', 'admin',
      'admin@trizen.com', '+91 98400 11001', ?, ?,
      'TRIZEN Software HQ, Coimbatore Tech Park', 'Coimbatore, Tamil Nadu',
      'APPROVED', ?, ?
    )
  `).run(adminPass.hash, adminSalt, now, now);

  // 2. Tenant 1: Sri Venkateswara Handlooms (Kanchipuram Silk Saree Producer)
  const tenant1Id = 'tnt_kanchi_01';
  db.prepare(`
    INSERT INTO tenants (
      id, business_name, slug, location, registration_number,
      textile_specialization, loom_count, loom_types, subscription_status, created_at
    ) VALUES (
      ?, 'Sri Venkateswara Handlooms', 'venkateswara-kanchi', 'Kanchipuram, Tamil Nadu',
      'GSTIN33AAACV1234F1Z8', 'Pure Mulberry Silk, Traditional Korvai Weave & Pure Gold Zari',
      8, '["Traditional Pit Handloom", "Raised Jacquard Shed", "Warping Vaarpu Reel"]',
      'ACTIVE', ?
    )
  `).run(tenant1Id, now);

  const owner1Salt = crypto.randomBytes(16).toString('hex');
  const owner1Pass = hashPassword('Owner@123', owner1Salt);
  db.prepare(`
    INSERT INTO users (
      id, tenant_id, role, full_name, username, email, phone,
      password_hash, salt, address, location, status, created_at, updated_at
    ) VALUES (
      'usr_owner_01', ?, 'OWNER', 'S. Narayana Chettiar', 'owner_kanchi',
      'owner.kanchi@trizen.com', '+91 94432 55001', ?, ?,
      '14 Weaver Street, Kanchipuram Heritage Enclave', 'Kanchipuram, Tamil Nadu',
      'APPROVED', ?, ?
    )
  `).run(tenant1Id, owner1Pass.hash, owner1Salt, now, now);
  db.prepare('UPDATE tenants SET owner_user_id = ? WHERE id = ?').run('usr_owner_01', tenant1Id);

  // 3. Tenant 2: Arani Royal Saree Weavers (Arani Silk & Cotton Saree Producer)
  const tenant2Id = 'tnt_arani_02';
  db.prepare(`
    INSERT INTO tenants (
      id, business_name, slug, location, registration_number,
      textile_specialization, loom_count, loom_types, subscription_status, created_at
    ) VALUES (
      ?, 'Arani Royal Saree Weavers', 'arani-royal-silks', 'Arani, Tiruvannamalai, Tamil Nadu',
      'UDYAM-TN-28-0019284', 'Lightweight Arani Silk, Contrast Zari Pallu & Soft Cotton Sarees',
      5, '["Frame Handloom", "Electronic Jacquard Loom"]',
      'ACTIVE', ?
    )
  `).run(tenant2Id, now);

  const owner2Salt = crypto.randomBytes(16).toString('hex');
  const owner2Pass = hashPassword('Owner@123', owner2Salt);
  db.prepare(`
    INSERT INTO users (
      id, tenant_id, role, full_name, username, email, phone,
      password_hash, salt, address, location, status, created_at, updated_at
    ) VALUES (
      'usr_owner_02', ?, 'OWNER', 'G. Balasubramanian', 'owner_arani',
      'owner.arani@trizen.com', '+91 94435 66002', ?, ?,
      '7 Bazaar Road, Arani Silk Cluster', 'Arani, Tamil Nadu',
      'APPROVED', ?, ?
    )
  `).run(tenant2Id, owner2Pass.hash, owner2Salt, now, now);
  db.prepare('UPDATE tenants SET owner_user_id = ? WHERE id = ?').run('usr_owner_02', tenant2Id);

  // 4. Worker 1: Master Weaver Murugan (Korvai Handloom Weaving)
  const w1Salt = crypto.randomBytes(16).toString('hex');
  const w1Pass = hashPassword('Worker@123', w1Salt);
  db.prepare(`
    INSERT INTO users (
      id, tenant_id, role, full_name, username, email, phone,
      password_hash, salt, address, location, status, skills, experience_years,
      loom_type, daily_capacity, availability, notes, created_at, updated_at
    ) VALUES (
      'usr_worker_01', NULL, 'WORKER', 'K. Murugan', 'murugan_weaver',
      'murugan.weaver@trizen.com', '+91 98411 77001', ?, ?,
      'Shed #3, Mettu Street, Kanchipuram', 'Kanchipuram, Tamil Nadu',
      'APPROVED', '["Korvai Double-Border Weaving", "Weaving / Loom", "Pure Silk Weft Shuttle", "Petni Joint Technique"]',
      18, 'Pit Handloom (2-Person Korvai)', '1 saree / 4-5 days', 'AVAILABLE',
      'State-awarded master weaver specializing in temple border pure zari bridal silks',
      ?, ?
    )
  `).run(w1Pass.hash, w1Salt, now, now);

  // 5. Worker 2: Dyer Selvi (Yarn Dyeing & Color Matching)
  const w2Salt = crypto.randomBytes(16).toString('hex');
  const w2Pass = hashPassword('Worker@123', w2Salt);
  db.prepare(`
    INSERT INTO users (
      id, tenant_id, role, full_name, username, email, phone,
      password_hash, salt, address, location, status, skills, experience_years,
      loom_type, daily_capacity, availability, notes, created_at, updated_at
    ) VALUES (
      'usr_worker_02', NULL, 'WORKER', 'M. Selvi', 'selvi_dyer',
      'selvi.dyer@trizen.com', '+91 98412 88002', ?, ?,
      'Dye House, Palar River Road, Walajapet', 'Walajapet, Tamil Nadu',
      'APPROVED', '["Dyeing", "Raw Silk Degumming", "Vat Dyeing", "Eco-friendly Natural Dye Extracts", "Hank Bleaching"]',
      12, 'Vat & Boiler Station', '25 kg yarn / day', 'AVAILABLE',
      'Fast turnaround silk yarn dyeing with verified laboratory color fastness grade 4.5+',
      ?, ?
    )
  `).run(w2Pass.hash, w2Salt, now, now);

  // 6. Worker 3: Warper Raman (Warping / Vaarpu)
  const w3Salt = crypto.randomBytes(16).toString('hex');
  const w3Pass = hashPassword('Worker@123', w3Salt);
  db.prepare(`
    INSERT INTO users (
      id, tenant_id, role, full_name, username, email, phone,
      password_hash, salt, address, location, status, skills, experience_years,
      loom_type, daily_capacity, availability, notes, created_at, updated_at
    ) VALUES (
      'usr_worker_03', NULL, 'WORKER', 'P. Raman', 'raman_warper',
      'raman.warper@trizen.com', '+91 98413 99003', ?, ?,
      'Street #1, Weaver Nagar, Arani', 'Arani, Tamil Nadu',
      'APPROVED', '["Warping (Vaarpu)", "Vaarpu Warping Reel Operation", "Reed Doffing", "Pirn Winding", "Beaming 4000 Ends"]',
      15, 'Horizontal Vaarpu Drum & Beaming Frame', '4 warps / day', 'BUSY',
      'Currently aligned with traditional handloom setups',
      ?, ?
    )
  `).run(w3Pass.hash, w3Salt, now, now);
  } // End of user seeding

  // 7. Seed Production Batches with 7-Stage Pipeline for Tenant 1
  const tenant1Id = 'tnt_kanchi_01';
  const batchCount = (db.prepare('SELECT COUNT(*) as count FROM production_batches').get() as { count: number }).count;
  if (batchCount === 0) {
    const batch1Id = 'btc_kanchi_01';
  db.prepare(`
    INSERT INTO production_batches (
      id, tenant_id, production_id, batch_number, saree_type, design_name,
      color, border_details, planned_quantity, unit_of_measure, start_date,
      target_completion_date, status, notes, created_at
    ) VALUES (
      ?, ?, 'PRD-2026-001', 'BATCH-2026-KAN-01', 'Kanchipuram Silk Saree',
      'Mayilkan Mayil Motif Bridal Weave', 'Crimson Maroon & Temple Gold',
      'Double Korvai Contrast Border with Pure Silver-Gilt Zari',
      50, 'pieces', '2026-10-15', '2026-11-15', 'IN_PROGRESS',
      'High priority wedding season commission for boutique retailers', ?
    )
  `).run(batch1Id, tenant1Id, now);

  // Create 7 stages for Batch 1:
  // Stage 1: Thread Preparation (APPROVED)
  const stg1 = 'stg_k1_1';
  db.prepare(`
    INSERT INTO production_stages (
      id, batch_id, tenant_id, stage_number, stage_name, input_quantity, output_quantity,
      wastage_quantity, agreed_rate_inr, status, approved_at, created_at
    ) VALUES (?, ?, ?, 1, 'Thread / Raw Material Preparation', 52, 51, 1, 150, 'APPROVED', '2026-10-18', ?)
  `).run(stg1, batch1Id, tenant1Id, now);

  // Stage 2: Dyeing (APPROVED)
  const stg2 = 'stg_k1_2';
  db.prepare(`
    INSERT INTO production_stages (
      id, batch_id, tenant_id, stage_number, stage_name, input_quantity, output_quantity,
      wastage_quantity, assigned_worker_id, agreed_rate_inr, status, approved_at, created_at
    ) VALUES (?, ?, ?, 2, 'Dyeing', 51, 50.5, 0.5, 'usr_worker_02', 350, 'APPROVED', '2026-10-22', ?)
  `).run(stg2, batch1Id, tenant1Id, now);

  // Stage 3: Warping (Vaarpu) (IN_PROGRESS, Assigned to Raman Warper)
  const stg3 = 'stg_k1_3';
  db.prepare(`
    INSERT INTO production_stages (
      id, batch_id, tenant_id, stage_number, stage_name, input_quantity, output_quantity,
      wastage_quantity, assigned_worker_id, agreed_rate_inr, status, started_at, created_at
    ) VALUES (?, ?, ?, 3, 'Warping (Vaarpu)', 50.5, 0, 0, 'usr_worker_03', 450, 'IN_PROGRESS', '2026-10-23', ?)
  `).run(stg3, batch1Id, tenant1Id, now);

  // Stage 4: Weaving / Loom (READY_FOR_ASSIGNMENT)
  const stg4 = 'stg_k1_4';
  db.prepare(`
    INSERT INTO production_stages (
      id, batch_id, tenant_id, stage_number, stage_name, input_quantity, output_quantity,
      wastage_quantity, agreed_rate_inr, status, created_at
    ) VALUES (?, ?, ?, 4, 'Weaving / Loom', 50, 0, 0, 2400, 'WORK_OFFERED', ?)
  `).run(stg4, batch1Id, tenant1Id, now);

  // Stages 5-7: LOCKED
  const remainingStages = ['Finishing', 'Quality Inspection', 'Finished Stock / Ready for Sale'];
  remainingStages.forEach((name, idx) => {
    db.prepare(`
      INSERT INTO production_stages (
        id, batch_id, tenant_id, stage_number, stage_name, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'LOCKED', ?)
    `).run(`stg_k1_${idx + 5}`, batch1Id, tenant1Id, idx + 5, name, now);
  });

  // Seed Job Assignment for Stage 3 Warping
  const job1Id = 'job_2026_001';
  db.prepare(`
    INSERT INTO job_assignments (
      id, job_number, tenant_id, worker_id, batch_id, stage_id, process_stage,
      work_instructions, required_quantity, completed_quantity, agreed_rate,
      start_date, deadline, status, started_at, created_at, updated_at
    ) VALUES (
      ?, 'JOB-2026-001', ?, 'usr_worker_03', ?, ?, 'Warping (Vaarpu)',
      'Prepare 4000 ends pure silk warp drum with 24-inch borders. Maintain strict uniform thread tension.',
      50.5, 20, 450, '2026-10-23', '2026-10-28', 'IN_PROGRESS', '2026-10-23', ?, ?
    )
  `).run(job1Id, tenant1Id, batch1Id, stg3, now, now);

  // Seed Work Offer from Owner 1 to Master Weaver Murugan for Stage 4 Weaving
  const ofr1Id = 'ofr_2026_001';
  db.prepare(`
    INSERT INTO work_offers (
      id, offer_number, tenant_id, worker_id, batch_id, stage_id, process_stage,
      work_instructions, quantity, unit, proposed_rate, start_date, deadline,
      materials_provided, quality_requirements, status, created_at, updated_at
    ) VALUES (
      ?, 'OF-2026-001', ?, 'usr_worker_01', ?, ?, 'Weaving / Loom',
      'Weave traditional Mayilkan Korvai pure silk wedding sarees. 2-person shuttle interlocking.',
      50, 'pieces', 2400, '2026-10-29', '2026-11-12',
      'Dyed warp beams and pure silver-gilt zari spools provided at Shed #2',
      'Zero reed marks, flawless zari density on pallu, Silk Mark quality standard',
      'PENDING', ?, ?
    )
  `).run(ofr1Id, tenant1Id, batch1Id, stg4, now, now);

  // Seed Work Request from Selvi Dyer to Owner 1
  const req1Id = 'req_2026_001';
  db.prepare(`
    INSERT INTO work_requests (
      id, request_number, tenant_id, worker_id, requested_process, work_type,
      quantity, unit, proposed_rate, expected_completion, message, status,
      created_at, updated_at
    ) VALUES (
      ?, 'WR-2026-001', ?, 'usr_worker_02', 'Dyeing', 'Contract Piece-Rate',
      60, 'kg', 350, '4 Days from Yarn Handover',
      'Available for natural plant extract and reactive vat dyeing for your upcoming silk batches.',
      'PENDING', ?, ?
    )
  `).run(req1Id, tenant1Id, now, now);

  // Seed In-app Notifications
  db.prepare(`
    INSERT INTO notifications (id, tenant_id, user_id, title, message, type, created_at)
    VALUES (?, ?, 'usr_worker_01', 'New Handloom Work Offer Received', 'Sri Venkateswara Handlooms sent you an offer for Weaving / Loom (50 pieces at  2,400/saree).', 'INFO', ?)
  `).run('ntf_01', tenant1Id, now);

  // Seed Raw Material Inventory for Tenant 1
  db.prepare(`
    INSERT INTO raw_materials (
      id, tenant_id, material_code, name, unit_of_measurement, available_quantity,
      reorder_level, purchase_cost_inr, supplier_name, created_at
    ) VALUES
    ('raw_01', ?, 'RAW-SILK-4A', 'Mulberry Silk Yarn 20/22D (Grade 4A)', 'kg', 85.0, 15.0, 4800, 'Karnataka Silk Marketing Board', ?),
    ('raw_02', ?, 'RAW-ZARI-GOLD', 'Surat Silver-Gilt Pure Gold Zari (Half Fine)', 'spools', 42.0, 10.0, 1650, 'Surat Jari Association', ?),
    ('raw_03', ?, 'RAW-DYE-CRIMSON', 'Eco Reactive Crimson Silk Dye Concentrate', 'kg', 24.5, 5.0, 920, 'Rainbow Dyestuff Madurai', ?),
    ('raw_04', ?, 'RAW-COT-80S', 'Organic Cotton Warp Hank 80s Count', 'kg', 110.0, 20.0, 680, 'Coimbatore Cotton Guild', ?)
  `).run(
    tenant1Id, now,
    tenant1Id, now,
    tenant1Id, now,
    tenant1Id, now
  );

  // Seed Finished Saree Stock
  db.prepare(`
    INSERT INTO finished_sarees (
      id, tenant_id, batch_id, saree_code, saree_title, saree_type, color,
      design_pattern, silk_mark_certified, quantity, cost_price_inr, selling_price_inr,
      rack_location, status, created_at
    ) VALUES
    ('sk_01', ?, ?, 'KAN-MAY-01', 'Mayilkan Korvai Pure Silk Bridal Saree', 'Kanchipuram Silk', 'Crimson Maroon & Temple Gold', 'Mayilkan Korvai with Pure Gold Zari', 1, 8, 15500, 32000, 'Heritage Showcase A1', 'IN_STOCK', ?),
    ('sk_02', ?, ?, 'KAN-VAI-02', 'Vaira Oosi Gold Zari Temple Border Silk Saree', 'Kanchipuram Silk', 'Royal Peacock Blue & Mustard', 'Vaira Oosi (Diamond Needle) Pinstripe', 1, 5, 18000, 36500, 'Heritage Showcase A2', 'IN_STOCK', ?)
  `).run(
    tenant1Id, batch1Id, now,
    tenant1Id, batch1Id, now
  );

  // Seed Sales Orders
  db.prepare(`
    INSERT INTO sales_orders (
      id, order_number, tenant_id, sale_type, customer_name, customer_phone, customer_city,
      total_items, total_amount_inr, discount_inr, net_amount_inr, payment_method,
      payment_status, notes, sale_date, created_at
    ) VALUES
    ('so_01', 'SO-2026-001', ?, 'WHOLESALE', 'Sundari Silks Boutique', '+91 98401 22334', 'Chennai', 4, 128000, 3000, 125000, 'BANK_TRANSFER', 'PAID', 'Bridal season order dispatched via express secure transport', '2026-10-24', ?),
    ('so_02', 'SO-2026-002', ?, 'RETAIL', 'Dr. Radhika Srinivasan', '+91 94440 98765', 'Coimbatore', 1, 32000, 0, 32000, 'UPI', 'PAID', 'Direct boutique counter purchase with Silk Mark certificate', '2026-10-25', ?)
  `).run(
    tenant1Id, now,
    tenant1Id, now
  );

  // Seed Worker Payment Record for Stage 2 Dyeing
  db.prepare(`
    INSERT INTO worker_payments (
      id, tenant_id, worker_id, production_id, stage_name, rate_type,
      agreed_rate, approved_quantity, gross_amount, advance_amount, deductions,
      net_payable, amount_paid, balance_remaining, payment_status, payment_method,
      transaction_ref, paid_at, created_at
    ) VALUES (
      'pay_01', ?, 'usr_worker_02', 'PRD-2026-001', 'Dyeing', 'PER_KG',
      350, 50.5, 17675, 2000, 0, 15675, 15675, 0, 'PAID', 'UPI', 'UPI-REF-908129841', '2026-10-23', ?
    )
  `).run(tenant1Id, now);

  db.prepare(`
    INSERT INTO notifications (id, tenant_id, user_id, title, message, type, created_at)
    VALUES (?, ?, 'usr_owner_01', 'New Artisan Work Request Received', 'Selvi Dyer submitted a work request for Silk Yarn Dyeing (60 kg capacity).', 'INFO', ?)
  `).run('ntf_02', tenant1Id, now);
  } // End of batch seeding
}
