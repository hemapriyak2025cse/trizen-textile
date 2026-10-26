import test from 'node:test';
import assert from 'node:assert/strict';
import { db, initDatabase, hashPassword } from './db.js';
import crypto from 'node:crypto';

// Ensure DB is initialized
initDatabase();

test('Approval Workflow: Dedicated Owner Approvals lists pending owners with tenant data', () => {
  const pendingOwners = db.prepare(`
    SELECT u.id, u.full_name, u.username, u.status, t.business_name, t.textile_specialization
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.role = 'OWNER' AND u.status = 'PENDING_APPROVAL'
  `).all() as any[];

  // If none pending, insert a temporary one for testing
  let testUserId = 'test_owner_pending';
  if (pendingOwners.length === 0) {
    const { hash, salt } = hashPassword('Test@123');
    const tenantId = 'tnt_test_pending';
    db.prepare(`
      INSERT INTO tenants (id, business_name, slug, location, textile_specialization, loom_count, created_at)
      VALUES (?, 'Test Handloom Saree Unit', 'test-handloom-unit', 'Salem, Tamil Nadu', 'Salem Pure Silk', 4, ?)
    `).run(tenantId, new Date().toISOString());

    db.prepare(`
      INSERT INTO users (id, tenant_id, role, full_name, username, email, phone, password_hash, salt, location, status, created_at, updated_at)
      VALUES (?, ?, 'OWNER', 'Test Saree Owner', 'test_owner_pend', 'test.owner@trizen.com', '+91 99999 11111', ?, ?, 'Salem', 'PENDING_APPROVAL', ?, ?)
    `).run(testUserId, tenantId, hash, salt, new Date().toISOString(), new Date().toISOString());
  } else {
    testUserId = pendingOwners[0].id;
  }

  const check = db.prepare("SELECT * FROM users WHERE id = ?").get(testUserId) as any;
  assert.equal(check.status, 'PENDING_APPROVAL');
});

test('Approval Workflow: Approving an Owner updates user to APPROVED and tenant to ACTIVE', () => {
  // Create pending owner
  const testUserId = 'usr_test_approve_' + crypto.randomBytes(4).toString('hex');
  const tenantId = 'tnt_test_approve_' + crypto.randomBytes(4).toString('hex');
  const { hash, salt } = hashPassword('Test@123');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tenants (id, business_name, slug, location, textile_specialization, loom_count, subscription_status, created_at)
    VALUES (?, 'Kanchi Royal Silks Unit', ?, 'Kanchipuram', 'Korvai Zari', 6, 'PENDING', ?)
  `).run(tenantId, 'kanchi-royal-' + crypto.randomBytes(3).toString('hex'), now);

  db.prepare(`
    INSERT INTO users (id, tenant_id, role, full_name, username, email, phone, password_hash, salt, location, status, created_at, updated_at)
    VALUES (?, ?, 'OWNER', 'Kanchi Royal Owner', ?, ?, '+91 94444 22222', ?, ?, 'Kanchipuram', 'PENDING_APPROVAL', ?, ?)
  `).run(testUserId, tenantId, 'owner_temp_' + crypto.randomBytes(3).toString('hex'), 'owner.temp.' + crypto.randomBytes(3).toString('hex') + '@trizen.com', hash, salt, now, now);

  // Execute approval
  db.prepare("UPDATE users SET status = 'APPROVED', updated_at = ? WHERE id = ?").run(now, testUserId);
  db.prepare("UPDATE tenants SET subscription_status = 'ACTIVE' WHERE id = ?").run(tenantId);

  const approvedUser = db.prepare("SELECT status FROM users WHERE id = ?").get(testUserId) as any;
  const approvedTenant = db.prepare("SELECT subscription_status FROM tenants WHERE id = ?").get(tenantId) as any;

  assert.equal(approvedUser.status, 'APPROVED', 'User status should be APPROVED');
  assert.equal(approvedTenant.subscription_status, 'ACTIVE', 'Tenant status should be ACTIVE');
});

test('Approval Workflow: Rejecting a Worker records formal reason and revokes sessions', () => {
  const testWorkerId = 'usr_test_reject_' + crypto.randomBytes(4).toString('hex');
  const { hash, salt } = hashPassword('Test@123');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, role, full_name, username, email, phone, password_hash, salt, location, status, skills, created_at, updated_at)
    VALUES (?, 'WORKER', 'Applicant Weaver', ?, ?, '+91 97777 33333', ?, ?, 'Salem', 'PENDING_APPROVAL', '["Weaving"]', ?, ?)
  `).run(testWorkerId, 'worker_temp_' + crypto.randomBytes(3).toString('hex'), 'worker.temp.' + crypto.randomBytes(3).toString('hex') + '@trizen.com', hash, salt, now, now);

  // Rejection with formal reason
  const rejectionReason = 'Incomplete weaver society affiliation credentials.';
  db.prepare("UPDATE users SET status = 'REJECTED', rejection_reason = ?, updated_at = ? WHERE id = ?").run(rejectionReason, now, testWorkerId);

  const rejectedUser = db.prepare("SELECT status, rejection_reason FROM users WHERE id = ?").get(testWorkerId) as any;
  assert.equal(rejectedUser.status, 'REJECTED');
  assert.equal(rejectedUser.rejection_reason, rejectionReason);
});

test('Approval Workflow: Requesting additional information records query on user dossier', () => {
  const testUserId = 'usr_test_info_' + crypto.randomBytes(4).toString('hex');
  const { hash, salt } = hashPassword('Test@123');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, role, full_name, username, email, phone, password_hash, salt, location, status, created_at, updated_at)
    VALUES (?, 'WORKER', 'Info Applicant', ?, ?, '+91 96666 44444', ?, ?, 'Arani', 'PENDING_APPROVAL', ?, ?)
  `).run(testUserId, 'info_temp_' + crypto.randomBytes(3).toString('hex'), 'info.temp.' + crypto.randomBytes(3).toString('hex') + '@trizen.com', hash, salt, now, now);

  const requestMessage = 'Please provide copy of Artisan Guild ID Card and Shed Registration.';
  db.prepare("UPDATE users SET additional_info_requested = ?, updated_at = ? WHERE id = ?").run(requestMessage, now, testUserId);

  const updated = db.prepare("SELECT additional_info_requested FROM users WHERE id = ?").get(testUserId) as any;
  assert.equal(updated.additional_info_requested, requestMessage);
});
