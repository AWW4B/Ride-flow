// ============================================================
// src/modules/auth/schema.ts — Zod request validation
// ============================================================
// Zod schemas validate incoming request bodies before
// they reach the service layer.
//
// TODO 1: Install zod
//   npm install zod
//
// TODO 2: Login schema:
//
//   import { z } from 'zod';
//
//   export const loginSchema = z.object({
//     email:    z.string().email(),
//     password: z.string().min(6),
//     role:     z.enum(['admin', 'driver', 'rider']),
//   });
//
// TODO 3: Register schema:
//
//   export const registerSchema = z.object({
//     full_name: z.string().min(2).max(100),
//     email:     z.string().email(),
//     password:  z.string().min(6).max(72),
//     phone:     z.string().regex(/^03[0-9]{9}$/).optional(),
//     role:      z.enum(['driver', 'rider']),
//     // Driver extras
//     city:           z.string().optional(),
//     license_number: z.string().optional(),
//   });
//
// TODO 4: Create a reusable validate middleware:
//
//   import { Request, Response, NextFunction } from 'express';
//   import { ZodSchema } from 'zod';
//   import { AppError } from '../../shared/middleware/errorHandler';
//
//   export function validate(schema: ZodSchema) {
//     return (req: Request, _res: Response, next: NextFunction) => {
//       const result = schema.safeParse(req.body);
//       if (!result.success) {
//         const message = result.error.errors.map(e => e.message).join(', ');
//         throw new AppError(400, message);
//       }
//       req.body = result.data;   // replace with parsed+coerced data
//       next();
//     };
//   }
//
//   Then use in routes.ts:
//     router.post('/login', validate(loginSchema), authController.login);
