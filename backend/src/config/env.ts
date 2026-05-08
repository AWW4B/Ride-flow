// ============================================================
// src/config/env.ts — Validated environment config
// ============================================================
// Purpose: centralise all env reads so you get a startup crash
//          (instead of a runtime crash) if something is missing.
//
// TODO 1: Install dotenv
//         npm install dotenv
//         Then call: import 'dotenv/config'  ← at the very top of server.ts
//
// TODO 2: Export a typed config object.
//         Example:
//
//   export const env = {
//     db: {
//       host:     process.env.DB_HOST     ?? 'localhost',
//       port:     Number(process.env.DB_PORT ?? 3306),
//       user:     process.env.DB_USER     ?? 'rf_admin',
//       password: process.env.DB_PASSWORD ?? '',
//       name:     process.env.DB_NAME     ?? 'rideflow',
//     },
//     jwt: {
//       secret:    process.env.JWT_SECRET    ?? 'CHANGE_ME',
//       expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
//     },
//     port:       Number(process.env.PORT ?? 4000),
//     redisUrl:   process.env.REDIS_URL,
//     corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
//   } as const;
//
// TODO 3: Add a guard that throws if JWT_SECRET is the default.
//         This protects you in production:
//
//   if (env.jwt.secret === 'CHANGE_ME') {
//     throw new Error('JWT_SECRET is not set!');
//   }
