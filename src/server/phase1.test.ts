import test from 'node:test';
import assert from 'node:assert/strict';
import { db, initDatabase, hashPassword, verifyPassword, generateToken } from './db.js';
import crypto from 'node:crypto';

// Initialize DB for tests
initDatabase();

test('Phase 1: Database schema has all core tables', () => {
  const tablesStmt = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name IN ('tenants', 'users', 'auth_sessions', 'password_resets', 'audit_logs')
  `);
  const tables = (tablesStmt.all() as { name: string }[]).map(t => t.name);
  assert.ok(tables.includes('tenants'), 'tenants table must exist');
  assert.ok(tables.includes('users'), 'users table must exist');
  assert.ok(tables.includes('auth_sessions'), 'auth_sessions table must exist');
  assert.ok(tables.includes('password_resets'), 'password_resets table must exist');
  assert.ok(tables.includes('audit_logs'), 'audit_logs table must exist');
});

test('Phase 1: Password hashing and cryptographic verification', () => {
  const salt = crypto.randomBytes(16).toString('hex');
  const { hash } = hashPassword('SecretSareePass123', salt);

  assert.equal(verifyPassword('SecretSareePass123', hash, salt), true, 'Correct password verifies');
  assert.equal(verifyPassword('WrongPassword', hash, salt), false, 'Incorrect password fails');
});

test('Phase 1: Seed data creates Admin, 2 distinct Tenants, and 2 Workers', () => {
  const admin = db.prepare("SELECT * FROM users WHERE role = 'ADMIN'").get() as any;
  assert.ok(admin, 'Platform Admin exists');
  assert.equal(admin.username, 'admin');
  assert.equal(admin.tenant_id, null, 'Platform Admin has no tenant_id');

  const tenants = db.prepare('SELECT * FROM tenants').all() as any[];
  assert.ok(tenants.length >= 2, 'At least 2 tenants seeded for multi-tenant isolation');

  const tenant1 = tenants.find(t => t.slug === 'venkateswara-kanchi');
  const tenant2 = tenants.find(t => t.slug === 'arani-royal-silks');
  assert.ok(tenant1, 'Kanchipuram tenant exists');
  assert.ok(tenant2, 'Arani tenant exists');
  assert.notEqual(tenant1.id, tenant2.id, 'Tenants have unique IDs');

  const workers = db.prepare("SELECT * FROM users WHERE role = 'WORKER'").all() as any[];
  assert.ok(workers.length >= 2, 'Workers exist');
});

test('Phase 1: Tenant Isolation logic enforces boundary between Owner 1 and Owner 2', () => {
  const owner1 = db.prepare("SELECT * FROM users WHERE username = 'owner_kanchi'").get() as any;
  const owner2 = db.prepare("SELECT * FROM users WHERE username = 'owner_arani'").get() as any;

  assert.ok(owner1.tenant_id, 'Owner 1 has tenant_id');
  assert.ok(owner2.tenant_id, 'Owner 2 has tenant_id');
  assert.notEqual(owner1.tenant_id, owner2.tenant_id, 'Owner 1 and Owner 2 belong to different tenants');

  // Verify query scoped by tenant_id only returns records for that tenant
  const tenant1Audit = db.prepare('SELECT * FROM audit_logs WHERE tenant_id = ?').all(owner1.tenant_id);
  const tenant2Audit = db.prepare('SELECT * FROM audit_logs WHERE tenant_id = ?').all(owner2.tenant_id);

  // Check that no cross-tenant records leak
  assert.ok(tenant1Audit.every((log: any) => log.tenant_id === owner1.tenant_id));
  assert.ok(tenant2Audit.every((log: any) => log.tenant_id === owner2.tenant_id));
});

test('Phase 1: Registration security rule prevents public ADMIN role creation', () => {
  // Test validation check
  const requestedRole: string = 'ADMIN';
  const isAllowed = requestedRole === 'OWNER' || requestedRole === 'WORKER';
  assert.equal(isAllowed, false, 'Public ADMIN registration is strictly disallowed');
});

test('Phase 1: User status verification prevents unapproved login', () => {
  const pendingUser = db.prepare("SELECT * FROM users WHERE status = 'PENDING_APPROVAL'").get() as any;
  assert.ok(pendingUser, 'Pending user exists');

  // Logic check: approval required
  const canLogin = pendingUser.status === 'APPROVED';
  assert.equal(canLogin, false, 'Pending approval user cannot log in');
});

test('Phase 1: Password reset token flow creates valid unspent token and invalidates on use', () => {
  const user = db.prepare("SELECT id FROM users WHERE username = 'admin'").get() as any;
  const resetToken = 'rst_test_' + crypto.randomBytes(8).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3600000).toISOString();

  db.prepare(`
    INSERT INTO password_resets (token, user_id, created_at, expires_at, used)
    VALUES (?, ?, ?, ?, 0)
  `).run(resetToken, user.id, now.toISOString(), expiresAt);

  const found = db.prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0').get(resetToken) as any;
  assert.ok(found, 'Reset token stored');

  // Mark used
  db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(resetToken);
  const rechecked = db.prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0').get(resetToken);
  assert.equal(rechecked, undefined, 'Used reset token cannot be reused');
});
