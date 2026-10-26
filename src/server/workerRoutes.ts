import { Router, Response } from 'express';
import { db } from './db.js';
import { authenticate, requireRole, recordAuditLog, AuthenticatedRequest } from './auth.js';

export const workerRouter = Router();

// Worker role only
workerRouter.use(authenticate);
workerRouter.use(requireRole('WORKER'));

// 1. Get Worker Profile
workerRouter.get('/profile', (req: AuthenticatedRequest, res: Response) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND' });
    return;
  }

  let skills = [];
  try {
    skills = JSON.parse(user.skills || '[]');
  } catch {
    skills = [user.skills];
  }

  res.json({
    worker: {
      id: user.id,
      fullName: user.full_name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      location: user.location,
      address: user.address,
      status: user.status,
      skills,
      experienceYears: user.experience_years,
      loomType: user.loom_type,
      dailyCapacity: user.daily_capacity,
      availability: user.availability,
      notes: user.notes,
      createdAt: user.created_at
    }
  });
});

// 2. Toggle Worker Availability
workerRouter.put('/availability', (req: AuthenticatedRequest, res: Response) => {
  const { availability } = req.body;
  if (availability !== 'AVAILABLE' && availability !== 'BUSY') {
    res.status(400).json({ error: 'INVALID_STATUS', message: 'Availability must be AVAILABLE or BUSY.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET availability = ?, updated_at = ? WHERE id = ?').run(availability, now, req.user!.id);

  recordAuditLog(
    null,
    req.user!.id,
    req.user!.username,
    'WORKER',
    'WORKER_AVAILABILITY_CHANGED',
    'USER',
    req.user!.id,
    `Worker ${req.user!.username} set availability status to ${availability}`,
    req.ip || '127.0.0.1'
  );

  res.json({
    success: true,
    availability,
    message: `Availability updated to ${availability}.`
  });
});

// 3. Update Worker Profile & Textile Skills
workerRouter.put('/profile', (req: AuthenticatedRequest, res: Response) => {
  const { phone, address, skills, experienceYears, loomType, dailyCapacity, notes } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users
    SET phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        skills = COALESCE(?, skills),
        experience_years = COALESCE(?, experience_years),
        loom_type = COALESCE(?, loom_type),
        daily_capacity = COALESCE(?, daily_capacity),
        notes = COALESCE(?, notes),
        updated_at = ?
    WHERE id = ?
  `).run(
    phone,
    address,
    skills ? JSON.stringify(skills) : null,
    experienceYears ? Number(experienceYears) : null,
    loomType,
    dailyCapacity,
    notes,
    now,
    req.user!.id
  );

  recordAuditLog(
    null,
    req.user!.id,
    req.user!.username,
    'WORKER',
    'WORKER_PROFILE_UPDATED',
    'USER',
    req.user!.id,
    `Worker ${req.user!.username} updated artisan profile & technical skills.`,
    req.ip || '127.0.0.1'
  );

  res.json({ success: true, message: 'Profile updated successfully.' });
});

// 4. Discover Registered Saree Producers & Looms (Public Directory for Job Discovery)
workerRouter.get('/search-owners', (req: AuthenticatedRequest, res: Response) => {
  const { query, location } = req.query;

  let sql = `
    SELECT id, business_name, location, textile_specialization, loom_count, loom_types
    FROM tenants
    WHERE subscription_status = 'ACTIVE'
  `;
  const params: any[] = [];

  if (query) {
    sql += ` AND (business_name LIKE ? OR textile_specialization LIKE ?)`;
    params.push(`%${query}%`, `%${query}%`);
  }
  if (location) {
    sql += ` AND location LIKE ?`;
    params.push(`%${location}%`);
  }

  sql += ` ORDER BY business_name ASC LIMIT 50`;

  const businesses = db.prepare(sql).all(...params) as any[];
  const formatted = businesses.map(b => ({
    ...b,
    loom_types: JSON.parse(b.loom_types || '[]')
  }));

  res.json({ businesses: formatted });
});
