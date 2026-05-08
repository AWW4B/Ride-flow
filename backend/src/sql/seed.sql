-- ================================================================
--  RideFlow — seed.sql
--  Reference / demo data.  Run AFTER schema.sql.
--  Inserts are ordered to satisfy all FK dependencies.
--  Covers every table so the app boots with data in all views.
-- ================================================================

USE rideflow;

-- ================================================================
--  CONFIG TABLES  (no FKs)
-- ================================================================

INSERT INTO Fare_Config (vehicle_type, base_rate, per_km_rate, per_min_rate, effective_from)
VALUES
  ('economy',  80.00, 25.00, 3.00, '2026-01-01'),
  ('premium', 150.00, 45.00, 5.00, '2026-01-01'),
  ('bike',     40.00, 12.00, 1.50, '2026-01-01');

INSERT INTO Surge_Rule (label, time_from, time_to, days_mask, multiplier)
VALUES
  ('Morning Peak',  '08:00:00', '10:00:00',  31, 1.50),  -- Mon–Fri (1+2+4+8+16)
  ('Evening Peak',  '17:00:00', '20:00:00',  31, 1.40),
  ('Weekend Night', '22:00:00', '23:59:00',  96, 1.30);  -- Sat+Sun (32+64)

INSERT INTO Demand_Surge_Config (ratio_min, ratio_max, multiplier)
VALUES
  (2.00, 3.00, 1.30),
  (3.00, 5.00, 1.60),
  (5.00, NULL, 2.00);

INSERT INTO Platform_Config (commission_rate, effective_from)
VALUES
  (20.00, '2026-01-01');

INSERT INTO Promo_Code (code, discount_type, discount_value, valid_from, valid_to, usage_limit)
VALUES
  ('WELCOME10', 'percentage', 10.00, '2026-01-01', '2026-12-31', 1000),
  ('FLAT50',    'flat',       50.00, '2026-04-01', '2026-06-30',  500),
  ('EID25',     'percentage', 25.00, '2026-03-28', '2026-04-05',  200);

-- ================================================================
--  USERS  (5 users: 2 admin, 2 rider, 3 driver)
-- ================================================================

INSERT INTO User (full_name, email, password_hash, role)
VALUES
  -- Admins
  ('Rana Zohaib',    'zohaib@rideflow.pk',   '$2b$12$adminHashZohaib',  'admin'),
  ('Awwab Ahmad',    'awwab@rideflow.pk',    '$2b$12$adminHashAwwab',   'admin'),
  -- Riders
  ('Sara Khan',      'sara@example.com',     '$2b$12$riderHash1',       'rider'),
  ('Hamza Malik',    'hamza@example.com',    '$2b$12$riderHash2',       'rider'),
  -- Drivers
  ('Ali Raza',       'ali@example.com',      '$2b$12$driverHash1',      'driver'),
  ('Bilal Sheikh',   'bilal@example.com',    '$2b$12$driverHash2',      'driver'),
  ('Usman Tariq',    'usman@example.com',    '$2b$12$driverHash3',      'driver');

-- ================================================================
--  PHONES
-- ================================================================

INSERT INTO Phone (user_id, phone_number, is_primary)
VALUES
  (3, '+923001234567', 1),   -- Sara
  (4, '+923001234568', 1),   -- Hamza
  (5, '+923009876543', 1),   -- Ali
  (5, '+922129876543', 0),   -- Ali secondary
  (6, '+923335551234', 1),   -- Bilal
  (7, '+923335554321', 1);   -- Usman

-- ================================================================
--  RIDERS
-- ================================================================

INSERT INTO Rider (user_id)
VALUES (3), (4);   -- Sara (rider_id=1), Hamza (rider_id=2)

-- ================================================================
--  VEHICLES
-- ================================================================

INSERT INTO Vehicle (make, model, year, color, license_plate, vehicle_type, verification_status)
VALUES
  ('Toyota',  'Corolla',  2022, 'White',  'LHR-1234', 'economy', 'verified'),
  ('Honda',   'CB150',    2023, 'Black',  'KHI-5678', 'bike',    'verified'),
  ('Toyota',  'Fortuner', 2021, 'Silver', 'ISB-9012', 'premium', 'verified'),
  ('Suzuki',  'Alto',     2020, 'Red',    'LHR-3456', 'economy', 'pending'),
  ('Yamaha',  'YBR125',   2022, 'Blue',   'ISB-7890', 'bike',    'verified');

-- ================================================================
--  DRIVERS
-- ================================================================

INSERT INTO Driver (user_id, cnic, license_number, city, verification_status, availability, current_lat, current_lng)
VALUES
  (5, '3520100000001', 'LIC-ALI-001',   'Islamabad', 'verified', 'online',  33.7200, 73.0580),  -- driver_id=1
  (6, '3520100000002', 'LIC-BILAL-001', 'Lahore',    'verified', 'online',  31.5204, 74.3587),  -- driver_id=2
  (7, '3520100000003', 'LIC-USMAN-001', 'Islamabad', 'verified', 'offline', 33.7300, 73.0900);  -- driver_id=3

-- ================================================================
--  DRIVER ↔ VEHICLE ASSIGNMENTS
-- ================================================================

INSERT INTO Driver_Vehicle (driver_id, vehicle_id, is_primary)
VALUES
  (1, 1, 1),   -- Ali → Corolla (primary)
  (2, 2, 1),   -- Bilal → CB150 (primary)
  (3, 3, 1),   -- Usman → Fortuner (primary)
  (3, 5, 0);   -- Usman also has a bike (secondary)

-- ================================================================
--  RIDE REQUESTS
-- ================================================================

INSERT INTO Ride_Request (
  rider_id, pickup_lat, pickup_lng, pickup_address,
  dropoff_lat, dropoff_lng, dropoff_address,
  vehicle_type_requested, status
) VALUES
  -- Completed ride (Sara)
  (1, 33.720000, 73.058000, 'F-7 Markaz, Islamabad',
      33.730000, 73.090000, 'Blue Area, Islamabad',
      'economy', 'matched'),
  -- Completed ride (Hamza)
  (2, 33.698000, 73.067000, 'G-9 Markaz, Islamabad',
      33.714000, 73.048000, 'Jinnah Super, Islamabad',
      'economy', 'matched'),
  -- Pending request
  (1, 33.740000, 73.100000, 'E-11, Islamabad',
      33.760000, 73.110000, 'DHA Phase 2, Islamabad',
      'premium', 'pending');

-- ================================================================
--  DRIVER NOTIFICATIONS
-- ================================================================

INSERT INTO Driver_Notification (request_id, driver_id, response, responded_at)
VALUES
  (1, 1, 'accepted',  '2026-04-26 08:55:00'),
  (2, 1, 'rejected',  '2026-04-27 10:01:00'),
  (2, 3, 'accepted',  '2026-04-27 10:03:00'),
  (3, 1, 'pending',   NULL);

-- ================================================================
--  CONFIRMED RIDES
-- ================================================================

INSERT INTO Ride (
  request_id, driver_id, vehicle_id, fare_config_id,
  status, started_at, completed_at,
  distance_km, duration_min,
  surge_multiplier, surge_type,
  base_fare, promo_discount, final_fare
) VALUES
  -- Ride 1: Sara, Ali, Corolla — completed, surge applied, promo used
  -- base = 80 + 25*8.5 + 3*22 = 80 + 212.5 + 66 = 358.50
  -- surged = 358.50 * 1.5 = 537.75
  -- promo 10% = 53.775 → rounded to 53.78
  -- final = 537.75 - 53.78 = 483.97
  (1, 1, 1, 1,
   'completed', '2026-04-26 09:00:00', '2026-04-26 09:22:00',
   8.50, 22, 1.50, 'time_based',
   358.50, 53.78, 483.97),

  -- Ride 2: Hamza, Usman, Fortuner — completed, no surge, no promo
  -- base = 80 + 25*5.2 + 3*15 = 80 + 130 + 45 = 255.00
  (2, 3, 3, 1,
   'completed', '2026-04-27 10:05:00', '2026-04-27 10:20:00',
   5.20, 15, 1.00, 'none',
   255.00, 0.00, 255.00);

-- ================================================================
--  RIDE_HISTORY (auto-populated by trigger; manual insert for seed)
-- ================================================================

INSERT INTO Ride_History (
  ride_id, rider_id, driver_id, vehicle_id,
  pickup_address, dropoff_address,
  final_status, distance_km, duration_min, final_fare,
  surge_multiplier, surge_type
) VALUES
  (1, 1, 1, 1,
   'F-7 Markaz, Islamabad', 'Blue Area, Islamabad',
   'completed', 8.50, 22, 483.97, 1.50, 'time_based'),
  (2, 2, 3, 3,
   'G-9 Markaz, Islamabad', 'Jinnah Super, Islamabad',
   'completed', 5.20, 15, 255.00, 1.00, 'none');

-- ================================================================
--  PAYMENTS
-- ================================================================

INSERT INTO Payment (
  ride_id, rider_id, amount, payment_method, payment_status,
  promo_id, promo_discount_applied
) VALUES
  (1, 1, 483.97, 'wallet', 'paid', 1, 53.78),
  (2, 2, 255.00, 'cash',   'paid', NULL, 0.00);

-- ================================================================
--  DRIVER EARNINGS  (20% commission)
-- ================================================================

-- Ride 1: gross=483.97, comm=20% → 96.79, net=387.18
INSERT INTO Driver_Earnings (driver_id, ride_id, gross_amount, commission_rate, commission_amount, net_amount)
VALUES
  (1, 1, 483.97, 20.00, 96.79, 387.18);

-- Ride 2: gross=255.00, comm=20% → 51.00, net=204.00
INSERT INTO Driver_Earnings (driver_id, ride_id, gross_amount, commission_rate, commission_amount, net_amount)
VALUES
  (3, 2, 255.00, 20.00, 51.00, 204.00);

-- Update driver wallet balances to match earnings (triggers do this live;
-- for seed we set directly since triggers won't fire on INSERT … SELECT)
UPDATE Driver SET wallet_balance = 387.18, trips_completed = 1 WHERE driver_id = 1;
UPDATE Driver SET wallet_balance = 204.00, trips_completed = 1 WHERE driver_id = 3;

-- ================================================================
--  RATINGS  (both directions for both completed rides)
-- ================================================================

INSERT INTO Rating (ride_id, rated_by, rater_id, ratee_id, score, comment)
VALUES
  (1, 'rider',  3, 5, 5, 'Very smooth ride, on time!'),
  (1, 'driver', 5, 3, 4, 'Polite passenger, no issues.'),
  (2, 'rider',  4, 7, 4, 'Good drive, a bit slow.'),
  (2, 'driver', 7, 4, 5, 'Great rider, very respectful.');

-- ================================================================
--  PAYOUT REQUEST  (Ali requests a withdrawal)
-- ================================================================

INSERT INTO Payout_Request (driver_id, requested_amount, status)
VALUES (1, 300.00, 'pending');

-- ================================================================
--  ROLE-BASED ACCESS CONTROL  (DCL)
-- ================================================================

-- Admin: full access
CREATE USER IF NOT EXISTS 'rf_admin'@'%'
  IDENTIFIED BY 'Admin@RideFlow2026!';
GRANT ALL PRIVILEGES ON rideflow.* TO 'rf_admin'@'%';

-- Rider service account
CREATE USER IF NOT EXISTS 'rf_rider'@'%'
  IDENTIFIED BY 'Rider@RideFlow2026!';
GRANT SELECT, INSERT ON rideflow.Ride_Request    TO 'rf_rider'@'%';
GRANT SELECT, INSERT ON rideflow.Payment         TO 'rf_rider'@'%';
GRANT SELECT, INSERT ON rideflow.Rating          TO 'rf_rider'@'%';
GRANT SELECT         ON rideflow.Ride            TO 'rf_rider'@'%';
GRANT SELECT         ON rideflow.Ride_History    TO 'rf_rider'@'%';
GRANT SELECT         ON rideflow.Driver          TO 'rf_rider'@'%';
GRANT SELECT         ON rideflow.Vehicle         TO 'rf_rider'@'%';
GRANT SELECT         ON rideflow.Fare_Config     TO 'rf_rider'@'%';
GRANT SELECT         ON rideflow.Surge_Rule      TO 'rf_rider'@'%';
GRANT SELECT         ON rideflow.Promo_Code      TO 'rf_rider'@'%';
GRANT SELECT         ON rideflow.vw_active_promos TO 'rf_rider'@'%';
GRANT SELECT         ON rideflow.vw_rider_stats  TO 'rf_rider'@'%';

-- Driver service account
CREATE USER IF NOT EXISTS 'rf_driver'@'%'
  IDENTIFIED BY 'Driver@RideFlow2026!';
GRANT SELECT, UPDATE ON rideflow.Driver              TO 'rf_driver'@'%';
GRANT SELECT, UPDATE ON rideflow.Driver_Notification TO 'rf_driver'@'%';
GRANT SELECT         ON rideflow.Ride                TO 'rf_driver'@'%';
GRANT SELECT         ON rideflow.Ride_History        TO 'rf_driver'@'%';
GRANT SELECT         ON rideflow.Driver_Earnings     TO 'rf_driver'@'%';
GRANT SELECT, INSERT ON rideflow.Payout_Request      TO 'rf_driver'@'%';
GRANT SELECT, INSERT ON rideflow.Rating              TO 'rf_driver'@'%';
GRANT SELECT         ON rideflow.vw_driver_leaderboard         TO 'rf_driver'@'%';
GRANT SELECT         ON rideflow.vw_driver_leaderboard_by_city TO 'rf_driver'@'%';
GRANT SELECT         ON rideflow.vw_driver_earnings_summary    TO 'rf_driver'@'%';

FLUSH PRIVILEGES;