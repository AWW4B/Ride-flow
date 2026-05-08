// ============================================================
// src/modules/auth/repository.ts — Raw DB queries for auth
// ============================================================
// Only contains DB access — no business logic here.
//
// TODO 1: Import the pool from config/db.ts
//
// TODO 2: findUserByEmail — used during login:
//
//   export async function findUserByEmail(email: string) {
//     const [rows] = await pool.query<RowDataPacket[]>(
//       `SELECT u.user_id, u.full_name, u.email, u.password_hash,
//               u.account_status, u.role
//        FROM User u
//        WHERE u.email = ?
//        LIMIT 1`,
//       [email]
//     );
//     return rows[0] ?? null;
//   }
//
//   NOTE: The User table stores the hashed password as password_hash.
//   The schema uses CHAR(60) — perfect for bcrypt output.
//
// TODO 3: findEntityId — after finding the User, get rider_id / driver_id:
//
//   export async function findRiderId(userId: number): Promise<number | null> {
//     const [rows] = await pool.query<RowDataPacket[]>(
//       'SELECT rider_id FROM Rider WHERE user_id = ?', [userId]
//     );
//     return rows[0]?.rider_id ?? null;
//   }
//
//   export async function findDriverId(userId: number): Promise<number | null> {
//     const [rows] = await pool.query<RowDataPacket[]>(
//       'SELECT driver_id FROM Driver WHERE user_id = ?', [userId]
//     );
//     return rows[0]?.driver_id ?? null;
//   }
//
// TODO 4: createUser — for registration (wraps INSERT into User + Rider/Driver):
//
//   export async function createUser(data: {
//     full_name: string;
//     email: string;
//     password_hash: string;
//     phone?: string;
//     role: 'driver' | 'rider';
//   }) {
//     const conn = await pool.getConnection();
//     try {
//       await conn.beginTransaction();
//       const [result] = await conn.query<ResultSetHeader>(
//         `INSERT INTO User (full_name, email, password_hash, phone, role)
//          VALUES (?, ?, ?, ?, ?)`,
//         [data.full_name, data.email, data.password_hash, data.phone, data.role]
//       );
//       const userId = result.insertId;
//
//       if (data.role === 'rider') {
//         await conn.query('INSERT INTO Rider (user_id) VALUES (?)', [userId]);
//       } else {
//         await conn.query('INSERT INTO Driver (user_id) VALUES (?)', [userId]);
//       }
//
//       await conn.commit();
//       return userId;
//     } catch (e) {
//       await conn.rollback();
//       throw e;
//     } finally {
//       conn.release();
//     }
//   }
