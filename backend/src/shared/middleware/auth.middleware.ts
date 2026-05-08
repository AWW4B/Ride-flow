// ============================================================
// src/shared/middleware/auth.middleware.ts  (CREATE THIS FILE)
// ============================================================
// JWT-based authentication + role-based access control.
//
// The frontend's login page selects role (admin/driver/rider).
// After login, every subsequent API call sends:
//   Authorization: Bearer <jwt_token>
//
// TODO 1: Install jsonwebtoken
//   npm install jsonwebtoken
//   npm install -D @types/jsonwebtoken
//
// TODO 2: JWT payload shape — match this to what auth/service.ts signs:
//
//   export interface JwtPayload {
//     userId:   number;
//     role:     'admin' | 'driver' | 'rider';
//     entityId: number;  // rider_id, driver_id, or user_id for admin
//   }
//
// TODO 3: Authentication middleware — verifies the token:
//
//   import jwt from 'jsonwebtoken';
//   import { env } from '../../config/env';
//   import { AppError } from './errorHandler';
//
//   export function authenticate(req: Request, res: Response, next: NextFunction) {
//     const header = req.headers.authorization;
//     if (!header?.startsWith('Bearer ')) throw new AppError(401, 'No token provided');
//
//     const token = header.slice(7);
//     try {
//       const payload = jwt.verify(token, env.jwt.secret) as JwtPayload;
//       res.locals.user = payload;   // attach to res.locals for downstream use
//       next();
//     } catch {
//       throw new AppError(401, 'Invalid or expired token');
//     }
//   }
//
// TODO 4: Role guard factory — use after authenticate():
//
//   export function requireRole(...roles: JwtPayload['role'][]) {
//     return (req: Request, res: Response, next: NextFunction) => {
//       const user = res.locals.user as JwtPayload;
//       if (!roles.includes(user.role)) {
//         throw new AppError(403, 'Insufficient permissions');
//       }
//       next();
//     };
//   }
//
//   Usage in routes:
//     router.get('/admin/stats', authenticate, requireRole('admin'), controller.getStats);
//     router.post('/rides',      authenticate, requireRole('rider'),  controller.createRide);
//     router.put('/rides/:id',   authenticate, requireRole('driver'), controller.updateRide);
//
// TODO 5: The DCL grants in seed.sql already enforce DB-level permissions.
//         But always enforce at the API layer too — defence in depth.
