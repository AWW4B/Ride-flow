// ============================================================
// src/server.ts — Express application entry point
// ============================================================
//
// TODO 1: Install core deps
//   npm install express cors helmet morgan express-async-errors
//   npm install -D @types/express @types/cors @types/morgan ts-node-dev typescript
//
// TODO 2: tsconfig.json — make sure you have:
//   "target": "ES2020", "module": "commonjs",
//   "outDir": "dist", "rootDir": "src",
//   "paths": { "@/*": ["src/*"] }   ← optional, for cleaner imports
//
// TODO 3: package.json scripts:
//   "dev":   "ts-node-dev --respawn src/server.ts"
//   "build": "tsc"
//   "start": "node dist/server.js"
//
// TODO 4: Bootstrap order (IMPORTANT — follow this sequence):
//
//   import 'dotenv/config';                   // MUST be first line
//   import express from 'express';
//   import http from 'http';
//   import cors from 'cors';
//   import helmet from 'helmet';
//   import morgan from 'morgan';
//   import 'express-async-errors';            // makes async errors propagate
//
//   import { env } from './config/env';
//   import { pool } from './config/db';       // test connection here
//   import { initSocket } from './config/socket';
//   import { errorHandler } from './shared/middleware/errorHandler';
//
//   // Route imports (one per module)
//   import authRoutes    from './modules/auth/routes';
//   import riderRoutes   from './modules/riders/routes';
//   import driverRoutes  from './modules/drivers/routes';
//   import vehicleRoutes from './modules/vehicles/routes';
//   import rideRoutes    from './modules/rides/routes';
//   import paymentRoutes from './modules/payments/routes';
//   import payoutRoutes  from './modules/payouts/routes';
//   import ratingRoutes  from './modules/ratings/routes';
//   import adminRoutes   from './modules/admin/routes';
//   import analyticsRoutes from './modules/analytics/routes';
//   import matchingRoutes  from './modules/matching/routes';
//
//   const app    = express();
//   const server = http.createServer(app);
//   initSocket(server);
//
//   // TODO 5: Middleware stack (order matters)
//   app.use(helmet());
//   app.use(cors({ origin: env.corsOrigin, credentials: true }));
//   app.use(morgan('dev'));
//   app.use(express.json());
//
//   // TODO 6: Mount routes with /api/v1 prefix
//   //   This prefix matches what the frontend will call.
//   //   Update frontend utils/api.ts BASE_URL to 'http://localhost:4000/api/v1'
//   app.use('/api/v1/auth',      authRoutes);
//   app.use('/api/v1/riders',    riderRoutes);
//   app.use('/api/v1/drivers',   driverRoutes);
//   app.use('/api/v1/vehicles',  vehicleRoutes);
//   app.use('/api/v1/rides',     rideRoutes);
//   app.use('/api/v1/payments',  paymentRoutes);
//   app.use('/api/v1/payouts',   payoutRoutes);
//   app.use('/api/v1/ratings',   ratingRoutes);
//   app.use('/api/v1/admin',     adminRoutes);
//   app.use('/api/v1/analytics', analyticsRoutes);
//   app.use('/api/v1/matching',  matchingRoutes);
//
//   // TODO 7: Global error handler — MUST be registered last
//   app.use(errorHandler);
//
//   // TODO 8: Start server
//   server.listen(env.port, () => {
//     console.log(`🚀 RideFlow API running on port ${env.port}`);
//   });
