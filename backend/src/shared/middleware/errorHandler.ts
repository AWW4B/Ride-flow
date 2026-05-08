// ============================================================
// src/shared/middleware/errorHandler.ts — Global error handler
// ============================================================
//
// TODO 1: Create an AppError class for known business errors:
//
//   export class AppError extends Error {
//     constructor(
//       public readonly statusCode: number,
//       message: string,
//     ) {
//       super(message);
//       this.name = 'AppError';
//     }
//   }
//
// TODO 2: Create the Express error-handler middleware.
//         It MUST have 4 parameters — Express detects this signature.
//
//   import { Request, Response, NextFunction } from 'express';
//
//   export function errorHandler(
//     err: Error,
//     req: Request,
//     res: Response,
//     next: NextFunction,   // required even if unused
//   ) {
//     if (err instanceof AppError) {
//       return res.status(err.statusCode).json({
//         success: false,
//         message: err.message,
//       });
//     }
//
//     // MySQL duplicate-entry error (e.g. unique email)
//     if ((err as any).code === 'ER_DUP_ENTRY') {
//       return res.status(409).json({
//         success: false,
//         message: 'A record with that value already exists.',
//       });
//     }
//
//     console.error('[Unhandled Error]', err);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//     });
//   }
//
// TODO 3: Usage in controllers — throw AppError instead of sending
//         manual error responses:
//
//   throw new AppError(404, 'Driver not found');
//   throw new AppError(403, 'You are not allowed to access this resource');
//   throw new AppError(400, 'Invalid promo code');
