-- ================================================================
--  RideFlow — views.sql
--  All database views.
--  Run AFTER schema.sql and indexes.sql.
--  New views added vs original:
--    • vw_driver_leaderboard_by_city — per-city ranking (req)
--    • vw_rider_stats              — rider history & ratings
--    • vw_driver_earnings_summary  — per-driver earnings report
--    • vw_refund_disputes          — refund totals (req)
--    • vw_active_rides             — operational dashboard
-- ================================================================

USE rideflow;

-- ----------------------------------------------------------------
--  1. Driver Leaderboard — verified drivers, global ranking
--     (original view kept, corrected ORDER BY for non-determinism)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW vw_driver_leaderboard AS
SELECT
  d.driver_id,
  u.full_name,
  u.email,
  d.city,
  d.avg_rating,
  d.trips_completed,
  d.availability,
  d.verification_status
FROM  Driver d
JOIN  User   u ON u.user_id = d.user_id
WHERE d.verification_status = 'verified'
ORDER BY d.avg_rating DESC, d.trips_completed DESC;


-- ----------------------------------------------------------------
--  2. Driver Leaderboard — per city  (NEW — req: "per city")
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW vw_driver_leaderboard_by_city AS
SELECT
  d.city,
  d.driver_id,
  u.full_name,
  d.avg_rating,
  d.trips_completed,
  d.availability,
  -- dense rank within each city by avg_rating DESC
  RANK() OVER (
    PARTITION BY d.city
    ORDER BY d.avg_rating DESC, d.trips_completed DESC
  ) AS city_rank
FROM  Driver d
JOIN  User   u ON u.user_id = d.user_id
WHERE d.verification_status = 'verified'
  AND d.city IS NOT NULL;


-- ----------------------------------------------------------------
--  3. Platform Revenue — daily breakdown by payment method
--     (original view kept as-is; column aliases cleaned up)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW vw_platform_revenue AS
SELECT
  DATE(de.credited_at)                                    AS earning_date,
  COUNT(DISTINCT de.earning_id)                           AS total_rides,
  SUM(de.gross_amount)                                    AS gross_revenue,
  SUM(de.commission_amount)                               AS platform_commission,
  SUM(de.net_amount)                                      AS driver_payouts,
  p.payment_method,
  COUNT(CASE WHEN p.payment_status = 'refunded' THEN 1 END) AS refunds
FROM  Driver_Earnings de
JOIN  Ride    r ON r.ride_id    = de.ride_id
JOIN  Payment p ON p.ride_id   = de.ride_id
GROUP BY earning_date, p.payment_method;


-- ----------------------------------------------------------------
--  4. Active Promo Codes — valid, non-exhausted codes
--     (original view kept)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW vw_active_promos AS
SELECT
  promo_id,
  code,
  discount_type,
  discount_value,
  valid_from,
  valid_to,
  usage_limit,
  times_used,
  CASE
    WHEN usage_limit IS NULL THEN 'unlimited'
    ELSE CAST(usage_limit - times_used AS CHAR)
  END AS remaining_uses
FROM  Promo_Code
WHERE CURDATE() BETWEEN valid_from AND valid_to
  AND (usage_limit IS NULL OR times_used < usage_limit);


-- ----------------------------------------------------------------
--  5. Active Rides — operational dashboard (NEW)
--     Shows all rides that are not yet completed/cancelled.
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW vw_active_rides AS
SELECT
  r.ride_id,
  r.status,
  ru.full_name   AS rider_name,
  du.full_name   AS driver_name,
  v.make,
  v.model,
  v.license_plate,
  rr.pickup_address,
  rr.dropoff_address,
  r.surge_multiplier,
  r.surge_type,
  r.started_at
FROM  Ride         r
JOIN  Ride_Request rr ON rr.request_id = r.request_id
JOIN  Rider        ri ON ri.rider_id   = rr.rider_id
JOIN  User         ru ON ru.user_id    = ri.user_id
JOIN  Driver       d  ON d.driver_id   = r.driver_id
JOIN  User         du ON du.user_id    = d.user_id
JOIN  Vehicle      v  ON v.vehicle_id  = r.vehicle_id
WHERE r.status NOT IN ('completed','cancelled');


-- ----------------------------------------------------------------
--  6. Driver Earnings Summary — per-driver report (NEW — req)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW vw_driver_earnings_summary AS
SELECT
  d.driver_id,
  u.full_name                  AS driver_name,
  COUNT(de.earning_id)         AS total_trips_paid,
  SUM(de.gross_amount)         AS total_gross,
  SUM(de.commission_amount)    AS total_commission,
  SUM(de.net_amount)           AS total_net_earned,
  d.wallet_balance             AS current_wallet_balance,
  d.trips_completed
FROM  Driver         d
JOIN  User           u  ON u.user_id   = d.user_id
LEFT JOIN Driver_Earnings de ON de.driver_id = d.driver_id
GROUP BY d.driver_id, u.full_name, d.wallet_balance, d.trips_completed;


-- ----------------------------------------------------------------
--  7. Rider Stats — rider history view (NEW — req)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW vw_rider_stats AS
SELECT
  ri.rider_id,
  u.full_name,
  u.email,
  ri.avg_rating,
  COUNT(rh.history_id)             AS total_rides,
  SUM(rh.final_fare)               AS total_spent,
  SUM(CASE WHEN rh.final_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_rides
FROM  Rider        ri
JOIN  User         u  ON u.user_id   = ri.user_id
LEFT JOIN Ride_History rh ON rh.rider_id = ri.rider_id
GROUP BY ri.rider_id, u.full_name, u.email, ri.avg_rating;


-- ----------------------------------------------------------------
--  8. Refund & Dispute Totals — financial report (NEW — req)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW vw_refund_disputes AS
SELECT
  DATE(p.transaction_date)        AS txn_date,
  p.payment_method,
  COUNT(*)                        AS refund_count,
  SUM(p.amount)                   AS total_refunded_amount
FROM  Payment p
WHERE p.payment_status = 'refunded'
GROUP BY txn_date, p.payment_method;