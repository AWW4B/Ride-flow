// ============================================================
// src/modules/auth/routes.ts — Auth route definitions
// ============================================================
//
// TODO: Wire routes to controller + validation middleware
//
//   import { Router } from 'express';
//   import * as ctrl from './controller';
//   import { validate } from '../auth/schema';     // the validate helper
//   import { loginSchema, registerSchema } from './schema';
//   import { authenticate } from '../../shared/middleware/auth.middleware';
//
//   const router = Router();
//
//   // POST /api/v1/auth/login
//   //   Body: { email, password, role }
//   //   Returns: { token, user }
//   //   Frontend: app/page.tsx login form
//   router.post('/login',    validate(loginSchema),    ctrl.login);
//
//   // POST /api/v1/auth/register
//   //   Body: { full_name, email, password, phone?, role, city?, license_number? }
//   //   Returns: { token, user }
//   router.post('/register', validate(registerSchema), ctrl.register);
//
//   // GET /api/v1/auth/me
//   //   Header: Authorization: Bearer <token>
//   //   Returns: { userId, role, entityId }
//   //   Frontend: used to restore session on page reload
//   router.get('/me', authenticate, ctrl.me);
//
//   export default router;
