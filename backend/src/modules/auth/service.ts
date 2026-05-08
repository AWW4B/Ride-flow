// ============================================================
// src/modules/auth/service.ts — Auth business logic
// ============================================================
//
// TODO 1: Install bcryptjs (pure-JS, no native deps needed)
//   npm install bcryptjs
//   npm install -D @types/bcryptjs
//
// TODO 2: login(email, password, role) → AuthResponse
//
//   import bcrypt from 'bcryptjs';
//   import jwt from 'jsonwebtoken';
//   import { env } from '../../config/env';
//   import * as repo from './repository';
//   import { AppError } from '../../shared/middleware/errorHandler';
//
//   export async function login(email: string, password: string, role: string) {
//     // 1. Look up user
//     const user = await repo.findUserByEmail(email);
//     if (!user) throw new AppError(401, 'Invalid email or password');
//
//     // 2. Check account status (active / suspended / banned)
//     if (user.account_status !== 'active') {
//       throw new AppError(403, `Account is ${user.account_status}`);
//     }
//
//     // 3. Role must match what the DB says
//     //    (Prevents a rider from logging in as admin by guessing)
//     if (user.role !== role) {
//       throw new AppError(401, 'Invalid role for this account');
//     }
//
//     // 4. Verify password
//     const ok = await bcrypt.compare(password, user.password_hash);
//     if (!ok) throw new AppError(401, 'Invalid email or password');
//
//     // 5. Get entity id (rider_id or driver_id)
//     let entityId = user.user_id;
//     if (role === 'rider')  entityId = await repo.findRiderId(user.user_id)  ?? entityId;
//     if (role === 'driver') entityId = await repo.findDriverId(user.user_id) ?? entityId;
//
//     // 6. Sign JWT
//     const token = jwt.sign(
//       { userId: user.user_id, role, entityId },
//       env.jwt.secret,
//       { expiresIn: env.jwt.expiresIn }
//     );
//
//     return {
//       token,
//       user: { userId: user.user_id, full_name: user.full_name, email: user.email, role, entityId },
//     };
//   }
//
// TODO 3: register(body) → AuthResponse
//
//   export async function register(data: RegisterBody) {
//     const password_hash = await bcrypt.hash(data.password, 12);
//     const userId = await repo.createUser({ ...data, password_hash });
//     // Then call login() to return a token immediately
//     return login(data.email, data.password, data.role);
//   }
//
// TODO 4: hashPassword helper (used if you seed admin users via code):
//
//   export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
//
// FRONTEND NOTE:
//   app/page.tsx submits { email, password, role } to POST /api/v1/auth/login
//   On success, store token, redirect to /<role>/dashboard
