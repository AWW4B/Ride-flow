// ============================================================
// src/config/socket.ts — Socket.IO server setup
// ============================================================
// Socket.IO is used for real-time events pushed to the frontend:
//
//   Frontend page       | Events it listens for
//   --------------------|---------------------------------------
//   Admin Dashboard     | 'ride:status_changed', 'driver:location'
//   Driver Requests     | 'request:new', 'request:cancelled'
//   Rider Book/Track    | 'ride:accepted', 'ride:status_changed'
//                       | 'driver:location' (live ETA)
//
// TODO 1: Install socket.io
//         npm install socket.io
//
// TODO 2: Create an initialiser that attaches to the HTTP server:
//
//   import { Server as IOServer } from 'socket.io';
//   import { Server as HttpServer } from 'http';
//   import { env } from './env';
//
//   export let io: IOServer;
//
//   export function initSocket(httpServer: HttpServer) {
//     io = new IOServer(httpServer, {
//       cors: { origin: env.corsOrigin, methods: ['GET','POST'] },
//     });
//
//     io.on('connection', (socket) => {
//       console.log('Socket connected:', socket.id);
//
//       // TODO 3: Join role-specific rooms on connect.
//       //   The client sends: socket.emit('join', { role, id })
//       //   Server does:      socket.join(`role:${role}`)
//       //                     socket.join(`user:${id}`)
//       socket.on('join', ({ role, id }: { role: string; id: number }) => {
//         socket.join(`role:${role}`);   // e.g. 'role:driver', 'role:admin'
//         socket.join(`user:${id}`);     // e.g. 'user:3'
//       });
//
//       // TODO 4: Driver sends GPS update every 5 seconds.
//       //   Client:  socket.emit('driver:location', { driverId, lat, lng })
//       //   Server:  broadcast to admin room + update DB
//       socket.on('driver:location', async ({ driverId, lat, lng }) => {
//         // update Redis cache (TTL 60s)
//         // batch-write to MySQL every N updates or on ride complete
//         io.to('role:admin').emit('driver:location', { driverId, lat, lng });
//       });
//
//       socket.on('disconnect', () => {
//         console.log('Socket disconnected:', socket.id);
//       });
//     });
//
//     return io;
//   }
//
// TODO 5: Emit helpers — add these so services can broadcast easily:
//
//   export const emitToUser  = (userId: number, event: string, data: unknown) =>
//     io.to(`user:${userId}`).emit(event, data);
//
//   export const emitToAdmin = (event: string, data: unknown) =>
//     io.to('role:admin').emit(event, data);
//
//   Usage example in rides/service.ts after CALL sp_complete_ride:
//     emitToUser(riderId, 'ride:completed', { rideId, finalFare });
//     emitToAdmin('ride:status_changed', { rideId, status: 'completed' });
