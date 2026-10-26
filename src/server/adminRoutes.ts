import { Router, Response } from 'express';
import { db } from './db.js';
import { authenticate, requireRole, recordAuditLog, AuthenticatedRequest } from './auth.js';
import crypto from 'node:crypto';

export const adminRouter = Router();

// Platform Admin only
adminRouter.use(authenticate);
adminRouter.use(requireRole('ADMIN'));

// Helper to push in-app notification
function createNotification(tenantId: string | null, userId: string, title: string, message: string, type = 'INFO') {
  const notifId = 'ntf_' + crypto.randomBytes(8).toString('hex');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO notifications (id, tenant_id, user_id, title, message, type, read_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(notifId, tenantId, userId, title, message, type, now);
}

// 1. Admin Platform Overview & SaaS Metrics
adminRouter.get('/overview', (req: AuthenticatedRequest, res: Response) => {
  const tenantsCount = (db.prepare('SELECT COUNT(*) as count FROM tenants').get() as any).count;
  const ownersCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'OWNER'").get() as any).count;
  const workersCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'WORKER'").get() as any).count;
  const pendingOwnersCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'OWNER' AND status = 'PENDING_APPROVAL'").get() as any).count;
  const pendingWorkersCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'WORKER' AND status = 'PENDING_APPROVAL'").get() as any).count;
  const pendingUsersCount = pendingOwnersCount + pendingWorkersCount;
  const auditLogsCount = (db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as any).count;

  res.json({
    metrics: {
      tenantsCount,
      ownersCount,
      workersCount,
      pendingOwnersCount,
      pendingWorkersCount,
      pendingUsersCount,
      auditLogsCount
    },
    platformStatus: 'OPERATIONAL',
    systemTime: new Date().toISOString()
  });
});

// 2. Dedicated Owner Approvals Queue
adminRouter.get('/owner-approvals', (req: AuthenticatedRequest, res: Response) => {
  const pendingOwners = db.prepare(`
    SELECT u.id, u.tenant_id, u.role, u.full_name, u.username, u.email,
           u.phone, u.location, u.address, u.status, u.rejection_reason,
           u.additional_info_requested, u.created_at,
           t.business_name, t.textile_specialization, t.registration_number,
           t.loom_count, t.loom_types, t.subscription_status
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.role = 'OWNER' AND u.status = 'PENDING_APPROVAL'
    ORDER BY u.created_at DESC
  `).all() as any[];

  const formatted = pendingOwners.map(item => ({
    ...item,
    loom_types: JSON.parse(item.loom_types || '[]')
  }));

  res.json({ pendingOwners: formatted });
});

// 3. Dedicated Worker Approvals Queue
adminRouter.get('/worker-approvals', (req: AuthenticatedRequest, res: Response) => {
  const pendingWorkers = db.prepare(`
    SELECT u.id, u.tenant_id, u.role, u.full_name, u.username, u.email,
           u.phone, u.location, u.address, u.status, u.skills, u.experience_years,
           u.loom_type, u.daily_capacity, u.availability, u.rejection_reason,
           u.additional_info_requested, u.created_at
    FROM users u
    WHERE u.role = 'WORKER' AND u.status = 'PENDING_APPROVAL'
    ORDER BY u.created_at DESC
  `).all() as any[];

  const formatted = pendingWorkers.map(item => {
    let parsedSkills = [];
    try {
      parsedSkills = JSON.parse(item.skills || '[]');
    } catch {
      parsedSkills = [item.skills];
    }
    return {
      ...item,
      skills: parsedSkills
    };
  });

  res.json({ pendingWorkers: formatted });
});

// 4. Combined Pending Registrations Queue
adminRouter.get('/pending-registrations', (req: AuthenticatedRequest, res: Response) => {
  const pending = db.prepare(`
    SELECT u.id, u.tenant_id, u.role, u.full_name, u.username, u.email,
           u.phone, u.location, u.address, u.status, u.skills, u.experience_years,
           u.loom_type, u.daily_capacity, u.availability, u.rejection_reason,
           u.additional_info_requested, u.created_at,
           t.business_name, t.textile_specialization, t.registration_number, t.loom_count, t.loom_types
    FROM users u
    LEFT JOIN tenants t ON u.tenant_id = t.id
    WHERE u.status = 'PENDING_APPROVAL'
    ORDER BY u.created_at DESC
  `).all() as any[];

  const formatted = pending.map(item => {
    let parsedSkills = [];
    try {
      parsedSkills = JSON.parse(item.skills || '[]');
    } catch {
      parsedSkills = [item.skills];
    }
    return {
      ...item,
      skills: parsedSkills,
      loom_types: item.loom_types ? JSON.parse(item.loom_types) : []
    };
  });

  res.json({ pendingUsers: formatted });
});

// 5. Approve User Registration (Owner or Worker)
adminRouter.post('/approve-user/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User record not found.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET status = 'APPROVED',
        rejection_reason = NULL,
        additional_info_requested = NULL,
        updated_at = ?
    WHERE id = ?
  `).run(now, id);

  // If user is owner with tenant, activate tenant license
  if (user.tenant_id) {
    db.prepare("UPDATE tenants SET subscription_status = 'ACTIVE' WHERE id = ?").run(user.tenant_id);
  }

  // Record audit log
  recordAuditLog(
    user.tenant_id,
    req.user!.id,
    req.user!.username,
    'ADMIN',
    'USER_APPROVED',
    'USER',
    user.id,
    `Platform Administrator approved registration for ${user.full_name} (@${user.username}) as ${user.role}. Status updated to APPROVED.`,
    req.ip || '127.0.0.1'
  );

  // Send notification to the user
  createNotification(
    user.tenant_id,
    user.id,
    'Account Approved & Clearance Granted',
    user.role === 'OWNER'
      ? `Welcome to TRIZEN! Your saree production business account has been verified and activated. You can now launch production batches and manage your looms.`
      : `Welcome to TRIZEN! Your independent weaver credentials have been verified and approved. You are now discoverable by saree business owners.`,
    'SUCCESS'
  );

  res.json({
    success: true,
    message: `Account for ${user.full_name} has been approved and activated.`
  });
});

// 6. Reject User Registration (Owner or Worker) with Recorded Reason
adminRouter.post('/reject-user/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User record not found.' });
    return;
  }

  const rejectionReason = (reason && String(reason).trim()) || 'Registration did not satisfy textile guild verification requirements.';
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users
    SET status = 'REJECTED',
        rejection_reason = ?,
        updated_at = ?
    WHERE id = ?
  `).run(rejectionReason, now, id);

  // If owner, mark tenant inactive/rejected
  if (user.tenant_id) {
    db.prepare("UPDATE tenants SET subscription_status = 'REJECTED' WHERE id = ?").run(user.tenant_id);
  }

  // Revoke any active sessions
  db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(id);

  recordAuditLog(
    user.tenant_id,
    req.user!.id,
    req.user!.username,
    'ADMIN',
    'USER_REJECTED',
    'USER',
    user.id,
    `Platform Administrator rejected registration for ${user.full_name} (@${user.username}). Formal Reason: ${rejectionReason}`,
    req.ip || '127.0.0.1'
  );

  createNotification(
    user.tenant_id,
    user.id,
    'Registration Application Not Approved',
    `Your registration application could not be approved. Reason: ${rejectionReason}`,
    'WARNING'
  );

  res.json({
    success: true,
    message: `Registration for ${user.full_name} rejected with formal reason: ${rejectionReason}`
  });
});

// 7. Request Additional Information / Documentation
adminRouter.post('/request-info/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { infoMessage } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User record not found.' });
    return;
  }

  const requestText = (infoMessage && String(infoMessage).trim()) || 'Please provide verification of loom facility address and handloom craft certificates.';
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users
    SET additional_info_requested = ?,
        updated_at = ?
    WHERE id = ?
  `).run(requestText, now, id);

  recordAuditLog(
    user.tenant_id,
    req.user!.id,
    req.user!.username,
    'ADMIN',
    'ADDITIONAL_INFO_REQUESTED',
    'USER',
    user.id,
    `Platform Administrator requested additional information from ${user.full_name} (@${user.username}): "${requestText}"`,
    req.ip || '127.0.0.1'
  );

  createNotification(
    user.tenant_id,
    user.id,
    'Additional Information Required for Account Verification',
    `TRIZEN Administration requires additional clarification: ${requestText}. Please review your profile or submit details.`,
    'INFO'
  );

  res.json({
    success: true,
    message: `Information request transmitted to ${user.full_name}.`
  });
});

// 8. Update Account Status (Suspend, Re-Activate, etc.)
adminRouter.post('/change-status/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newStatus, reason } = req.body;

  if (!['APPROVED', 'PENDING_APPROVAL', 'REJECTED', 'SUSPENDED'].includes(newStatus)) {
    res.status(400).json({ error: 'INVALID_STATUS', message: 'Invalid target account status.' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User record not found.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET status = ?,
        rejection_reason = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    newStatus,
    newStatus === 'REJECTED' || newStatus === 'SUSPENDED' ? (reason || null) : null,
    now,
    id
  );

  if (newStatus === 'SUSPENDED' || newStatus === 'REJECTED') {
    db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(id);
  }

  if (user.tenant_id) {
    const tenantSubStatus = newStatus === 'APPROVED' ? 'ACTIVE' : newStatus === 'SUSPENDED' ? 'SUSPENDED' : 'INACTIVE';
    db.prepare('UPDATE tenants SET subscription_status = ? WHERE id = ?').run(tenantSubStatus, user.tenant_id);
  }

  recordAuditLog(
    user.tenant_id,
    req.user!.id,
    req.user!.username,
    'ADMIN',
    'ACCOUNT_STATUS_CHANGED',
    'USER',
    user.id,
    `Account status for ${user.full_name} changed to ${newStatus}. Note: ${reason || 'Administrative update.'}`,
    req.ip || '127.0.0.1'
  );

  res.json({
    success: true,
    message: `Account status for ${user.full_name} updated to ${newStatus}.`
  });
});

// 9. All Owners Directory
adminRouter.get('/all-owners', (req: AuthenticatedRequest, res: Response) => {
  const owners = db.prepare(`
    SELECT u.id, u.full_name, u.username, u.email, u.phone, u.location, u.address,
           u.status, u.rejection_reason, u.additional_info_requested, u.created_at,
           t.id as tenant_id, t.business_name, t.textile_specialization, t.registration_number,
           t.loom_count, t.loom_types, t.subscription_status
    FROM users u
    LEFT JOIN tenants t ON u.tenant_id = t.id
    WHERE u.role = 'OWNER'
    ORDER BY u.created_at DESC
  `).all() as any[];

  const formatted = owners.map(o => ({
    ...o,
    loom_types: o.loom_types ? JSON.parse(o.loom_types) : []
  }));

  res.json({ owners: formatted });
});

// 10. All Workers Directory
adminRouter.get('/all-workers', (req: AuthenticatedRequest, res: Response) => {
  const workers = db.prepare(`
    SELECT id, full_name, username, email, phone, location, address,
           status, skills, experience_years, loom_type, daily_capacity,
           availability, rejection_reason, additional_info_requested, created_at
    FROM users
    WHERE role = 'WORKER'
    ORDER BY created_at DESC
  `).all() as any[];

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

// 11. Platform Audit Logs
adminRouter.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const logs = db.prepare(`
    SELECT * FROM audit_logs
    ORDER BY id DESC
    LIMIT 200
  `).all();

  res.json({ logs });
});

// 12. Architectural Boundary Verification: Admin cannot manage customer daily production
adminRouter.get('/check-production-access', (req: AuthenticatedRequest, res: Response) => {
  res.status(403).json({
    error: 'ADMIN_PRODUCTION_CONTROL_RESTRICTED',
    message: 'Architecture Rule: Platform Administrator is strictly forbidden from managing customers daily saree production batches, stage approvals, or inventory.'
  });
});
