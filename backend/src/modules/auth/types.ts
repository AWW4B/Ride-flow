// ============================================================
// src/modules/auth/types.ts
// ============================================================
// Type definitions for authentication module.
//
// TODO 1: Define the login request body type:
//
//   export interface LoginBody {
//     email:    string;
//     password: string;
//     role:     'admin' | 'driver' | 'rider';
//   }
//
// TODO 2: Define the register body (if you support self-registration):
//
//   export interface RegisterBody {
//     full_name:    string;
//     email:        string;
//     password:     string;
//     phone?:       string;
//     role:         'driver' | 'rider';  // admin is not self-registered
//     // Driver-only extras (optional at register, can be added later):
//     city?:        string;
//     license_number?: string;
//   }
//
// TODO 3: Define the auth response:
//
//   export interface AuthResponse {
//     token:    string;
//     user: {
//       userId:   number;
//       full_name: string;
//       email:    string;
//       role:     'admin' | 'driver' | 'rider';
//       entityId: number;   // rider_id or driver_id
//     };
//   }
//
// FRONTEND NOTE:
//   The login page (app/page.tsx) sends role + email + password.
//   Store the returned token in localStorage or a cookie.
//   Add it as Authorization: Bearer <token> on every subsequent request.
