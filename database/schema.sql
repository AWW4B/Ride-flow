DROP DATABASE IF EXISTS rideflow;
CREATE DATABASE rideflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rideflow;

-- ================================================================
--  MODULE 1 — USER & ACCESS
-- ================================================================

-- ------------------------------------------------------------
--  User
--  Base entity for all platform participants.
--  role enforces disjoint specialisation (admin / rider / driver).
--  email is the login key — must be globally unique.
-- ------------------------------------------------------------
CREATE TABLE User (
  user_id        INT           NOT NULL AUTO_INCREMENT,
  full_name      VARCHAR(120)  NOT NULL,
  email          VARCHAR(180)  NOT NULL,
  password_hash  VARCHAR(255)  NOT NULL,
  role           ENUM('admin','rider','driver') NOT NULL,
  account_status ENUM('active','suspended','banned') NOT NULL DEFAULT 'active',
  registered_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id),
  UNIQUE KEY uq_user_email (email),

  CONSTRAINT chk_user_email
    CHECK (email LIKE '%@%.%'),
  CONSTRAINT chk_user_fullname
    CHECK (CHAR_LENGTH(TRIM(full_name)) > 0)

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Phone
--  Multivalued attribute — stored in a separate table.
--  A user may have multiple numbers; one flagged as primary.
-- ------------------------------------------------------------
CREATE TABLE Phone (
  phone_id     INT         NOT NULL AUTO_INCREMENT,
  user_id      INT         NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  is_primary   TINYINT(1)  NOT NULL DEFAULT 0,

  PRIMARY KEY (phone_id),

  CONSTRAINT chk_phone_isprimary
    CHECK (is_primary IN (0, 1)),
  CONSTRAINT chk_phone_number_len
    CHECK (CHAR_LENGTH(phone_number) >= 7),

  CONSTRAINT fk_phone_user
    FOREIGN KEY (user_id) REFERENCES User(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Rider
--  1:1 extension of User for the rider role.
--  avg_rating cached here; kept in sync by trigger.
--  flagged column set by trigger when avg drops below 3.0
--  (spec §5: riders with consistently low ratings flagged).
-- ------------------------------------------------------------
CREATE TABLE Rider (
  rider_id   INT          NOT NULL AUTO_INCREMENT,
  user_id    INT          NOT NULL,
  avg_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00
             COMMENT 'Cached; maintained by trg_update_rider_avg_rating',
  flagged    TINYINT(1)   NOT NULL DEFAULT 0
             COMMENT '1 = flagged for low rating (< 3.0); reviewed by admin',

  PRIMARY KEY (rider_id),
  UNIQUE KEY uq_rider_user (user_id),

  CONSTRAINT chk_rider_avg_rating
    CHECK (avg_rating BETWEEN 0.00 AND 5.00),
  CONSTRAINT chk_rider_flagged
    CHECK (flagged IN (0, 1)),

  CONSTRAINT fk_rider_user
    FOREIGN KEY (user_id) REFERENCES User(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Driver
--  1:1 extension of User for the driver role.
--  city used for leaderboard partitioning (spec §5).
--  availability toggled by the driver; logged in availability_log.
--  wallet_balance maintained by triggers on Driver_Earnings and
--  Payout_Request.
-- ------------------------------------------------------------
CREATE TABLE Driver (
  driver_id           INT           NOT NULL AUTO_INCREMENT,
  user_id             INT           NOT NULL,
  cnic                VARCHAR(15)   NOT NULL
                      COMMENT 'Pakistani CNIC: 13 digits or 15 with dashes',
  license_number      VARCHAR(30)   NOT NULL,
  photo_url           VARCHAR(500)  DEFAULT NULL,
  city                VARCHAR(100)  NOT NULL DEFAULT 'Unknown'
                      COMMENT 'Home city; used for leaderboard partitioning',
  verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  availability        ENUM('online','offline','on_trip')    NOT NULL DEFAULT 'offline',
  trips_completed     INT           NOT NULL DEFAULT 0,
  avg_rating          DECIMAL(3,2)  NOT NULL DEFAULT 0.00
                      COMMENT 'Cached; maintained by trg_update_driver_avg_rating',
  wallet_balance      DECIMAL(12,2) NOT NULL DEFAULT 0.00
                      COMMENT 'Credits on earning INSERT; debits on payout paid',
  current_lat         DECIMAL(9,6)  DEFAULT NULL,
  current_lng         DECIMAL(9,6)  DEFAULT NULL,

  PRIMARY KEY (driver_id),
  UNIQUE KEY uq_driver_user    (user_id),
  UNIQUE KEY uq_driver_cnic    (cnic),
  UNIQUE KEY uq_driver_license (license_number),

  CONSTRAINT chk_driver_trips
    CHECK (trips_completed >= 0),
  CONSTRAINT chk_driver_wallet
    CHECK (wallet_balance >= 0.00),
  CONSTRAINT chk_driver_avg_rating
    CHECK (avg_rating BETWEEN 0.00 AND 5.00),
  CONSTRAINT chk_driver_lat
    CHECK (current_lat IS NULL OR current_lat BETWEEN -90.000000 AND 90.000000),
  CONSTRAINT chk_driver_lng
    CHECK (current_lng IS NULL OR current_lng BETWEEN -180.000000 AND 180.000000),
  CONSTRAINT chk_driver_cnic_len
    CHECK (CHAR_LENGTH(cnic) BETWEEN 13 AND 15),
  CONSTRAINT chk_driver_city
    CHECK (CHAR_LENGTH(TRIM(city)) > 0),

  CONSTRAINT fk_driver_user
    FOREIGN KEY (user_id) REFERENCES User(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ================================================================
--  MODULE 2 — DRIVER & VEHICLE
-- ================================================================

-- ------------------------------------------------------------
--  Vehicle
--  Independent vehicle registry — not owned by a single driver
--  because vehicles can be shared across drivers on different
--  shifts (M:N via Driver_Vehicle).
-- ------------------------------------------------------------
CREATE TABLE Vehicle (
  vehicle_id          INT          NOT NULL AUTO_INCREMENT,
  make                VARCHAR(60)  NOT NULL,
  model               VARCHAR(60)  NOT NULL,
  year                YEAR         NOT NULL,
  color               VARCHAR(40)  NOT NULL,
  license_plate       VARCHAR(20)  NOT NULL,
  vehicle_type        ENUM('economy','premium','bike') NOT NULL,
  verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',

  PRIMARY KEY (vehicle_id),
  UNIQUE KEY uq_vehicle_plate (license_plate),

  CONSTRAINT chk_vehicle_year
    CHECK (year BETWEEN 1980 AND 2100),
  CONSTRAINT chk_vehicle_make
    CHECK (CHAR_LENGTH(TRIM(make)) > 0),
  CONSTRAINT chk_vehicle_model
    CHECK (CHAR_LENGTH(TRIM(model)) > 0),
  CONSTRAINT chk_vehicle_color
    CHECK (CHAR_LENGTH(TRIM(color)) > 0)

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Driver_Vehicle  (M:N junction)
--  Links drivers to their vehicles.
--  is_primary = 1 marks the vehicle currently selected for
--  matching; enforced at application level.
-- ------------------------------------------------------------
CREATE TABLE Driver_Vehicle (
  driver_id   INT         NOT NULL,
  vehicle_id  INT         NOT NULL,
  assigned_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_primary  TINYINT(1)  NOT NULL DEFAULT 0,

  PRIMARY KEY (driver_id, vehicle_id),

  CONSTRAINT chk_dv_isprimary
    CHECK (is_primary IN (0, 1)),

  CONSTRAINT fk_dv_driver
    FOREIGN KEY (driver_id)  REFERENCES Driver(driver_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dv_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Driver_Availability_Log
--  Audit trail of every online/offline/on_trip transition.
--  Populated by trg_log_availability trigger.
-- ------------------------------------------------------------
CREATE TABLE Driver_Availability_Log (
  log_id     INT      NOT NULL AUTO_INCREMENT,
  driver_id  INT      NOT NULL,
  old_status ENUM('online','offline','on_trip') DEFAULT NULL,
  new_status ENUM('online','offline','on_trip') NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (log_id),

  CONSTRAINT fk_avlog_driver
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ================================================================
--  MODULE 3 — FARE & CONFIGURATION
-- ================================================================

-- ------------------------------------------------------------
--  Fare_Config
--  Versioned rate table per vehicle type.
--  effective_to = NULL means the rule is currently active.
--  A stored procedure reads the current active row at ride time.
-- ------------------------------------------------------------
CREATE TABLE Fare_Config (
  config_id      INT          NOT NULL AUTO_INCREMENT,
  vehicle_type   ENUM('economy','premium','bike') NOT NULL,
  base_rate      DECIMAL(8,2) NOT NULL
                 COMMENT 'Fixed flag-fall amount',
  per_km_rate    DECIMAL(8,2) NOT NULL,
  per_min_rate   DECIMAL(8,2) NOT NULL,
  effective_from DATE         NOT NULL,
  effective_to   DATE         DEFAULT NULL
                 COMMENT 'NULL = currently active',

  PRIMARY KEY (config_id),

  CONSTRAINT chk_fc_base_rate
    CHECK (base_rate > 0),
  CONSTRAINT chk_fc_per_km
    CHECK (per_km_rate > 0),
  CONSTRAINT chk_fc_per_min
    CHECK (per_min_rate > 0),
  CONSTRAINT chk_fc_dates
    CHECK (effective_to IS NULL OR effective_to > effective_from)

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Surge_Rule
--  Time-window surge definitions (peak hours).
--  days_mask is a 7-bit bitmask: Mon=1 Tue=2 Wed=4 Thu=8
--  Fri=16 Sat=32 Sun=64. Valid range 1–127.
--  multiplier >= 1.0 (surge never reduces the fare).
-- ------------------------------------------------------------
CREATE TABLE Surge_Rule (
  surge_id   INT              NOT NULL AUTO_INCREMENT,
  label      VARCHAR(80)      NOT NULL
             COMMENT 'Human-readable name, e.g. "Morning Peak"',
  time_from  TIME             NOT NULL,
  time_to    TIME             NOT NULL,
  days_mask  TINYINT UNSIGNED NOT NULL
             COMMENT 'Bitmask: Mon=1 Tue=2 Wed=4 Thu=8 Fri=16 Sat=32 Sun=64',
  multiplier DECIMAL(4,2)     NOT NULL,

  PRIMARY KEY (surge_id),

  CONSTRAINT chk_sr_multiplier
    CHECK (multiplier >= 1.00),
  CONSTRAINT chk_sr_time_order
    CHECK (time_to > time_from),
  CONSTRAINT chk_sr_days_mask
    CHECK (days_mask BETWEEN 1 AND 127),
  CONSTRAINT chk_sr_label
    CHECK (CHAR_LENGTH(TRIM(label)) > 0)

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Demand_Surge_Config
--  Demand-ratio tiers for dynamic surge pricing.
--  ratio = pending_requests / online_drivers_nearby.
--  ratio_max = NULL means "unbounded" (highest tier).
-- ------------------------------------------------------------
CREATE TABLE Demand_Surge_Config (
  id         INT          NOT NULL AUTO_INCREMENT,
  ratio_min  DECIMAL(6,2) NOT NULL
             COMMENT 'Lower bound of demand ratio',
  ratio_max  DECIMAL(6,2) DEFAULT NULL
             COMMENT 'Upper bound; NULL = unbounded highest tier',
  multiplier DECIMAL(4,2) NOT NULL,

  PRIMARY KEY (id),

  CONSTRAINT chk_dsc_ratio_min
    CHECK (ratio_min >= 0),
  CONSTRAINT chk_dsc_ratio_max
    CHECK (ratio_max IS NULL OR ratio_max > ratio_min),
  CONSTRAINT chk_dsc_multiplier
    CHECK (multiplier >= 1.00)

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Platform_Config
--  Versioned commission rate taken by the platform.
--  commission_rate is a percentage: 0.00 – 100.00.
-- ------------------------------------------------------------
CREATE TABLE Platform_Config (
  config_id       INT          NOT NULL AUTO_INCREMENT,
  commission_rate DECIMAL(5,2) NOT NULL
                  COMMENT 'Platform cut as a percentage, e.g. 20.00 = 20%',
  effective_from  DATE         NOT NULL,
  effective_to    DATE         DEFAULT NULL
                  COMMENT 'NULL = currently active',

  PRIMARY KEY (config_id),

  CONSTRAINT chk_pc_commission
    CHECK (commission_rate BETWEEN 0.00 AND 100.00),
  CONSTRAINT chk_pc_dates
    CHECK (effective_to IS NULL OR effective_to > effective_from)

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Promo_Code
--  Discount codes applied at payment time.
--  Supports both percentage and flat-amount discounts.
--  usage_limit = NULL means unlimited.
-- ------------------------------------------------------------
CREATE TABLE Promo_Code (
  promo_id       INT          NOT NULL AUTO_INCREMENT,
  code           VARCHAR(30)  NOT NULL,
  discount_type  ENUM('percentage','flat') NOT NULL,
  discount_value DECIMAL(8,2) NOT NULL
                 COMMENT 'Percent (0-100) or flat currency amount (> 0)',
  valid_from     DATE         NOT NULL,
  valid_to       DATE         NOT NULL,
  usage_limit    INT          DEFAULT NULL
                 COMMENT 'NULL = unlimited; otherwise >= 1',
  times_used     INT          NOT NULL DEFAULT 0,

  PRIMARY KEY (promo_id),
  UNIQUE KEY uq_promo_code (code),

  CONSTRAINT chk_promo_discount_val
    CHECK (discount_value > 0),
  CONSTRAINT chk_promo_pct_range
    CHECK (discount_type = 'flat' OR discount_value <= 100.00),
  CONSTRAINT chk_promo_dates
    CHECK (valid_to >= valid_from),
  CONSTRAINT chk_promo_usage_limit
    CHECK (usage_limit IS NULL OR usage_limit >= 1),
  CONSTRAINT chk_promo_times_used
    CHECK (times_used >= 0),
  CONSTRAINT chk_promo_code_nonempty
    CHECK (CHAR_LENGTH(TRIM(code)) > 0)

) ENGINE = InnoDB;


-- ================================================================
--  MODULE 4 — RIDE LIFECYCLE
-- ================================================================

-- ------------------------------------------------------------
--  Ride_Request
--  The broadcast record a rider creates when they need a ride.
--  scheduled_time = NULL → dispatch immediately.
--  Status tracks the broadcast lifecycle independently of the
--  trip itself.
-- ------------------------------------------------------------
CREATE TABLE Ride_Request (
  request_id             INT          NOT NULL AUTO_INCREMENT,
  rider_id               INT          NOT NULL,
  pickup_lat             DECIMAL(9,6) NOT NULL,
  pickup_lng             DECIMAL(9,6) NOT NULL,
  pickup_address         VARCHAR(300) NOT NULL,
  dropoff_lat            DECIMAL(9,6) NOT NULL,
  dropoff_lng            DECIMAL(9,6) NOT NULL,
  dropoff_address        VARCHAR(300) NOT NULL,
  vehicle_type_requested ENUM('economy','premium','bike') NOT NULL,
  scheduled_time         DATETIME     DEFAULT NULL
                         COMMENT 'NULL = immediate; future = scheduled ride',
  requested_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status                 ENUM('pending','matched','cancelled','expired')
                         NOT NULL DEFAULT 'pending',

  PRIMARY KEY (request_id),

  CONSTRAINT chk_rr_pickup_lat
    CHECK (pickup_lat BETWEEN -90.000000 AND 90.000000),
  CONSTRAINT chk_rr_pickup_lng
    CHECK (pickup_lng BETWEEN -180.000000 AND 180.000000),
  CONSTRAINT chk_rr_dropoff_lat
    CHECK (dropoff_lat BETWEEN -90.000000 AND 90.000000),
  CONSTRAINT chk_rr_dropoff_lng
    CHECK (dropoff_lng BETWEEN -180.000000 AND 180.000000),
  CONSTRAINT chk_rr_different_locations
    CHECK (pickup_lat <> dropoff_lat OR pickup_lng <> dropoff_lng),
  CONSTRAINT chk_rr_scheduled_time
    CHECK (scheduled_time IS NULL OR scheduled_time > requested_at),
  CONSTRAINT chk_rr_pickup_addr
    CHECK (CHAR_LENGTH(TRIM(pickup_address)) > 0),
  CONSTRAINT chk_rr_dropoff_addr
    CHECK (CHAR_LENGTH(TRIM(dropoff_address)) > 0),

  CONSTRAINT fk_rr_rider
    FOREIGN KEY (rider_id) REFERENCES Rider(rider_id)
    ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Driver_Notification
--  One row per driver notified for a given ride request.
--  Full audit trail: accepted / rejected / expired preserved.
--  If a driver rejects, the system notifies the next driver.
-- ------------------------------------------------------------
CREATE TABLE Driver_Notification (
  notification_id INT      NOT NULL AUTO_INCREMENT,
  request_id      INT      NOT NULL,
  driver_id       INT      NOT NULL,
  sent_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  response        ENUM('pending','accepted','rejected','expired')
                  NOT NULL DEFAULT 'pending',
  responded_at    DATETIME DEFAULT NULL,

  PRIMARY KEY (notification_id),

  CONSTRAINT chk_dn_responded_at
    CHECK (responded_at IS NULL OR responded_at >= sent_at),

  CONSTRAINT fk_dn_request
    FOREIGN KEY (request_id) REFERENCES Ride_Request(request_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dn_driver
    FOREIGN KEY (driver_id)  REFERENCES Driver(driver_id)
    ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Ride
--  Created once a driver accepts — the confirmed, active trip.
--  All 6 lifecycle states from the project spec are tracked here:
--    accepted → driver_en_route → in_progress → completed
--                                              → cancelled
--  Surge snapshot stored immutably for historical fare audits.
--  UNIQUE on request_id enforces strict 1:1 with Ride_Request.
-- ------------------------------------------------------------
CREATE TABLE Ride (
  ride_id          INT           NOT NULL AUTO_INCREMENT,
  request_id       INT           NOT NULL,
  driver_id        INT           NOT NULL,
  vehicle_id       INT           NOT NULL,
  fare_config_id   INT           NOT NULL,
  status           ENUM('accepted','driver_en_route','in_progress',
                        'completed','cancelled')
                   NOT NULL DEFAULT 'accepted',
  started_at       DATETIME      DEFAULT NULL,
  completed_at     DATETIME      DEFAULT NULL,
  distance_km      DECIMAL(8,2)  DEFAULT NULL,
  duration_min     INT           DEFAULT NULL,
  surge_multiplier DECIMAL(4,2)  NOT NULL DEFAULT 1.00
                   COMMENT 'Immutable snapshot taken at ride creation',
  surge_type       ENUM('none','time_based','demand_based')
                   NOT NULL DEFAULT 'none',
  base_fare        DECIMAL(10,2) DEFAULT NULL,
  promo_discount   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  final_fare       DECIMAL(10,2) DEFAULT NULL
                   COMMENT 'base_fare * surge_multiplier - promo_discount',

  PRIMARY KEY (ride_id),
  UNIQUE KEY uq_ride_request (request_id),

  CONSTRAINT chk_ride_distance
    CHECK (distance_km IS NULL OR distance_km > 0),
  CONSTRAINT chk_ride_duration
    CHECK (duration_min IS NULL OR duration_min > 0),
  CONSTRAINT chk_ride_surge
    CHECK (surge_multiplier >= 1.00),
  CONSTRAINT chk_ride_base_fare
    CHECK (base_fare IS NULL OR base_fare >= 0),
  CONSTRAINT chk_ride_promo_disc
    CHECK (promo_discount >= 0.00),
  CONSTRAINT chk_ride_final_fare
    CHECK (final_fare IS NULL OR final_fare >= 0),
  CONSTRAINT chk_ride_time_order
    CHECK (completed_at IS NULL OR started_at IS NULL
           OR completed_at >= started_at),

  CONSTRAINT fk_ride_request
    FOREIGN KEY (request_id)     REFERENCES Ride_Request(request_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ride_driver
    FOREIGN KEY (driver_id)      REFERENCES Driver(driver_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ride_vehicle
    FOREIGN KEY (vehicle_id)     REFERENCES Vehicle(vehicle_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ride_fareconfig
    FOREIGN KEY (fare_config_id) REFERENCES Fare_Config(config_id)
    ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Ride_History
--  Append-only archive of every completed or cancelled ride.
--  Populated by trg_archive_ride trigger (AFTER UPDATE on Ride).
--  Keeps historical data separated from the live rides table,
--  matching the explicit project spec requirement.
-- ------------------------------------------------------------
CREATE TABLE Ride_History (
  history_id       INT           NOT NULL AUTO_INCREMENT,
  ride_id          INT           NOT NULL,
  request_id       INT           NOT NULL,
  rider_id         INT           NOT NULL,
  driver_id        INT           DEFAULT NULL,
  pickup_address   VARCHAR(300)  DEFAULT NULL,
  dropoff_address  VARCHAR(300)  DEFAULT NULL,
  final_status     ENUM('completed','cancelled') NOT NULL,
  fare             DECIMAL(10,2) DEFAULT NULL,
  distance_km      DECIMAL(8,2)  DEFAULT NULL,
  duration_min     INT           DEFAULT NULL,
  ride_started_at  DATETIME      DEFAULT NULL,
  ride_completed_at DATETIME     DEFAULT NULL,
  archived_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (history_id),

  CONSTRAINT chk_rh_fare
    CHECK (fare IS NULL OR fare >= 0),
  CONSTRAINT chk_rh_distance
    CHECK (distance_km IS NULL OR distance_km > 0)

  -- No FKs: archive is intentionally decoupled from live tables
  -- so records survive even if source rows are later purged.

) ENGINE = InnoDB;


-- ================================================================
--  MODULE 5 — PAYMENT & EARNINGS
-- ================================================================

-- ------------------------------------------------------------
--  Payment
--  One payment per ride (UNIQUE ride_id enforces 1:1 with Ride).
--  promo_id is optional (NULL = no code applied).
-- ------------------------------------------------------------
CREATE TABLE Payment (
  payment_id             INT           NOT NULL AUTO_INCREMENT,
  ride_id                INT           NOT NULL,
  rider_id               INT           NOT NULL,
  amount                 DECIMAL(10,2) NOT NULL,
  payment_method         ENUM('cash','wallet','card') NOT NULL,
  payment_status         ENUM('pending','paid','failed','refunded')
                         NOT NULL DEFAULT 'pending',
  promo_id               INT           DEFAULT NULL,
  promo_discount_applied DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  transaction_date       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (payment_id),
  UNIQUE KEY uq_payment_ride (ride_id),

  CONSTRAINT chk_pay_amount
    CHECK (amount >= 0.00),
  CONSTRAINT chk_pay_promo_disc
    CHECK (promo_discount_applied >= 0.00),
  CONSTRAINT chk_pay_disc_lte_amount
    CHECK (promo_discount_applied <= amount),

  CONSTRAINT fk_pay_ride
    FOREIGN KEY (ride_id)  REFERENCES Ride(ride_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pay_rider
    FOREIGN KEY (rider_id) REFERENCES Rider(rider_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pay_promo
    FOREIGN KEY (promo_id) REFERENCES Promo_Code(promo_id)
    ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Driver_Earnings
--  Immutable per-ride ledger row created on ride completion.
--  commission_rate snapshotted from Platform_Config so historical
--  earnings reports remain accurate if the rate later changes.
-- ------------------------------------------------------------
CREATE TABLE Driver_Earnings (
  earning_id        INT           NOT NULL AUTO_INCREMENT,
  driver_id         INT           NOT NULL,
  ride_id           INT           NOT NULL,
  gross_amount      DECIMAL(10,2) NOT NULL
                    COMMENT 'Equals Ride.final_fare',
  commission_rate   DECIMAL(5,2)  NOT NULL
                    COMMENT 'Snapshotted from Platform_Config',
  commission_amount DECIMAL(10,2) NOT NULL,
  net_amount        DECIMAL(10,2) NOT NULL
                    COMMENT 'Credited to driver wallet by trigger',
  credited_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (earning_id),
  UNIQUE KEY uq_earning_ride (ride_id),

  CONSTRAINT chk_de_gross
    CHECK (gross_amount >= 0.00),
  CONSTRAINT chk_de_commission_rate
    CHECK (commission_rate BETWEEN 0.00 AND 100.00),
  CONSTRAINT chk_de_commission_amount
    CHECK (commission_amount >= 0.00),
  CONSTRAINT chk_de_net
    CHECK (net_amount >= 0.00),

  CONSTRAINT fk_earn_driver
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_earn_ride
    FOREIGN KEY (ride_id)   REFERENCES Ride(ride_id)
    ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ------------------------------------------------------------
--  Payout_Request
--  Driver-initiated withdrawal request.
--  Admin approves → status = 'paid' → trigger debits wallet.
-- ------------------------------------------------------------
CREATE TABLE Payout_Request (
  payout_id        INT           NOT NULL AUTO_INCREMENT,
  driver_id        INT           NOT NULL,
  requested_amount DECIMAL(12,2) NOT NULL,
  requested_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status           ENUM('pending','approved','paid','rejected')
                   NOT NULL DEFAULT 'pending',
  processed_at     DATETIME      DEFAULT NULL,

  PRIMARY KEY (payout_id),

  CONSTRAINT chk_pr_amount
    CHECK (requested_amount > 0.00),
  CONSTRAINT chk_pr_processed_at
    CHECK (processed_at IS NULL OR processed_at >= requested_at),

  CONSTRAINT fk_payout_driver
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id)
    ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ================================================================
--  MODULE 6 — RATINGS & REVIEWS
-- ================================================================

-- ------------------------------------------------------------
--  Rating
--  Mutual 1-5 star rating after every completed ride.
--  rated_by distinguishes which side is submitting.
--  UNIQUE (ride_id, rated_by) prevents double-submission from
--  the same side.
--  rater_id / ratee_id → User so the FK works regardless of
--  sub-role.
-- ------------------------------------------------------------
CREATE TABLE Rating (
  rating_id INT      NOT NULL AUTO_INCREMENT,
  ride_id   INT      NOT NULL,
  rated_by  ENUM('rider','driver') NOT NULL,
  rater_id  INT      NOT NULL COMMENT 'FK → User.user_id (person submitting)',
  ratee_id  INT      NOT NULL COMMENT 'FK → User.user_id (person being rated)',
  score     TINYINT  NOT NULL,
  comment   TEXT     DEFAULT NULL,
  rated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (rating_id),
  UNIQUE KEY uq_rating_per_ride_side (ride_id, rated_by),

  CONSTRAINT chk_rating_score
    CHECK (score BETWEEN 1 AND 5),
  CONSTRAINT chk_rating_different_users
    CHECK (rater_id <> ratee_id),

  CONSTRAINT fk_rating_ride
    FOREIGN KEY (ride_id)  REFERENCES Ride(ride_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_rating_rater
    FOREIGN KEY (rater_id) REFERENCES User(user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_rating_ratee
    FOREIGN KEY (ratee_id) REFERENCES User(user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ================================================================
--  STORED PROCEDURES
-- ================================================================

DELIMITER $$

-- ------------------------------------------------------------
--  sp_calculate_fare
--  Reads the current active Fare_Config and any applicable
--  Surge_Rule for the current time/day.  Applies promo discount
--  if a valid code is supplied.
--  All rates come from the database — nothing is hardcoded.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_calculate_fare$$
CREATE PROCEDURE sp_calculate_fare(
  IN  p_vehicle_type ENUM('economy','premium','bike'),
  IN  p_distance_km  DECIMAL(8,2),
  IN  p_duration_min INT,
  IN  p_promo_code   VARCHAR(30),
  OUT p_base_fare    DECIMAL(10,2),
  OUT p_surge_mult   DECIMAL(4,2),
  OUT p_discount     DECIMAL(10,2),
  OUT p_final_fare   DECIMAL(10,2),
  OUT p_fare_config_id INT,
  OUT p_error        VARCHAR(255)
)
BEGIN
  DECLARE v_base_rate    DECIMAL(8,2);
  DECLARE v_per_km       DECIMAL(8,2);
  DECLARE v_per_min      DECIMAL(8,2);
  DECLARE v_surge_mult   DECIMAL(4,2) DEFAULT 1.00;
  DECLARE v_disc_type    ENUM('percentage','flat');
  DECLARE v_disc_val     DECIMAL(8,2);
  DECLARE v_config_id    INT;
  DECLARE v_dow_bit      INT;
  DECLARE v_now_time     TIME;

  SET p_error    = NULL;
  SET p_discount = 0.00;
  SET p_surge_mult = 1.00;

  -- Validate inputs
  IF p_distance_km <= 0 THEN
    SET p_error = 'distance_km must be positive'; LEAVE sp_calculate_fare;
  END IF;
  IF p_duration_min <= 0 THEN
    SET p_error = 'duration_min must be positive'; LEAVE sp_calculate_fare;
  END IF;

  -- Fetch active fare config
  SELECT config_id, base_rate, per_km_rate, per_min_rate
  INTO   v_config_id, v_base_rate, v_per_km, v_per_min
  FROM   Fare_Config
  WHERE  vehicle_type  = p_vehicle_type
    AND  effective_from <= CURDATE()
    AND  (effective_to IS NULL OR effective_to >= CURDATE())
  ORDER  BY effective_from DESC
  LIMIT  1;

  IF v_base_rate IS NULL THEN
    SET p_error = CONCAT('No active fare config for vehicle type: ', p_vehicle_type);
    LEAVE sp_calculate_fare;
  END IF;

  SET p_fare_config_id = v_config_id;
  SET p_base_fare = v_base_rate
                  + (v_per_km  * p_distance_km)
                  + (v_per_min * p_duration_min);

  -- Check time-based surge rules
  -- DAYOFWEEK: 1=Sun,2=Mon,...,7=Sat → convert to bitmask Mon=1...Sun=64
  SET v_dow_bit  = POWER(2, MOD(DAYOFWEEK(NOW()) + 5, 7));
  SET v_now_time = TIME(NOW());

  SELECT MAX(multiplier) INTO v_surge_mult
  FROM   Surge_Rule
  WHERE  (days_mask & v_dow_bit) > 0
    AND  v_now_time BETWEEN time_from AND time_to;

  IF v_surge_mult IS NULL OR v_surge_mult < 1.00 THEN
    SET v_surge_mult = 1.00;
  END IF;
  SET p_surge_mult = v_surge_mult;

  -- Apply promo code
  IF p_promo_code IS NOT NULL AND TRIM(p_promo_code) != '' THEN
    SELECT discount_type, discount_value
    INTO   v_disc_type, v_disc_val
    FROM   Promo_Code
    WHERE  code        = TRIM(p_promo_code)
      AND  CURDATE()  BETWEEN valid_from AND valid_to
      AND  (usage_limit IS NULL OR times_used < usage_limit)
    LIMIT  1;

    IF v_disc_val IS NOT NULL THEN
      IF v_disc_type = 'percentage' THEN
        SET p_discount = (p_base_fare * v_surge_mult) * v_disc_val / 100.00;
      ELSE
        SET p_discount = LEAST(v_disc_val, p_base_fare * v_surge_mult);
      END IF;
    END IF;
  END IF;

  SET p_final_fare = GREATEST(0.00, (p_base_fare * v_surge_mult) - p_discount);
END$$


-- ------------------------------------------------------------
--  sp_complete_ride
--  Transitions ride to 'completed', calculates final fare,
--  creates Driver_Earnings row, and credits driver wallet.
--  Commission rate read from the current active Platform_Config.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_complete_ride$$
CREATE PROCEDURE sp_complete_ride(
  IN  p_ride_id      INT,
  IN  p_distance_km  DECIMAL(8,2),
  IN  p_duration_min INT,
  OUT p_net_earning  DECIMAL(10,2),
  OUT p_final_fare   DECIMAL(10,2),
  OUT p_error        VARCHAR(255)
)
BEGIN
  DECLARE v_driver_id      INT;
  DECLARE v_vehicle_type   ENUM('economy','premium','bike');
  DECLARE v_fare_config_id INT;
  DECLARE v_promo_id       INT;
  DECLARE v_promo_code     VARCHAR(30);
  DECLARE v_status         VARCHAR(20);
  DECLARE v_surge_mult     DECIMAL(4,2);
  DECLARE v_commission     DECIMAL(5,2);
  DECLARE v_base_fare      DECIMAL(10,2);
  DECLARE v_discount       DECIMAL(10,2);
  DECLARE v_unused_mult    DECIMAL(4,2);
  DECLARE v_unused_cfgid   INT;
  DECLARE v_comm_amount    DECIMAL(10,2);
  DECLARE v_vehicle_type_req ENUM('economy','premium','bike');

  SET p_error       = NULL;
  SET p_net_earning = NULL;
  SET p_final_fare  = NULL;

  -- Fetch ride
  SELECT ri.status, ri.driver_id, ri.surge_multiplier,
         ri.fare_config_id, v.vehicle_type,
         rr.vehicle_type_requested
  INTO   v_status, v_driver_id, v_surge_mult,
         v_fare_config_id, v_vehicle_type,
         v_vehicle_type_req
  FROM   Ride ri
  JOIN   Ride_Request rr ON rr.request_id = ri.request_id
  JOIN   Vehicle      v  ON v.vehicle_id  = ri.vehicle_id
  WHERE  ri.ride_id = p_ride_id;

  IF v_status IS NULL THEN
    SET p_error = 'Ride not found'; LEAVE sp_complete_ride;
  END IF;
  IF v_status != 'in_progress' THEN
    SET p_error = CONCAT('Cannot complete ride in status: ', v_status);
    LEAVE sp_complete_ride;
  END IF;

  -- Re-use fare calculation
  CALL sp_calculate_fare(
    v_vehicle_type, p_distance_km, p_duration_min,
    NULL,   -- no promo re-applied; promo already stored in Payment
    v_base_fare, v_unused_mult, v_discount, p_final_fare,
    v_unused_cfgid, p_error
  );
  IF p_error IS NOT NULL THEN LEAVE sp_complete_ride; END IF;

  -- Override with snapshotted surge from ride creation
  SET p_final_fare = GREATEST(0.00, v_base_fare * v_surge_mult);

  -- Current platform commission
  SELECT commission_rate INTO v_commission
  FROM   Platform_Config
  WHERE  effective_from <= CURDATE()
    AND  (effective_to IS NULL OR effective_to >= CURDATE())
  ORDER  BY effective_from DESC
  LIMIT  1;

  IF v_commission IS NULL THEN
    SET p_error = 'No active Platform_Config found'; LEAVE sp_complete_ride;
  END IF;

  SET v_comm_amount = p_final_fare * v_commission / 100.00;
  SET p_net_earning = p_final_fare - v_comm_amount;

  -- Update ride
  UPDATE Ride
  SET    status       = 'completed',
         completed_at = NOW(),
         distance_km  = p_distance_km,
         duration_min = p_duration_min,
         base_fare    = v_base_fare,
         final_fare   = p_final_fare
  WHERE  ride_id = p_ride_id;

  -- Record earnings (trigger will credit wallet)
  INSERT INTO Driver_Earnings
    (driver_id, ride_id, gross_amount, commission_rate,
     commission_amount, net_amount)
  VALUES
    (v_driver_id, p_ride_id, p_final_fare, v_commission,
     v_comm_amount, p_net_earning);

END$$


-- ------------------------------------------------------------
--  sp_request_payout
--  Driver requests a payout for their current wallet balance.
--  Creates a Payout_Request row; admin must approve separately.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_payout$$
CREATE PROCEDURE sp_request_payout(
  IN  p_driver_id INT,
  OUT p_payout_id INT,
  OUT p_error     VARCHAR(255)
)
BEGIN
  DECLARE v_balance DECIMAL(12,2);
  SET p_error = NULL; SET p_payout_id = NULL;

  SELECT wallet_balance INTO v_balance
  FROM   Driver WHERE driver_id = p_driver_id;

  IF v_balance IS NULL THEN
    SET p_error = 'Driver not found'; LEAVE sp_request_payout;
  END IF;
  IF v_balance <= 0 THEN
    SET p_error = 'No earnings available for payout'; LEAVE sp_request_payout;
  END IF;

  INSERT INTO Payout_Request (driver_id, requested_amount, status)
  VALUES (p_driver_id, v_balance, 'pending');
  SET p_payout_id = LAST_INSERT_ID();
  -- Wallet debit happens in trg_debit_wallet_on_payout when admin marks 'paid'
END$$

DELIMITER ;


-- ================================================================
--  TRIGGERS
-- ================================================================

DELIMITER $$

-- ------------------------------------------------------------
--  1. Recalculate Driver.avg_rating after rider → driver rating.
--     Auto-suspend driver account if avg_rating < 3.5 (spec §5).
-- ------------------------------------------------------------
CREATE TRIGGER trg_update_driver_avg_rating
AFTER INSERT ON Rating
FOR EACH ROW
BEGIN
  IF NEW.rated_by = 'rider' THEN

    UPDATE Driver d
      JOIN User u ON u.user_id = d.user_id
    SET d.avg_rating = (
      SELECT COALESCE(AVG(r.score), 0.00)
      FROM   Rating r
      WHERE  r.ratee_id = d.user_id
        AND  r.rated_by = 'rider'
    )
    WHERE u.user_id = NEW.ratee_id;

    -- Auto-suspend if avg drops below 3.5
    UPDATE User u
      JOIN Driver d ON d.user_id = u.user_id
    SET u.account_status = 'suspended'
    WHERE u.user_id = NEW.ratee_id
      AND d.avg_rating < 3.50
      AND u.account_status = 'active';

  END IF;
END$$


-- ------------------------------------------------------------
--  2. Recalculate Rider.avg_rating after driver → rider rating.
--     Flag rider if avg drops below 3.0 (spec §5).
-- ------------------------------------------------------------
CREATE TRIGGER trg_update_rider_avg_rating
AFTER INSERT ON Rating
FOR EACH ROW
BEGIN
  IF NEW.rated_by = 'driver' THEN

    UPDATE Rider ri
      JOIN User u ON u.user_id = ri.user_id
    SET ri.avg_rating = (
      SELECT COALESCE(AVG(r.score), 0.00)
      FROM   Rating r
      WHERE  r.ratee_id = ri.user_id
        AND  r.rated_by = 'driver'
    )
    WHERE u.user_id = NEW.ratee_id;

    -- Flag rider if avg drops below 3.0
    UPDATE Rider ri
      JOIN User u ON u.user_id = ri.user_id
    SET ri.flagged = 1
    WHERE u.user_id   = NEW.ratee_id
      AND ri.avg_rating < 3.00;

  END IF;
END$$


-- ------------------------------------------------------------
--  3. Credit driver wallet when a Driver_Earnings row is inserted.
-- ------------------------------------------------------------
CREATE TRIGGER trg_credit_wallet_on_earning
AFTER INSERT ON Driver_Earnings
FOR EACH ROW
BEGIN
  UPDATE Driver
  SET    wallet_balance   = wallet_balance + NEW.net_amount,
         trips_completed  = trips_completed + 1
  WHERE  driver_id = NEW.driver_id;
END$$


-- ------------------------------------------------------------
--  4. Debit driver wallet when a payout transitions to 'paid'.
--     OLD.status guard prevents double-debit.
-- ------------------------------------------------------------
CREATE TRIGGER trg_debit_wallet_on_payout
AFTER UPDATE ON Payout_Request
FOR EACH ROW
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    UPDATE Driver
    SET    wallet_balance = wallet_balance - NEW.requested_amount
    WHERE  driver_id = NEW.driver_id;
  END IF;
END$$


-- ------------------------------------------------------------
--  5. Increment Promo_Code.times_used when a payment uses a promo.
-- ------------------------------------------------------------
CREATE TRIGGER trg_increment_promo_usage
AFTER INSERT ON Payment
FOR EACH ROW
BEGIN
  IF NEW.promo_id IS NOT NULL THEN
    UPDATE Promo_Code
    SET    times_used = times_used + 1
    WHERE  promo_id   = NEW.promo_id;
  END IF;
END$$


-- ------------------------------------------------------------
--  6. Archive ride to Ride_History when status → completed /
--     cancelled. Reads denormalised address from Ride_Request.
-- ------------------------------------------------------------
CREATE TRIGGER trg_archive_ride
AFTER UPDATE ON Ride
FOR EACH ROW
BEGIN
  IF NEW.status IN ('completed','cancelled')
     AND OLD.status NOT IN ('completed','cancelled')
  THEN
    INSERT INTO Ride_History
      (ride_id, request_id, rider_id, driver_id,
       pickup_address, dropoff_address,
       final_status, fare, distance_km, duration_min,
       ride_started_at, ride_completed_at)
    SELECT
      NEW.ride_id, NEW.request_id, rr.rider_id, NEW.driver_id,
      rr.pickup_address, rr.dropoff_address,
      NEW.status, NEW.final_fare, NEW.distance_km, NEW.duration_min,
      NEW.started_at, NEW.completed_at
    FROM Ride_Request rr
    WHERE rr.request_id = NEW.request_id;
  END IF;
END$$


-- ------------------------------------------------------------
--  7. Log every driver availability change.
-- ------------------------------------------------------------
CREATE TRIGGER trg_log_availability
AFTER UPDATE ON Driver
FOR EACH ROW
BEGIN
  IF OLD.availability <> NEW.availability THEN
    INSERT INTO Driver_Availability_Log
      (driver_id, old_status, new_status)
    VALUES
      (NEW.driver_id, OLD.availability, NEW.availability);
  END IF;
END$$

DELIMITER ;


-- ================================================================
--  VIEWS
-- ================================================================

-- ------------------------------------------------------------
--  Driver leaderboard — verified drivers ranked by city then
--  avg_rating (spec §5 explicitly requires city-level ranking).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_driver_leaderboard AS
SELECT
  d.driver_id,
  u.full_name,
  u.email,
  d.city,
  d.avg_rating,
  d.trips_completed,
  d.availability,
  d.verification_status,
  RANK() OVER (
    PARTITION BY d.city
    ORDER BY d.avg_rating DESC, d.trips_completed DESC
  ) AS city_rank
FROM  Driver d
JOIN  User   u ON u.user_id = d.user_id
WHERE d.verification_status = 'verified';


-- ------------------------------------------------------------
--  Active online drivers — used by the matching algorithm.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_active_drivers AS
SELECT
  d.driver_id,
  u.full_name,
  u.email,
  p.phone_number,
  d.city,
  d.availability,
  d.avg_rating,
  d.trips_completed,
  d.current_lat,
  d.current_lng,
  dv.vehicle_id
FROM  Driver  d
JOIN  User    u  ON u.user_id   = d.user_id
LEFT  JOIN Phone p  ON p.user_id   = d.user_id AND p.is_primary = 1
LEFT  JOIN Driver_Vehicle dv ON dv.driver_id = d.driver_id AND dv.is_primary = 1
WHERE d.verification_status = 'verified'
  AND d.availability        = 'online';


-- ------------------------------------------------------------
--  Full ride summary — joins rider, driver, payment details.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_ride_summary AS
SELECT
  ri.ride_id,
  ri.status,
  ri.final_fare        AS fare,
  ri.distance_km,
  ri.duration_min,
  ri.surge_multiplier,
  ri.surge_type,
  ri.started_at,
  ri.completed_at,
  rr.pickup_address,
  rr.dropoff_address,
  rr.requested_at,
  ru.full_name         AS rider_name,
  ru.email             AS rider_email,
  du.full_name         AS driver_name,
  d.city               AS driver_city,
  p.payment_method,
  p.payment_status,
  pc.code              AS promo_code,
  p.promo_discount_applied AS discount_applied
FROM  Ride         ri
JOIN  Ride_Request rr  ON rr.request_id = ri.request_id
JOIN  Rider        r   ON r.rider_id    = rr.rider_id
JOIN  User         ru  ON ru.user_id    = r.user_id
LEFT  JOIN Driver  d   ON d.driver_id   = ri.driver_id
LEFT  JOIN User    du  ON du.user_id    = d.user_id
LEFT  JOIN Payment p   ON p.ride_id     = ri.ride_id
LEFT  JOIN Promo_Code pc ON pc.promo_id = p.promo_id;


-- ------------------------------------------------------------
--  Platform revenue — daily breakdown by payment method
--  (spec §4: revenue breakdown by payment method required).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_platform_revenue AS
SELECT
  DATE(de.credited_at)              AS earning_date,
  d.city,
  COUNT(DISTINCT de.earning_id)     AS total_rides,
  SUM(de.gross_amount)              AS gross_revenue,
  SUM(de.commission_amount)         AS platform_commission,
  SUM(de.net_amount)                AS driver_payouts,
  p.payment_method,
  COUNT(CASE WHEN p.payment_status = 'refunded' THEN 1 END) AS refunds
FROM  Driver_Earnings de
JOIN  Ride     r  ON r.ride_id  = de.ride_id
JOIN  Driver   d  ON d.driver_id = de.driver_id
JOIN  Payment  p  ON p.ride_id  = de.ride_id
GROUP BY earning_date, d.city, p.payment_method;


-- ------------------------------------------------------------
--  Driver earnings summary — per-driver totals with wallet
--  balance (spec §4: total driver earnings and commissions).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_driver_earnings_summary AS
SELECT
  d.driver_id,
  u.full_name         AS driver_name,
  d.city,
  d.trips_completed,
  d.avg_rating,
  d.wallet_balance,
  COALESCE(SUM(de.gross_amount),      0) AS total_gross,
  COALESCE(SUM(de.commission_amount), 0) AS total_commission,
  COALESCE(SUM(de.net_amount),        0) AS total_net
FROM  Driver          d
JOIN  User            u  ON u.user_id  = d.user_id
LEFT  JOIN Driver_Earnings de ON de.driver_id = d.driver_id
GROUP BY d.driver_id, u.full_name, d.city,
         d.trips_completed, d.avg_rating, d.wallet_balance;


-- ------------------------------------------------------------
--  Active promo codes — currently valid, non-exhausted codes.
-- ------------------------------------------------------------
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


-- ------------------------------------------------------------
--  Flagged riders — riders with avg_rating < 3.0
--  (spec §5: riders with consistently low ratings to be flagged).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_flagged_riders AS
SELECT
  r.rider_id,
  u.full_name,
  u.email,
  u.account_status,
  r.avg_rating,
  r.flagged
FROM  Rider r
JOIN  User  u ON u.user_id = r.user_id
WHERE r.flagged = 1;


-- ================================================================
--  ROLE-BASED ACCESS CONTROL  (DCL)
-- ================================================================

-- Admin: full control
CREATE USER IF NOT EXISTS 'rf_admin'@'%'
  IDENTIFIED BY 'Admin@RideFlow2026!';
GRANT ALL PRIVILEGES ON rideflow.* TO 'rf_admin'@'%';

-- Rider service account
CREATE USER IF NOT EXISTS 'rf_rider'@'%'
  IDENTIFIED BY 'Rider@RideFlow2026!';
GRANT SELECT, INSERT        ON rideflow.Ride_Request         TO 'rf_rider'@'%';
GRANT SELECT, INSERT        ON rideflow.Payment              TO 'rf_rider'@'%';
GRANT SELECT, INSERT        ON rideflow.Rating               TO 'rf_rider'@'%';
GRANT SELECT                ON rideflow.Ride                 TO 'rf_rider'@'%';
GRANT SELECT                ON rideflow.Ride_History         TO 'rf_rider'@'%';
GRANT SELECT                ON rideflow.Driver               TO 'rf_rider'@'%';
GRANT SELECT                ON rideflow.Vehicle              TO 'rf_rider'@'%';
GRANT SELECT                ON rideflow.Fare_Config          TO 'rf_rider'@'%';
GRANT SELECT                ON rideflow.Surge_Rule           TO 'rf_rider'@'%';
GRANT SELECT                ON rideflow.Promo_Code           TO 'rf_rider'@'%';
GRANT SELECT                ON rideflow.vw_active_promos     TO 'rf_rider'@'%';
GRANT SELECT                ON rideflow.vw_ride_summary      TO 'rf_rider'@'%';

-- Driver service account
CREATE USER IF NOT EXISTS 'rf_driver'@'%'
  IDENTIFIED BY 'Driver@RideFlow2026!';
GRANT SELECT, UPDATE        ON rideflow.Driver               TO 'rf_driver'@'%';
GRANT SELECT, UPDATE        ON rideflow.Driver_Notification  TO 'rf_driver'@'%';
GRANT SELECT                ON rideflow.Ride                 TO 'rf_driver'@'%';
GRANT SELECT                ON rideflow.Ride_History         TO 'rf_driver'@'%';
GRANT SELECT                ON rideflow.Driver_Earnings      TO 'rf_driver'@'%';
GRANT SELECT, INSERT        ON rideflow.Payout_Request       TO 'rf_driver'@'%';
GRANT SELECT, INSERT        ON rideflow.Rating               TO 'rf_driver'@'%';
GRANT SELECT                ON rideflow.vw_driver_leaderboard TO 'rf_driver'@'%';
GRANT SELECT                ON rideflow.vw_driver_earnings_summary TO 'rf_driver'@'%';

FLUSH PRIVILEGES;


-- ================================================================
--  SEED DATA
--  Only the admin user is hardcoded (per spec).
--  All config rows (fares, surge, commission, promos) are
--  parameterised — no rates are baked into procedures.
-- ================================================================

-- Fare config (rates come from DB, not procedures)
INSERT INTO Fare_Config
  (vehicle_type, base_rate, per_km_rate, per_min_rate, effective_from)
VALUES
  ('economy',  80.00, 25.00, 3.00, '2026-01-01'),
  ('premium', 150.00, 45.00, 5.00, '2026-01-01'),
  ('bike',     40.00, 12.00, 1.50, '2026-01-01');

-- Surge rules (time-based)
INSERT INTO Surge_Rule
  (label, time_from, time_to, days_mask, multiplier)
VALUES
  ('Morning Peak',  '08:00:00', '10:00:00',  31, 1.50),  -- Mon–Fri (1+2+4+8+16)
  ('Evening Peak',  '17:00:00', '20:00:00',  31, 1.40),
  ('Weekend Night', '22:00:00', '23:59:00',  96, 1.30);  -- Sat+Sun (32+64)

-- Demand surge tiers
INSERT INTO Demand_Surge_Config
  (ratio_min, ratio_max, multiplier)
VALUES
  (2.00, 3.00,  1.30),
  (3.00, 5.00,  1.60),
  (5.00, NULL,  2.00);

-- Platform commission
INSERT INTO Platform_Config
  (commission_rate, effective_from)
VALUES
  (20.00, '2026-01-01');

-- Promo codes
INSERT INTO Promo_Code
  (code, discount_type, discount_value, valid_from, valid_to, usage_limit)
VALUES
  ('WELCOME10', 'percentage', 10.00, '2026-01-01', '2026-12-31', 1000),
  ('FLAT50',    'flat',       50.00, '2026-04-01', '2026-12-31',  500),
  ('EID25',     'percentage', 25.00, '2026-03-30', '2026-04-10',  300);

-- ================================================================
--  ADMIN USER SEED  (only hardcoded user per spec)
--  username : admin   (email: admin@rideflow.pk)
--  password : admin123  → bcrypt hash stored below
--  In production replace the hash with: bcrypt.hash('admin123', 12)
-- ================================================================
INSERT INTO User
  (full_name, email, password_hash, role, account_status)
VALUES
  ('Super Admin',
   'admin@rideflow.pk',
   '$2b$12$RideFlowAdminHashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
   'admin',
   'active');

-- ================================================================
--  END OF SCHEMA
-- ================================================================