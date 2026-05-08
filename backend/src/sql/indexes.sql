-- ================================================================
--  RideFlow — indexes.sql
--  All non-PK, non-UNIQUE performance indexes.
--  Run AFTER schema.sql.
--  Strategy:
--    • FK columns get indexes (InnoDB doesn't auto-create them)
--    • Hot query paths: driver matching, ride history, earnings
--      reports, leaderboard ordering
-- ================================================================

USE rideflow;

-- ----------------------------------------------------------------
--  Phone
-- ----------------------------------------------------------------
-- Lookup all phones by user
CREATE INDEX idx_phone_user_id
  ON Phone (user_id);

-- ----------------------------------------------------------------
--  Rider
-- ----------------------------------------------------------------
-- Join Rider → User frequently
CREATE INDEX idx_rider_user_id
  ON Rider (user_id);

-- Analytics: sort riders by rating
CREATE INDEX idx_rider_avg_rating
  ON Rider (avg_rating DESC);

-- ----------------------------------------------------------------
--  Driver
-- ----------------------------------------------------------------
-- Join Driver → User
CREATE INDEX idx_driver_user_id
  ON Driver (user_id);

-- Core matching query: find nearby online verified drivers
-- Composite: availability + verification first, then geo bbox scan
CREATE INDEX idx_driver_matching
  ON Driver (availability, verification_status, current_lat, current_lng);

-- Leaderboard: per-city ranking
CREATE INDEX idx_driver_city_rating
  ON Driver (city, avg_rating DESC);

-- ----------------------------------------------------------------
--  Driver_Vehicle
-- ----------------------------------------------------------------
-- Lookup vehicles by driver
CREATE INDEX idx_dv_vehicle_id
  ON Driver_Vehicle (vehicle_id);

-- ----------------------------------------------------------------
--  Vehicle
-- ----------------------------------------------------------------
-- Filter by type + status (matching + admin panels)
CREATE INDEX idx_vehicle_type_status
  ON Vehicle (vehicle_type, verification_status);

-- ----------------------------------------------------------------
--  Ride_Request
-- ----------------------------------------------------------------
-- Rider fetches own requests (history, status checks)
CREATE INDEX idx_rr_rider_id
  ON Ride_Request (rider_id);

-- Dispatcher: pending requests by vehicle type (matching engine)
CREATE INDEX idx_rr_status_vehicle_type
  ON Ride_Request (status, vehicle_type_requested);

-- Scheduled rides: cron job scans upcoming scheduled requests
CREATE INDEX idx_rr_scheduled_time
  ON Ride_Request (scheduled_time)
  WHERE scheduled_time IS NOT NULL;  -- partial index (MySQL 8+)

-- ----------------------------------------------------------------
--  Driver_Notification
-- ----------------------------------------------------------------
-- Find all notifications sent to a driver (driver dashboard)
CREATE INDEX idx_dn_driver_id
  ON Driver_Notification (driver_id);

-- Find all notifications for a given request (matching audit)
CREATE INDEX idx_dn_request_id
  ON Driver_Notification (request_id);

-- ----------------------------------------------------------------
--  Ride
-- ----------------------------------------------------------------
-- Driver views their active / completed rides
CREATE INDEX idx_ride_driver_id
  ON Ride (driver_id);

-- Admin / analytics: filter rides by status + date range
CREATE INDEX idx_ride_status_completed_at
  ON Ride (status, completed_at);

-- Fare config join
CREATE INDEX idx_ride_fare_config_id
  ON Ride (fare_config_id);

-- Vehicle audit
CREATE INDEX idx_ride_vehicle_id
  ON Ride (vehicle_id);

-- ----------------------------------------------------------------
--  Ride_History
-- ----------------------------------------------------------------
-- Rider views ride history
CREATE INDEX idx_rh_rider_id
  ON Ride_History (rider_id);

-- Driver views their trip history
CREATE INDEX idx_rh_driver_id
  ON Ride_History (driver_id);

-- Date-range queries on archived rides
CREATE INDEX idx_rh_archived_at
  ON Ride_History (archived_at);

-- ----------------------------------------------------------------
--  Payment
-- ----------------------------------------------------------------
-- Rider views payment history
CREATE INDEX idx_pay_rider_id
  ON Payment (rider_id);

-- Revenue report: filter by date + method
CREATE INDEX idx_pay_method_date
  ON Payment (payment_method, transaction_date);

-- Refund tracking
CREATE INDEX idx_pay_status
  ON Payment (payment_status);

-- ----------------------------------------------------------------
--  Driver_Earnings
-- ----------------------------------------------------------------
-- Driver views their earnings
CREATE INDEX idx_earn_driver_id
  ON Driver_Earnings (driver_id);

-- Revenue report: group by date
CREATE INDEX idx_earn_credited_at
  ON Driver_Earnings (credited_at);

-- ----------------------------------------------------------------
--  Payout_Request
-- ----------------------------------------------------------------
-- Driver views their payouts
CREATE INDEX idx_payout_driver_id
  ON Payout_Request (driver_id);

-- Admin: filter pending payouts
CREATE INDEX idx_payout_status
  ON Payout_Request (status);

-- ----------------------------------------------------------------
--  Rating
-- ----------------------------------------------------------------
-- Find all ratings given to a specific user (avg recalculation)
CREATE INDEX idx_rating_ratee_id
  ON Rating (ratee_id);

-- Find all ratings submitted by a user
CREATE INDEX idx_rating_rater_id
  ON Rating (rater_id);

-- ----------------------------------------------------------------
--  Promo_Code
-- ----------------------------------------------------------------
-- Active promo lookup: date range check
CREATE INDEX idx_promo_validity
  ON Promo_Code (valid_from, valid_to);