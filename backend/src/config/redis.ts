// ============================================================
// src/config/redis.ts — Redis client (optional)
// ============================================================
// Redis is used for:
//   • Caching the active rides list (admin dashboard live feed)
//   • Storing driver location updates (current_lat / current_lng)
//     before flushing to MySQL (reduces DB write load)
//   • Storing demand ratios for demand-based surge calculation
//     (see src/jobs/surgePricing.job.ts)
//
// If you don't want Redis, delete this file and remove all
// imports from server.ts and the surge/matching modules.
//
// TODO 1: Install ioredis
//         npm install ioredis
//
// TODO 2: Create and export the client:
//
//   import Redis from 'ioredis';
//   import { env } from './env';
//
//   export const redis = new Redis(env.redisUrl ?? 'redis://127.0.0.1:6379');
//
//   redis.on('connect', () => console.log('✅ Redis connected'));
//   redis.on('error',   (e) => console.error('Redis error', e));
//
// TODO 3: Define cache key constants here or in shared/constants:
//
//   export const CACHE_KEYS = {
//     activeRides:     'rideflow:active_rides',
//     driverLocation:  (id: number) => `rideflow:driver:${id}:loc`,
//     demandRatio:     (zone: string) => `rideflow:surge:${zone}`,
//   } as const;
//
// TODO 4: In the driver location update endpoint (PUT /drivers/:id/location),
//         write to Redis with a TTL of 60 seconds, then also UPDATE Driver
//         SET current_lat, current_lng in MySQL as a background write.
