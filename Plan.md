You are continuing development of an existing project at https://github.com/AWW4B/Ride-flow

This is RideFlow — a ride-hailing platform (like Uber/Careem) built as a university DBMS project.

---

## TECH STACK — STRICT, DO NOT DEVIATE
- Backend: Python + FastAPI (already set up in /backend)
- Frontend: Next.js + TypeScript (already set up in /frontend)
- Database: TiDB Cloud (MySQL 8.0 compatible, cloud-hosted)
- ORM/DB Driver: mysql-connector-python (raw SQL only, no ORM)
- Auth: JWT tokens
- Containerization: Docker + docker-compose

DO NOT use: SQLAlchemy, Prisma, Mongoose, PostgreSQL, or any ORM.
ONLY use: Node.js, Python, Express (if needed), mysql2/mysql-connector-python for raw SQL.

---

## REPO STRUCTURE CHANGES

1. Move all SQL files OUT of /backend/sql into a new top-level folder:
   /database/
     schema.sql         ← all CREATE TABLE, views, triggers, stored procedures
     push_schema.py     ← one-time Python script to push schema to TiDB Cloud
     README.md          ← instructions: "run push_schema.py once before starting"

2. /backend/ handles ONLY API logic. No SQL file loading at runtime.

3. push_schema.py reads credentials from environment variables ONLY:
   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_CA
   These are never written in any file. Script connects with SSL using DB_CA cert path.
   Usage: python database/push_schema.py

---

## ENVIRONMENT VARIABLES (never hardcoded in any file)
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_CA
JWT_SECRET
ADMIN_USERNAME, ADMIN_PASSWORD   ← hardcoded admin is "admin" / "admin123" but stored as env vars

---

## DOCKER-COMPOSE CHANGES
- Remove the local MySQL db: service entirely
- Remove all depends_on: db references
- All environment values use ${VARIABLE} syntax, read from .env
- .env is gitignored, .env.example is committed with placeholder values
- Backend connects to TiDB Cloud, not a local container

---

## FRONTEND TYPESCRIPT FIX (Vercel build is failing)
Fix this error in app/(dashboard)/dashboard/page.tsx line 60:
  formatter={(v: number) => [`₨${v.toLocaleString()}`, 'Revenue']}
Fix: formatter={(v: ValueType) => [`₨${Number(v ?? 0).toLocaleString()}`, 'Revenue']}
ValueType comes from recharts. The value param can be undefined so handle that.

---

## REMOVE COMPLETELY
- All image/photo upload functionality anywhere in frontend or backend
- Driver profile photo upload
- Any multer, cloudinary, S3, or file upload middleware
- Any <input type="file"> or upload UI components

---

## DATABASE SCHEMA — implement all of the following in schema.sql

### Tables
1. users (user_id, full_name, email, phone, password_hash, role ENUM('admin','rider','driver'), 
         account_status ENUM('active','suspended','banned'), created_at)
2. drivers (driver_id FK→users, license_number, cnic, verification_status ENUM('pending','verified','rejected'),
           availability ENUM('online','offline','on_trip'), total_trips, avg_rating)
3. vehicles (vehicle_id, driver_id FK→drivers, make, model, year, color, 
            license_plate, vehicle_type ENUM('economy','premium','bike'),
            verification_status ENUM('pending','verified','rejected'))
4. rides (ride_id, rider_id FK→users, driver_id FK→drivers, vehicle_id FK→vehicles,
         pickup_location, dropoff_location, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
         status ENUM('requested','accepted','driver_en_route','in_progress','completed','cancelled'),
         fare, distance_km, duration_minutes, scheduled_at, created_at, completed_at)
5. ride_history (mirrors completed/cancelled rides, archived separately)
6. payments (payment_id, ride_id FK→rides, rider_id FK→users, amount, 
            payment_method ENUM('cash','wallet','card'),
            payment_status ENUM('pending','paid','failed','refunded'),
            promo_code, discount_applied, transaction_date)
7. ratings (rating_id, ride_id FK→rides, rated_by_user_id, rated_user_id,
           score TINYINT 1-5, comment, created_at)
8. driver_earnings (earning_id, driver_id, ride_id, gross_fare, commission_pct,
                   commission_amount, net_earning, created_at)
9. driver_payouts (payout_id, driver_id, amount, status ENUM('pending','paid'), requested_at, paid_at)
10. promo_codes (promo_id, code, discount_pct, valid_from, valid_until, is_active)
12. fare_rules (rule_id, vehicle_type, base_rate, per_km_rate, per_minute_rate, surge_multiplier)
13. wallets (wallet_id, user_id FK→users, balance, updated_at)

### Views
- vw_active_drivers: drivers who are online + verified
- vw_ride_summary: join rides + users(rider) + users(driver) + payments
- vw_driver_leaderboard: top rated drivers per city (avg rating, total trips)
- vw_platform_revenue: total revenue, commission, refunds grouped by date
- vw_driver_earnings_summary: per driver totals

### Stored Procedures
- sp_calculate_fare(vehicle_type, distance_km, duration_min, promo_code) → returns final fare
  Applies surge multiplier from fare_rules if hour is peak (7-9am, 5-8pm)
- sp_complete_ride(ride_id) → marks ride complete, calculates earnings, credits driver wallet,
  archives to ride_history, deducts platform commission (20%)
- sp_request_payout(driver_id) → creates payout request if pending earnings > 0

### Triggers
- After INSERT on ratings: update drivers.avg_rating, flag account if avg < 3.5
- After INSERT on rides (status=completed): INSERT into ride_history
- After UPDATE on drivers.availability: log timestamp

### DCL (MySQL GRANT/REVOKE — implement as SQL in schema.sql)
- role_admin: GRANT ALL on rideflow.*
- role_rider: GRANT SELECT, INSERT on rides, payments, ratings, promo_codes, wallets
              GRANT SELECT on drivers, vehicles, fare_rules
- role_driver: GRANT SELECT, UPDATE on drivers, vehicles, rides
               GRANT SELECT, INSERT on ratings, driver_earnings
               GRANT INSERT on driver_payouts

---

## BACKEND API — FastAPI routes organized by role

### Auth routes (/api/v1/auth)
POST /register → rider registration only (role hardcoded to 'rider')
POST /login → returns JWT with user_id, role, email
POST /driver/register → driver registration (role='driver')

### Admin routes (/api/v1/admin) — JWT required, role must be 'admin'
GET  /users → list all users with filters (role, status)
PUT  /users/{id}/status → suspend/ban/activate user
GET  /drivers → list all drivers with verification status
PUT  /drivers/{id}/verify → approve or reject driver
PUT  /vehicles/{id}/verify → approve or reject vehicle
GET  /rides → all rides with filters (status, date range)
GET  /reports/revenue → total revenue by date range (uses vw_platform_revenue)
GET  /reports/drivers → driver earnings and commissions
GET  /reports/payments → breakdown by payment method
GET  /reports/refunds → refund and dispute totals
GET  /leaderboard → top rated drivers (uses vw_driver_leaderboard)
PUT  /payouts/{id}/approve → mark payout as paid

### Rider routes (/api/v1/rider) — JWT required, role must be 'rider'
POST /rides/request → create ride request (triggers driver matching)
GET  /rides/history → past rides
GET  /rides/{id} → ride detail
POST /rides/{id}/cancel → cancel a requested ride
POST /rides/{id}/rate → submit rating for driver (after completed)
GET  /wallet → wallet balance
POST /wallet/topup → add funds to wallet
GET  /promos/check → validate promo code

### Driver routes (/api/v1/driver) — JWT required, role must be 'driver'
GET  /rides/pending → available ride requests nearby
PUT  /rides/{id}/accept → accept ride
PUT  /rides/{id}/reject → reject ride (system moves to next driver)
PUT  /rides/{id}/status → update ride status (en_route → in_progress → completed)
POST /rides/{id}/rate → submit rating for rider
GET  /earnings → earning history
GET  /wallet → wallet balance
POST /payouts/request → request weekly payout
PUT  /availability → toggle online/offline

### Shared routes
GET /rides/{id}/fare-estimate → calculate fare before booking

---

## DRIVER MATCHING LOGIC
When a rider requests a ride:
1. Query all online+verified drivers within a reasonable distance
   (use simple lat/lng distance formula, no external mapping API)
2. Assign nearest driver → set ride status to 'accepted'
3. If driver rejects → move to next nearest available driver
4. If no drivers available → return appropriate message

---

## FRONTEND — Admin Reports Page
- Reports visible at /dashboard/reports (admin only)
- Show 4 report cards: Revenue, Driver Earnings, Payment Methods, Refunds
- Each card shows data in a table
- Add a simple "Download CSV" button per report that generates CSV client-side
  from the already-fetched JSON data (no extra DB query needed — just convert
  the JSON the page already has to CSV in the browser using JavaScript)
  This uses ZERO extra RUs since no new DB call is made.

---

## SECURITY RULES
- All passwords hashed with bcrypt before storing
- JWT tokens expire in 24 hours
- All DB credentials via environment variables only — never in code or files
- SSL required for all TiDB connections (use DB_CA env var for cert path)
- Role checked on every protected route via JWT middleware
- .env is gitignored, .env.example committed with placeholder values

---

## FILES TO DELIVER
1. /database/schema.sql — complete schema with all tables, views, procedures, triggers, DCL
2. /database/push_schema.py — one-time script to push schema.sql to TiDB Cloud
3. /database/README.md — setup instructions
4. /backend/ — complete FastAPI app with all routes above
5. /frontend/ — fix TypeScript error, add reports page with CSV download, remove image upload
6. /docker-compose.yml — updated (no local MySQL, all env vars from .env)
7. /.env.example — all required variables with placeholder values
8. /.gitignore — ensure .env is listed

Do not create any new files beyond these. Continue the existing repo structure.
All SQL must be compatible with TiDB Cloud (MySQL 8.0 compatible).
For foreign keys, add SET tidb_enable_foreign_key = ON at the top of schema.sql.