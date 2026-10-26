import { Request, Response, NextFunction } from 'express';
import { db, hashPassword, verifyPassword, generateToken } from './db.js';
import crypto from 'node:crypto';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenant_id: string | null;
    role: 'ADMIN' | 'OWNER' | 'WORKER';
    full_name: string;
    username: string;
    email: string;
    phone: string;
    status: string;
    location: string;
  };
  tenant?: {
    id: string;
    business_name: string;
    slug: string;
    location: string;
    textile_specialization: string;
    loom_count: number;
    loom_types: string[];
    subscription_status: string;
  } | null;
}

// Log audit event helper
export function recordAuditLog(
  tenantId: string | null,
  userId: string,
  actorUsername: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: string,
  ipAddress = '127.0.0.1'
) {
  const timestamp = new Date().toISOString();
  db.prepare(`
    INSERT INTO audit_logs (
      tenant_id, user_id, actor_username, actor_role, action,
      entity_type, entity_id, details, ip_address, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tenantId,
    userId,
    actorUsername,
    actorRole,
    action,
    entityType,
    entityId,
    details,
    ipAddress,
    timestamp
  );
}

// Middleware: Authenticate User via Bearer Token, x-trizen-token header, or cookie
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-trizen-token']) {
    token = String(req.headers['x-trizen-token']).trim();
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)trizen_token=([^;]+)/);
    if (match) token = match[1].trim();
  }

  if (!token || token === 'null' || token === 'undefined' || token === '') {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required. No token provided.' });
    return;
  }

  // Look up session
  const sessionStmt = db.prepare(`
    SELECT s.token, s.expires_at, u.id, u.tenant_id, u.role, u.full_name,
           u.username, u.email, u.phone, u.status, u.location
    FROM auth_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `);

  const session = sessionStmt.get(token) as any;

  if (!session) {
    res.status(401).json({ error: 'SESSION_INVALID', message: 'Session expired or invalid.' });
    return;
  }

  // Check expiry
  if (new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    res.status(401).json({ error: 'SESSION_EXPIRED', message: 'Session has expired. Please sign in again.' });
    return;
  }

  // Check user status
  if (session.status !== 'APPROVED') {
    res.status(403).json({
      error: 'ACCOUNT_NOT_ACTIVE',
      message: `Account status is ${session.status}. Access denied.`,
      status: session.status
    });
    return;
  }

  req.user = {
    id: session.id,
    tenant_id: session.tenant_id,
    role: session.role,
    full_name: session.full_name,
    username: session.username,
    email: session.email,
    phone: session.phone,
    status: session.status,
    location: session.location
  };

  // If user belongs to a tenant (Owner), load tenant record
  if (req.user.tenant_id) {
    const tenantStmt = db.prepare('SELECT * FROM tenants WHERE id = ?');
    const tenant = tenantStmt.get(req.user.tenant_id) as any;
    if (tenant) {
      req.tenant = {
        id: tenant.id,
        business_name: tenant.business_name,
        slug: tenant.slug,
        location: tenant.location,
        textile_specialization: tenant.textile_specialization,
        loom_count: tenant.loom_count,
        loom_types: JSON.parse(tenant.loom_types || '[]'),
        subscription_status: tenant.subscription_status
      };
    }
  }

  next();
}

// Middleware: Require specific role(s)
export function requireRole(...allowedRoles: ('ADMIN' | 'OWNER' | 'WORKER')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Forbidden: Access requires [${allowedRoles.join(' or ')}] authorization. Your role is ${req.user.role}.`
      });
      return;
    }
    next();
  };
}

// Middleware: Strict Tenant Isolation Guard
export function enforceTenantIsolation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }

  // Platform admin is NOT allowed to operate as a tenant owner
  if (req.user.role === 'ADMIN') {
    res.status(403).json({
      error: 'ADMIN_ACCESS_BLOCKED',
      message: 'Platform Administrator cannot manage daily customer production batches or stock directly.'
    });
    return;
  }

  // Owner must have a valid tenant_id
  if (req.user.role === 'OWNER') {
    if (!req.user.tenant_id) {
      res.status(403).json({
        error: 'TENANT_NOT_FOUND',
        message: 'No textile business tenant linked with this owner account.'
      });
      return;
    }

    // If client supplied tenantId in params or body, it MUST match req.user.tenant_id
    const targetTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
    if (targetTenantId && targetTenantId !== req.user.tenant_id) {
      recordAuditLog(
        req.user.tenant_id,
        req.user.id,
        req.user.username,
        req.user.role,
        'TENANT_ISOLATION_VIOLATION_ATTEMPT',
        'TENANT',
        String(targetTenantId),
        `User ${req.user.username} from tenant ${req.user.tenant_id} attempted unauthorized access to tenant ${targetTenantId}`,
        req.ip || '127.0.0.1'
      );

      res.status(403).json({
        error: 'TENANT_ISOLATION_VIOLATION',
        message: 'Security Violation: You are not authorized to view or modify records belonging to another textile business.'
      });
      return;
    }
  }

  next();
}
