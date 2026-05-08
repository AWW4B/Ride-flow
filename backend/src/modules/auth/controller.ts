// ============================================================
// src/modules/auth/controller.ts — HTTP handlers for auth
// ============================================================
//
// TODO 1: login handler
//
//   import { Request, Response } from 'express';
//   import * as authService from './service';
//
//   export async function login(req: Request, res: Response) {
//     const { email, password, role } = req.body;  // validated by Zod
//     const result = await authService.login(email, password, role);
//     res.json({ success: true, data: result });
//   }
//
// TODO 2: register handler
//
//   export async function register(req: Request, res: Response) {
//     const result = await authService.register(req.body);
//     res.status(201).json({ success: true, data: result });
//   }
//
// TODO 3: me handler — returns current user info from token
//
//   export async function me(req: Request, res: Response) {
//     // res.locals.user is set by authenticate() middleware
//     res.json({ success: true, data: res.locals.user });
//   }
//
// IMPORTANT: Controllers should NEVER contain SQL.
//            All DB access goes through service → repository.
