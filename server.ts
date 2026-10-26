import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './src/server/db.js';
import { authRouter } from './src/server/authRoutes.js';
import { tenantRouter } from './src/server/tenantRoutes.js';
import { adminRouter } from './src/server/adminRoutes.js';
import { workerRouter } from './src/server/workerRoutes.js';
import { workflowRouter } from './src/server/workflowRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  // Initialize SQLite database schema and authentic seed data
  initDatabase();

  const app = express();
  app.use(express.json());

  // Health and System Info Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'HEALTHY',
      service: 'TRIZEN Smart Saree Production & Management SaaS',
      phase: 'Phase 1: Project structure, database, authentication, role authorization and tenant isolation',
      timestamp: new Date().toISOString()
    });
  });

  // Network Request Logger & Interceptor: Logs headers, auth tokens, payload, and status codes
  app.use('/api', (req, res, next) => {
    const startTime = Date.now();
    const { method, originalUrl, headers, body } = req;
    const authHeader = headers['authorization'] || headers['x-trizen-token'] || req.headers.cookie;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const statusIcon = statusCode < 400 ? '✅' : statusCode < 500 ? '⚠️' : '❌';
      console.log(
        `[TRIZEN HTTP] ${statusIcon} ${method} ${originalUrl} -> ${statusCode} (${duration}ms) | Auth: ${authHeader ? 'Active' : 'None'}`
      );
      if (statusCode >= 400 && body && Object.keys(body).length > 0) {
        console.log(`[TRIZEN HTTP PAYLOAD]`, JSON.stringify(body));
      }
    });

    next();
  });

  // REST API Endpoints with strict role authorization & tenant isolation
  app.use('/api/auth', authRouter);
  app.use('/api/tenant', tenantRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/worker', workerRouter);
  app.use('/api/workflow', workflowRouter);

  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // In dev, mount Vite middleware directly
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built static SPA
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TRIZEN Server online at http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('Fatal error starting TRIZEN server:', err);
  process.exit(1);
});
