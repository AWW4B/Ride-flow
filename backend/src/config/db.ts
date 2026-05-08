// ============================================================
// src/config/db.ts — MySQL connection pool
// ============================================================
// This file exports the single shared pool used by every
// repository in the application.
//
// TODO 1: Install mysql2 (which has built-in Promise support)
//         npm install mysql2
//
// TODO 2: Import env config and create a pool:
//
//   import mysql from 'mysql2/promise';
//   import { env } from './env';
//
//   export const pool = mysql.createPool({
//     host:               env.db.host,
//     port:               env.db.port,
//     user:               env.db.user,
//     password:           env.db.password,
//     database:           env.db.name,
//     waitForConnections: true,
//     connectionLimit:    10,   // tune per server RAM
//     queueLimit:         0,
//   });
//
// TODO 3: Add a helper to run stored procedures easily.
//         Stored procedures return results as [ResultSet[], FieldPacket[]].
//         A small wrapper makes this less painful:
//
//   export async function callProc<T>(
//     name: string,
//     inArgs: unknown[],
//     outParams: string[]   // e.g. ['@out_id', '@out_error']
//   ): Promise<Record<string, unknown>> {
//     const conn = await pool.getConnection();
//     try {
//       // Call proc with user-defined variables as OUT params
//       await conn.query(`CALL ${name}(${inArgs.map(() => '?').join(',')},${outParams.join(',')})`, inArgs);
//       const [rows] = await conn.query<any[]>(`SELECT ${outParams.join(',')} AS vals`);
//       return rows[0];
//     } finally {
//       conn.release();
//     }
//   }
//
//   NOTE: MySQL stored procedures use OUT params via SET @var = ?;
//   An easier pattern is to use named user-defined vars:
//     CALL sp_complete_ride(1, 12.5, 28, @fare, @net, @err);
//     SELECT @fare, @net, @err;
//   The callProc helper above does exactly that.
//
// TODO 4: Test connectivity at startup.
//         In server.ts, do:
//           const conn = await pool.getConnection();
//           await conn.ping();
//           conn.release();
//           console.log('✅ MySQL connected');
