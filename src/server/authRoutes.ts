import { Router, Request, Response } from 'express';
import { db, hashPassword, verifyPassword, generateToken } from './db.js';
import { recordAuditLog, authenticate, AuthenticatedRequest } from './auth.js';
import crypto from 'node:crypto';

export const authRouter = Router();

// Helper to sanitize user object for responses
function sanitizeUser(user: any) {
  const { password_hash, salt, ...safe } = user;
  if (typeof safe.skills === 'string') {
    try {
      safe.skills = JSON.parse(safe.skills);
    } catch {
      safe.skills = [];
    }
  }
  return safe;
}

// 1. User Registration (Public)
authRouter.post('/register', (req: Request, res: Response) => {
  const {
    role,
    fullName,
    username,
    email,
    phone,
    password,
    location,
    address,
    // Owner specific
    businessName,
    registrationNumber,
    sareeSpecialization,
    loomCount,
    loomTypes,
    // Worker specific
    skills,
    experienceYears,
    loomType,
    dailyCapacity,
    availability
  } = req.body;

  // STRICT RULE: Never allow user to select Admin role through public registration
  if (role === 'ADMIN' || req.body.role?.toUpperCase() === 'ADMIN') {
    recordAuditLog(
      null,
      'anonymous',
      username || 'unknown',
      'ANONYMOUS',
      'ILLEGAL_ADMIN_REGISTRATION_ATTEMPT',
      'USER',
      null,
      'Attempted to submit public registration with prohibited ADMIN role',
      req.ip || '127.0.0.1'
    );
    res.status(403).json({
      error: 'ADMIN_REGISTRATION_FORBIDDEN',
      message: 'Unauthorized: Platform Administrator accounts cannot be created via public registration.'
    });
    return;
  }

  // Validate core required fields
  if (!role || !fullName || !username || !email || !password || !phone) {
    res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Full name, username, email, phone, role, and password are required.'
    });
    return;
  }

  if (role !== 'OWNER' && role !== 'WORKER') {
    res.status(400).json({
      error: 'INVALID_ROLE',
      message: 'Role must be either OWNER (Saree Producer) or WORKER (Independent Weaver/Artisan).'
    });
    return;
  }

  // Check username or email uniqueness
  const existingUser = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(username, email) as any;
  if (existingUser) {
    res.status(409).json({
      error: 'USER_EXISTS',
      message: existingUser.username === username ? 'Username is already taken.' : 'Email is already registered.'
    });
    return;
  }

  const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
  const now = new Date().toISOString();
  const { hash, salt } = hashPassword(password);

  // OWNER REGISTRATION FLOW
  if (role === 'OWNER') {
    if (!businessName || !sareeSpecialization) {
      res.status(400).json({
        error: 'MISSING_BUSINESS_INFO',
        message: 'Business name and saree textile specialization are required for textile owner registration.'
      });
      return;
    }

    const tenantId = 'tnt_' + crypto.randomBytes(8).toString('hex');
    const slug = (businessName || 'saree-unit')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + crypto.randomBytes(3).toString('hex');

    // Create Tenant (Business)
    db.prepare(`
      INSERT INTO tenants (
        id, business_name, slug, owner_user_id, location, registration_number,
        textile_specialization, loom_count, loom_types, subscription_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `).run(
      tenantId,
      businessName,
      slug,
      userId,
      location || 'Tamil Nadu',
      registrationNumber || null,
      sareeSpecialization,
      Number(loomCount) || 4,
      JSON.stringify(loomTypes || ['Traditional Pit Handloom', 'Frame Loom']),
      now
    );

    // Create Owner User (Pending Admin Approval)
    db.prepare(`
      INSERT INTO users (
        id, tenant_id, role, full_name, username, email, phone,
        password_hash, salt, address, location, status, created_at, updated_at
      ) VALUES (?, ?, 'OWNER', ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?)
    `).run(
      userId,
      tenantId,
      fullName,
      username,
      email,
      phone,
      hash,
      salt,
      address || null,
      location || 'Tamil Nadu',
      now,
      now
    );

    // Record audit log
    recordAuditLog(
      tenantId,
      userId,
      username,
      'OWNER',
      'OWNER_REGISTRATION_SUBMITTED',
      'USER',
      userId,
      `New textile business '${businessName}' registered by ${fullName} (@${username}). Status: PENDING_APPROVAL`,
      req.ip || '127.0.0.1'
    );

    res.status(201).json({
      success: true,
      role: 'OWNER',
      userId,
      tenantId,
      status: 'PENDING_APPROVAL',
      message: 'Business registration submitted successfully. Your account is pending verification by TRIZEN Administration before activation.'
    });
    return;
  }

  // WORKER REGISTRATION FLOW
  if (role === 'WORKER') {
    const formattedSkills = Array.isArray(skills) ? JSON.stringify(skills) : JSON.stringify([skills || 'Handloom Weaving']);

    db.prepare(`
      INSERT INTO users (
        id, tenant_id, role, full_name, username, email, phone,
        password_hash, salt, address, location, status, skills, experience_years,
        loom_type, daily_capacity, availability, created_at, updated_at
      ) VALUES (?, NULL, 'WORKER', ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      fullName,
      username,
      email,
      phone,
      hash,
      salt,
      address || null,
      location || 'Tamil Nadu',
      formattedSkills,
      Number(experienceYears) || 0,
      loomType || 'Handloom',
      dailyCapacity || '1 saree / 3-4 days',
      availability || 'AVAILABLE',
      now,
      now
    );

    // Record audit log
    recordAuditLog(
      null,
      userId,
      username,
      'WORKER',
      'WORKER_REGISTRATION_SUBMITTED',
      'USER',
      userId,
      `Independent weaver/artisan ${fullName} (@${username}) registered. Status: PENDING_APPROVAL`,
      req.ip || '127.0.0.1'
    );

    res.status(201).json({
      success: true,
      role: 'WORKER',
      userId,
      status: 'PENDING_APPROVAL',
      message: 'Weaver registration submitted successfully. Your profile is pending verification by TRIZEN Administration.'
    });
    return;
  }
});

// 2. User Login
authRouter.post('/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Username/Email and password are required.' });
    return;
  }

  const user = db.prepare(`
    SELECT * FROM users WHERE username = ? OR email = ?
  `).get(identifier, identifier) as any;

  if (!user) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid username/email or password.' });
    return;
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    recordAuditLog(
      user.tenant_id,
      user.id,
      user.username,
      user.role,
      'AUTH_LOGIN_FAILED',
      'USER',
      user.id,
      `Failed login attempt for user ${user.username}`,
      req.ip || '127.0.0.1'
    );
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid username/email or password.' });
    return;
  }

  // Account status check
  if (user.status === 'PENDING_APPROVAL') {
    res.status(403).json({
      error: 'ACCOUNT_PENDING_APPROVAL',
      status: 'PENDING_APPROVAL',
      message: 'Your registration is currently awaiting verification by TRIZEN Administration. Once reviewed, full access will be granted.'
    });
    return;
  }

  if (user.status === 'REJECTED') {
    res.status(403).json({
      error: 'ACCOUNT_REJECTED',
      status: 'REJECTED',
      rejectionReason: user.rejection_reason || 'Registration did not meet verification criteria.',
      message: `Your registration was not approved. Reason: ${user.rejection_reason || 'Details required.'}`
    });
    return;
  }

  if (user.status === 'SUSPENDED') {
    res.status(403).json({
      error: 'ACCOUNT_SUSPENDED',
      status: 'SUSPENDED',
      message: 'This account has been temporarily suspended. Please contact TRIZEN operations.'
    });
    return;
  }

  // Create active session token
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  db.prepare(`
    INSERT INTO auth_sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, user.id, now.toISOString(), expiresAt);

  // Load tenant if owner
  let tenantData = null;
  if (user.tenant_id) {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(user.tenant_id) as any;
    if (tenant) {
      tenantData = {
        ...tenant,
        loom_types: JSON.parse(tenant.loom_types || '[]')
      };
    }
  }

  // Log successful login
  recordAuditLog(
    user.tenant_id,
    user.id,
    user.username,
    user.role,
    'AUTH_LOGIN_SUCCESS',
    'SESSION',
    token.slice(0, 10) + '...',
    `User ${user.username} (${user.role}) logged in successfully`,
    req.ip || '127.0.0.1'
  );

  // Set cookie for browser sessions
  res.setHeader('Set-Cookie', `trizen_token=${token}; Path=/; Max-Age=2592000; SameSite=Lax`);

  res.json({
    success: true,
    token,
    user: sanitizeUser(user),
    tenant: tenantData
  });
});

// 3. User Logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : String(req.headers['x-trizen-token'] || '');
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)trizen_token=([^;]+)/);
    if (match) token = match[1];
  }

  if (token) {
    const session = db.prepare('SELECT user_id FROM auth_sessions WHERE token = ?').get(token) as any;
    if (session) {
      const user = db.prepare('SELECT id, username, role, tenant_id FROM users WHERE id = ?').get(session.user_id) as any;
      if (user) {
        recordAuditLog(
          user.tenant_id,
          user.id,
          user.username,
          user.role,
          'AUTH_LOGOUT',
          'SESSION',
          null,
          `User ${user.username} logged out`,
          req.ip || '127.0.0.1'
        );
      }
    }
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
  }

  res.setHeader('Set-Cookie', 'trizen_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax');
  res.json({ success: true, message: 'Signed out successfully.' });
});

// 4. Current User Session Check
authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  res.json({
    user: sanitizeUser(user),
    tenant: req.tenant || null
  });
});

// 5. Password Reset Request
authRouter.post('/forgot-password', (req: Request, res: Response) => {
  const { identifier } = req.body;
  if (!identifier) {
    res.status(400).json({ error: 'MISSING_FIELD', message: 'Email or username is required.' });
    return;
  }

  const user = db.prepare('SELECT id, username, email, tenant_id FROM users WHERE username = ? OR email = ?').get(identifier, identifier) as any;
  if (!user) {
    // Return generic success to avoid enumeration
    res.json({
      success: true,
      message: 'If the account exists, password recovery instructions have been initiated.'
    });
    return;
  }

  const token = 'rst_' + crypto.randomBytes(24).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour

  db.prepare(`
    INSERT INTO password_resets (token, user_id, created_at, expires_at, used)
    VALUES (?, ?, ?, ?, 0)
  `).run(token, user.id, now.toISOString(), expiresAt);

  recordAuditLog(
    user.tenant_id,
    user.id,
    user.username,
    'USER',
    'PASSWORD_RESET_REQUESTED',
    'USER',
    user.id,
    `Password recovery token generated for user ${user.username}`,
    req.ip || '127.0.0.1'
  );

  res.json({
    success: true,
    resetToken: token,
    message: 'Password reset token has been issued. Use this token to set a new password.'
  });
});

// 6. Reset Password Execution
authRouter.post('/reset-password', (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    res.status(400).json({ error: 'MISSING_FIELDS', message: 'Reset token and new password are required.' });
    return;
  }

  const resetRecord = db.prepare(`
    SELECT r.*, u.id as user_id, u.username, u.tenant_id, u.role
    FROM password_resets r
    JOIN users u ON r.user_id = u.id
    WHERE r.token = ? AND r.used = 0
  `).get(token) as any;

  if (!resetRecord) {
    res.status(400).json({ error: 'INVALID_TOKEN', message: 'Reset token is invalid or has already been used.' });
    return;
  }

  if (new Date(resetRecord.expires_at) < new Date()) {
    res.status(400).json({ error: 'EXPIRED_TOKEN', message: 'Reset token has expired. Please request a new one.' });
    return;
  }

  const { hash, salt } = hashPassword(newPassword);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?
  `).run(hash, salt, now, resetRecord.user_id);

  // Mark token used
  db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token);

  // Invalidate any existing sessions for security
  db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(resetRecord.user_id);

  recordAuditLog(
    resetRecord.tenant_id,
    resetRecord.user_id,
    resetRecord.username,
    resetRecord.role,
    'PASSWORD_RESET_COMPLETED',
    'USER',
    resetRecord.user_id,
    `User ${resetRecord.username} reset password successfully. Active sessions revoked.`,
    req.ip || '127.0.0.1'
  );

  res.json({
    success: true,
    message: 'Password reset successful. You may now log in with your new credentials.'
  });
});

// 7. Developer / Testing Quick Persona Switcher
// Enables immediate switching between Admin, Owners, and Workers with authenticated real session tokens
authRouter.post('/quick-switch', (req: Request, res: Response) => {
  const { username, role } = req.body || {};

  let user: any = null;
  if (username && typeof username === 'string') {
    user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim()) as any;
  } else if (role && typeof role === 'string') {
    user = db.prepare('SELECT * FROM users WHERE role = ? AND status = ? ORDER BY id ASC LIMIT 1').get(role.toUpperCase().trim(), 'APPROVED') as any;
  }

  if (!user) {
    res.status(404).json({
      error: 'USER_NOT_FOUND',
      message: username ? `Persona '@${username}' not found.` : `No active approved user found for role '${role || 'unknown'}'.`
    });
    return;
  }

  if (user.status !== 'APPROVED') {
    res.status(403).json({
      error: 'ACCOUNT_NOT_APPROVED',
      status: user.status,
      message: `User '@${username}' has status '${user.status}' (pending administrator verification).`
    });
    return;
  }

  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO auth_sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, user.id, now.toISOString(), expiresAt);

  let tenantData = null;
  if (user.tenant_id) {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(user.tenant_id) as any;
    if (tenant) {
      tenantData = {
        ...tenant,
        loom_types: JSON.parse(tenant.loom_types || '[]')
      };
    }
  }

  recordAuditLog(
    user.tenant_id,
    user.id,
    user.username,
    user.role,
    'DEMO_PERSONA_SWITCH',
    'SESSION',
    user.username,
    `Switched active persona to ${user.username} (${user.role})`,
    req.ip || '127.0.0.1'
  );

  // Set cookie for browser sessions
  res.setHeader('Set-Cookie', `trizen_token=${token}; Path=/; Max-Age=2592000; SameSite=Lax`);

  res.json({
    success: true,
    token,
    user: sanitizeUser(user),
    tenant: tenantData
  });
});
