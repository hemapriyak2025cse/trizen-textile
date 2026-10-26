import { Router, Response } from 'express';
import { db } from './db.js';
import { authenticate, requireRole, enforceTenantIsolation, recordAuditLog, AuthenticatedRequest } from './auth.js';

export const tenantRouter = Router();

// Apply auth and owner role to all tenant routes
tenantRouter.use(authenticate);
tenantRouter.use(requireRole('OWNER'));
tenantRouter.use(enforceTenantIsolation);

// 1. Get current tenant's profile
tenantRouter.get('/profile', (req: AuthenticatedRequest, res: Response) => {
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.user!.tenant_id) as any;
  if (!tenant) {
    res.status(404).json({ error: 'TENANT_NOT_FOUND', message: 'Tenant record not found.' });
    return;
  }

  res.json({
    tenant: {
      ...tenant,
      loom_types: JSON.parse(tenant.loom_types || '[]')
    }
  });
});

// 2. Update tenant's business profile
tenantRouter.put('/profile', (req: AuthenticatedRequest, res: Response) => {
  const { business_name, location, registration_number, textile_specialization, loom_count, loom_types } = req.body;
  const tenantId = req.user!.tenant_id;

  db.prepare(`
    UPDATE tenants
    SET business_name = COALESCE(?, business_name),
        location = COALESCE(?, location),
        registration_number = COALESCE(?, registration_number),
        textile_specialization = COALESCE(?, textile_specialization),
        loom_count = COALESCE(?, loom_count),
        loom_types = COALESCE(?, loom_types)
    WHERE id = ?
  `).run(
    business_name,
    location,
    registration_number,
    textile_specialization,
    loom_count ? Number(loom_count) : null,
    loom_types ? JSON.stringify(loom_types) : null,
    tenantId
  );

  recordAuditLog(
    tenantId,
    req.user!.id,
    req.user!.username,
    'OWNER',
    'TENANT_PROFILE_UPDATED',
    'TENANT',
    tenantId,
    `Updated business profile for ${business_name || 'tenant'}`,
    req.ip || '127.0.0.1'
  );

  const updated = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId) as any;
  res.json({
    success: true,
    tenant: {
      ...updated,
      loom_types: JSON.parse(updated.loom_types || '[]')
    }
  });
});

// 3. Tenant-Isolated Audit Logs
tenantRouter.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  // STRICT TENANT ISOLATION: Must only return logs where tenant_id matches req.user.tenant_id
  const logs = db.prepare(`
    SELECT * FROM audit_logs
    WHERE tenant_id = ?
    ORDER BY id DESC
    LIMIT 100
  `).all(req.user!.tenant_id);

  res.json({ logs });
});

// 4. Tenant Overview & Loom Stats
tenantRouter.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId) as any;

  res.json({
    tenantId,
    businessName: tenant.business_name,
    specialization: tenant.textile_specialization,
    location: tenant.location,
    loomCount: tenant.loom_count,
    subscriptionStatus: tenant.subscription_status,
    createdAt: tenant.created_at
  });
});
