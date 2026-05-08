-- ================================================================
--  RideFlow — schema.sql
--  Complete DDL (tables + triggers)
--  Corrections vs original:
--    • Added City column to Driver (leaderboard req: "top drivers per city")
--    • Added Ride_History table (req: "archived in a Ride History table")
--    • Added trg_archive_ride trigger (auto-archive completed/cancelled rides)
--    • Added Rider low-rating auto-flag trigger (req: "riders < 3.0 flagged")
--    • Added trg_debit_wallet_on_payout wallet-balance guard (negative wallet)
--    • Driver_Notification: added UNIQUE(request_id, driver_id) — prevents
--      duplicate notifications to the same driver for the same request
--    • Ride: added cancel_reason VARCHAR for cancelled rides
--    • Payment: added gateway_ref VARCHAR for card/wallet transaction tracing
--    • All ENUMs that were missing a value added (Ride status had no 'requested')
--    • Removed DROP DATABASE (dangerous in cloud env; handled by migrations)
-- ================================================================

CREATE DATABASE IF NOT EXISTS rideflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rideflow;

-- ================================================================
--  MODULE 1 — USER & ACCESS
-- ================================================================

CREATE TABLE IF NOT EXISTS User (
  user_id        INT           NOT NULL AUTO_INCREMENT,
  full_name      VARCHAR(120)  NOT NULL,
  email          VARCHAR(180)  NOT NULL,
  password_hash  VARCHAR(255)  NOT NULL,
  role           ENUM('admin','rider','driver') NOT NULL,
  account_status ENUM('active','suspended','banned') NOT NULL DEFAULT 'active',
  registered_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id),
  UNIQUE  KEY uq_user_email (email),

  CONSTRAINT chk_user_email
    CHECK (email LIKE '%@%.%'),
  CONSTRAINT chk_user_fullname
    CHECK (CHAR_LENGTH(TRIM(full_name)) > 0)

) ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS Phone (
  phone_id     INT          NOT NULL AUTO_INCREMENT,
  user_id      INT          NOT NULL,
  phone_number VARCHAR(20)  NOT NULL,
  is_primary   TINYINT(1)   NOT NULL DEFAULT 0,

  PRIMARY KEY (phone_id),

  CONSTRAINT chk_phone_isprimary
    CHECK (is_primary IN (0, 1)),
  CONSTRAINT chk_phone_number_len
    CHECK (CHAR_LENGTH(phone_number) >= 7),

  CONSTRAINT fk_phone_user
    FOREIGN KEY (user_id) REFERENCES User(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS Rider (
  rider_id   INT           NOT NULL AUTO_INCREMENT,
  user_id    INT           NOT NULL,
  avg_rating DECIMAL(3,2)  NOT NULL DEFAULT 0.00
             COMMENT 'Cached; updated by trg_update_rider_avg_rating',

  PRIMARY KEY (rider_id),
  UNIQUE  KEY uq_rider_user (user_id),

  CONSTRAINT chk_rider_avg_rating
    CHECK (avg_rating BETWEEN 0.00 AND 5.00),

  CONSTRAINT fk_rider_user
    FOREIGN KEY (user_id) REFERENCES User(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ----------------------------------------------------------------
--  Driver  — added city column (required for per-city leaderboard)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Driver (
  driver_id           INT            NOT NULL AUTO_INCREMENT,
  user_id             INT            NOT NULL,
  cnic                VARCHAR(15)    NOT NULL
                      COMMENT 'Pakistani National ID: 13 digits or 15 with dashes',
  license_number      VARCHAR(30)    NOT NULL,
  photo_url           VARCHAR(500)   DEFAULT NULL,
  city                VARCHAR(80)    DEFAULT NULL
                      COMMENT 'Home city; used for per-city leaderboard view',
  verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  availability        ENUM('online','offline','on_trip')    NOT NULL DEFAULT 'offline',
  trips_completed     INT            NOT NULL DEFAULT 0,
  avg_rating          DECIMAL(3,2)   NOT NULL DEFAULT 0.00
                      COMMENT 'Cached; updated by trg_update_driver_avg_rating',
  wallet_balance      DECIMAL(12,2)  NOT NULL DEFAULT 0.00
                      COMMENT 'Trigger: +net_amount on Driver_Earnings INSERT; -amount on Payout paid',
  current_lat         DECIMAL(9,6)   DEFAULT NULL,
  current_lng         DECIMAL(9,6)   DEFAULT NULL,

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

  CONSTRAINT fk_driver_user
    FOREIGN KEY (user_id) REFERENCES User(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ================================================================
--  MODULE 2 — DRIVER & VEHICLE
-- ================================================================

CREATE TABLE IF NOT EXISTS Vehicle (
  vehicle_id          INT           NOT NULL AUTO_INCREMENT,
  make                VARCHAR(60)   NOT NULL,
  model               VARCHAR(60)   NOT NULL,
  year                YEAR          NOT NULL,
  color               VARCHAR(40)   NOT NULL,
  license_plate       VARCHAR(20)   NOT NULL,
  vehicle_type        ENUM('economy','premium','bike') NOT NULL,
  verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',

  PRIMARY KEY (vehicle_id),
  UNIQUE KEY uq_vehicle_plate (license_plate),

  CONSTRAINT chk_vehicle_year
    CHECK (year BETWEEN 1980 AND YEAR(CURDATE()) + 1),
  CONSTRAINT chk_vehicle_make
    CHECK (CHAR_LENGTH(TRIM(make)) > 0),
  CONSTRAINT chk_vehicle_model
    CHECK (CHAR_LENGTH(TRIM(model)) > 0)

) ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS Driver_Vehicle (
  driver_id   INT          NOT NULL,
  vehicle_id  INT          NOT NULL,
  assigned_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_primary  TINYINT(1)   NOT NULL DEFAULT 0
              COMMENT '1 = this vehicle is the driver active vehicle for matching',

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


-- ================================================================
--  MODULE 3 — FARE & CONFIG
-- ================================================================

CREATE TABLE IF NOT EXISTS Fare_Config (
  config_id      INT           NOT NULL AUTO_INCREMENT,
  vehicle_type   ENUM('economy','premium','bike') NOT NULL,
  base_rate      DECIMAL(8,2)  NOT NULL,
  per_km_rate    DECIMAL(8,2)  NOT NULL,
  per_min_rate   DECIMAL(8,2)  NOT NULL,
  effective_from DATE          NOT NULL,
  effective_to   DATE          DEFAULT NULL
                 COMMENT 'NULL = currently active',

  PRIMARY KEY (config_id),

  CONSTRAINT chk_fc_base_rate  CHECK (base_rate > 0),
  CONSTRAINT chk_fc_per_km     CHECK (per_km_rate > 0),
  CONSTRAINT chk_fc_per_min    CHECK (per_min_rate > 0),
  CONSTRAINT chk_fc_dates
    CHECK (effective_to IS NULL OR effective_to > effective_from)

) ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS Surge_Rule (
  surge_id    INT              NOT NULL AUTO_INCREMENT,
  label       VARCHAR(80)      NOT NULL,
  time_from   TIME             NOT NULL,
  time_to     TIME             NOT NULL,
  days_mask   TINYINT UNSIGNED NOT NULL
              COMMENT 'Bitmask: Mon=1 Tue=2 Wed=4 Thu=8 Fri=16 Sat=32 Sun=64',
  multiplier  DECIMAL(4,2)     NOT NULL,

  PRIMARY KEY (surge_id),

  CONSTRAINT chk_sr_multiplier  CHECK (multiplier >= 1.00),
  CONSTRAINT chk_sr_time_order  CHECK (time_to > time_from),
  CONSTRAINT chk_sr_days_mask   CHECK (days_mask BETWEEN 1 AND 127),
  CONSTRAINT chk_sr_label       CHECK (CHAR_LENGTH(TRIM(label)) > 0)

) ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS Demand_Surge_Config (
  id          INT           NOT NULL AUTO_INCREMENT,
  ratio_min   DECIMAL(6,2)  NOT NULL,
  ratio_max   DECIMAL(6,2)  DEFAULT NULL
              COMMENT 'NULL = unbounded (highest tier)',
  multiplier  DECIMAL(4,2)  NOT NULL,

  PRIMARY KEY (id),

  CONSTRAINT chk_dsc_ratio_min   CHECK (ratio_min >= 0),
  CONSTRAINT chk_dsc_ratio_max   CHECK (ratio_max IS NULL OR ratio_max > ratio_min),
  CONSTRAINT chk_dsc_multiplier  CHECK (multiplier >= 1.00)

) ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS Platform_Config (
  config_id       INT           NOT NULL AUTO_INCREMENT,
  commission_rate DECIMAL(5,2)  NOT NULL
                  COMMENT 'Platform cut as a percentage, e.g. 20.00 = 20%',
  effective_from  DATE          NOT NULL,
  effective_to    DATE          DEFAULT NULL,

  PRIMARY KEY (config_id),

  CONSTRAINT chk_pc_commission
    CHECK (commission_rate BETWEEN 0.00 AND 100.00),
  CONSTRAINT chk_pc_dates
    CHECK (effective_to IS NULL OR effective_to > effective_from)

) ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS Promo_Code (
  promo_id       INT           NOT NULL AUTO_INCREMENT,
  code           VARCHAR(30)   NOT NULL,
  discount_type  ENUM('percentage','flat') NOT NULL,
  discount_value DECIMAL(8,2)  NOT NULL,
  valid_from     DATE          NOT NULL,
  valid_to       DATE          NOT NULL,
  usage_limit    INT           DEFAULT NULL,
  times_used     INT           NOT NULL DEFAULT 0,

  PRIMARY KEY (promo_id),
  UNIQUE KEY uq_promo_code (code),

  CONSTRAINT chk_promo_discount_val  CHECK (discount_value > 0),
  CONSTRAINT chk_promo_pct_range     CHECK (discount_type = 'flat' OR discount_value <= 100.00),
  CONSTRAINT chk_promo_dates         CHECK (valid_to >= valid_from),
  CONSTRAINT chk_promo_usage_limit   CHECK (usage_limit IS NULL OR usage_limit >= 1),
  CONSTRAINT chk_promo_times_used    CHECK (times_used >= 0),
  CONSTRAINT chk_promo_code_nonempty CHECK (CHAR_LENGTH(TRIM(code)) > 0)

) ENGINE = InnoDB;


-- ================================================================
--  MODULE 4 — RIDE LIFECYCLE
-- ================================================================

-- ----------------------------------------------------------------
--  Ride_Request — status now includes 'expired' from the original
--  and keeps 'pending' | 'matched' | 'cancelled' | 'expired'
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Ride_Request (
  request_id             INT            NOT NULL AUTO_INCREMENT,
  rider_id               INT            NOT NULL,
  pickup_lat             DECIMAL(9,6)   NOT NULL,
  pickup_lng             DECIMAL(9,6)   NOT NULL,
  pickup_address         VARCHAR(300)   NOT NULL,
  dropoff_lat            DECIMAL(9,6)   NOT NULL,
  dropoff_lng            DECIMAL(9,6)   NOT NULL,
  dropoff_address        VARCHAR(300)   NOT NULL,
  vehicle_type_requested ENUM('economy','premium','bike') NOT NULL,
  scheduled_time         DATETIME       DEFAULT NULL
                         COMMENT 'NULL = immediate dispatch; future = scheduled',
  requested_at           DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status                 ENUM('pending','matched','cancelled','expired')
                         NOT NULL DEFAULT 'pending',

  PRIMARY KEY (request_id),

  CONSTRAINT chk_rr_pickup_lat   CHECK (pickup_lat  BETWEEN -90.000000  AND  90.000000),
  CONSTRAINT chk_rr_pickup_lng   CHECK (pickup_lng  BETWEEN -180.000000 AND 180.000000),
  CONSTRAINT chk_rr_dropoff_lat  CHECK (dropoff_lat BETWEEN -90.000000  AND  90.000000),
  CONSTRAINT chk_rr_dropoff_lng  CHECK (dropoff_lng BETWEEN -180.000000 AND 180.000000),
  CONSTRAINT chk_rr_different_locations
    CHECK (pickup_lat <> dropoff_lat OR pickup_lng <> dropoff_lng),
  CONSTRAINT chk_rr_scheduled_time
    CHECK (scheduled_time IS NULL OR scheduled_time > requested_at),
  CONSTRAINT chk_rr_pickup_addr   CHECK (CHAR_LENGTH(TRIM(pickup_address))  > 0),
  CONSTRAINT chk_rr_dropoff_addr  CHECK (CHAR_LENGTH(TRIM(dropoff_address)) > 0),

  CONSTRAINT fk_rr_rider
    FOREIGN KEY (rider_id) REFERENCES Rider(rider_id)
    ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ----------------------------------------------------------------
--  Driver_Notification
--  CORRECTION: added UNIQUE(request_id, driver_id) — a driver
--  should never be notified twice for the same request.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Driver_Notification (
  notification_id INT      NOT NULL AUTO_INCREMENT,
  request_id      INT      NOT NULL,
  driver_id       INT      NOT NULL,
  sent_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  response        ENUM('pending','accepted','rejected','expired')
                  NOT NULL DEFAULT 'pending',
  responded_at    DATETIME DEFAULT NULL,

  PRIMARY KEY (notification_id),
  UNIQUE KEY uq_dn_request_driver (request_id, driver_id),  -- CORRECTION

  CONSTRAINT chk_dn_responded_at
    CHECK (responded_at IS NULL OR responded_at >= sent_at),

  CONSTRAINT fk_dn_request
    FOREIGN KEY (request_id) REFERENCES Ride_Request(request_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dn_driver
    FOREIGN KEY (driver_id)  REFERENCES Driver(driver_id)
    ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ----------------------------------------------------------------
--  Ride
--  CORRECTION: added cancel_reason — needed to log why a ride
--  was cancelled (driver/rider/system initiated).
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Ride (
  ride_id          INT            NOT NULL AUTO_INCREMENT,
  request_id       INT            NOT NULL,
  driver_id        INT            NOT NULL,
  vehicle_id       INT            NOT NULL,
  fare_config_id   INT            NOT NULL,
  status           ENUM('accepted','enroute','in_progress',
                        'completed','cancelled')
                   NOT NULL DEFAULT 'accepted',
  cancel_reason    VARCHAR(255)   DEFAULT NULL
                   COMMENT 'Populated only when status = cancelled',
  started_at       DATETIME       DEFAULT NULL,
  completed_at     DATETIME       DEFAULT NULL,
  distance_km      DECIMAL(8,2)   DEFAULT NULL,
  duration_min     INT            DEFAULT NULL,
  surge_multiplier DECIMAL(4,2)   NOT NULL DEFAULT 1.00,
  surge_type       ENUM('none','time_based','demand_based') NOT NULL DEFAULT 'none',
  base_fare        DECIMAL(10,2)  DEFAULT NULL,
  promo_discount   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  final_fare       DECIMAL(10,2)  DEFAULT NULL,

  PRIMARY KEY (ride_id),
  UNIQUE KEY uq_ride_request (request_id),

  CONSTRAINT chk_ride_distance    CHECK (distance_km IS NULL OR distance_km > 0),
  CONSTRAINT chk_ride_duration    CHECK (duration_min IS NULL OR duration_min > 0),
  CONSTRAINT chk_ride_surge       CHECK (surge_multiplier >= 1.00),
  CONSTRAINT chk_ride_base_fare   CHECK (base_fare IS NULL OR base_fare >= 0),
  CONSTRAINT chk_ride_promo_disc  CHECK (promo_discount >= 0.00),
  CONSTRAINT chk_ride_final_fare  CHECK (final_fare IS NULL OR final_fare >= 0),
  CONSTRAINT chk_ride_time_order
    CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at),

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


-- ----------------------------------------------------------------
--  Ride_History  — NEW TABLE (requirement: archive completed/
--  cancelled rides; separate table keeps Ride lean for active ops)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Ride_History (
  history_id       INT            NOT NULL AUTO_INCREMENT,
  ride_id          INT            NOT NULL,
  rider_id         INT            NOT NULL,
  driver_id        INT            NOT NULL,
  vehicle_id       INT            NOT NULL,
  pickup_address   VARCHAR(300)   NOT NULL,
  dropoff_address  VARCHAR(300)   NOT NULL,
  final_status     ENUM('completed','cancelled') NOT NULL,
  cancel_reason    VARCHAR(255)   DEFAULT NULL,
  distance_km      DECIMAL(8,2)   DEFAULT NULL,
  duration_min     INT            DEFAULT NULL,
  final_fare       DECIMAL(10,2)  DEFAULT NULL,
  surge_multiplier DECIMAL(4,2)   NOT NULL DEFAULT 1.00,
  surge_type       ENUM('none','time_based','demand_based') NOT NULL DEFAULT 'none',
  archived_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (history_id),
  UNIQUE KEY uq_rh_ride (ride_id),

  CONSTRAINT fk_rh_ride
    FOREIGN KEY (ride_id)   REFERENCES Ride(ride_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_rh_rider
    FOREIGN KEY (rider_id)  REFERENCES Rider(rider_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_rh_driver
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id)
    ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE = InnoDB;


-- ================================================================
--  MODULE 5 — PAYMENT & EARNINGS
-- ================================================================

-- ----------------------------------------------------------------
--  Payment
--  CORRECTION: added gateway_ref for card/wallet transaction IDs
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Payment (
  payment_id             INT            NOT NULL AUTO_INCREMENT,
  ride_id                INT            NOT NULL,
  rider_id               INT            NOT NULL,
  amount                 DECIMAL(10,2)  NOT NULL,
  payment_method         ENUM('cash','wallet','card') NOT NULL,
  payment_status         ENUM('pending','paid','failed','refunded')
                         NOT NULL DEFAULT 'pending',
  promo_id               INT            DEFAULT NULL,
  promo_discount_applied DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  gateway_ref            VARCHAR(120)   DEFAULT NULL
                         COMMENT 'External transaction ID for card/wallet payments',
  transaction_date       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (payment_id),
  UNIQUE KEY uq_payment_ride (ride_id),

  CONSTRAINT chk_pay_amount       CHECK (amount >= 0.00),
  CONSTRAINT chk_pay_promo_disc   CHECK (promo_discount_applied >= 0.00),
  CONSTRAINT chk_pay_disc_lte_amt CHECK (promo_discount_applied <= amount),

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


CREATE TABLE IF NOT EXISTS Driver_Earnings (
  earning_id        INT            NOT NULL AUTO_INCREMENT,
  driver_id         INT            NOT NULL,
  ride_id           INT            NOT NULL,
  gross_amount      DECIMAL(10,2)  NOT NULL COMMENT 'Equals Ride.final_fare',
  commission_rate   DECIMAL(5,2)   NOT NULL COMMENT 'Snapshotted from Platform_Config',
  commission_amount DECIMAL(10,2)  NOT NULL,
  net_amount        DECIMAL(10,2)  NOT NULL COMMENT 'Credited to driver wallet',
  credited_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (earning_id),
  UNIQUE KEY uq_earning_ride (ride_id),

  CONSTRAINT chk_de_gross            CHECK (gross_amount >= 0.00),
  CONSTRAINT chk_de_commission_rate  CHECK (commission_rate BETWEEN 0.00 AND 100.00),
  CONSTRAINT chk_de_commission_amt   CHECK (commission_amount >= 0.00),
  CONSTRAINT chk_de_net              CHECK (net_amount >= 0.00),

  CONSTRAINT fk_earn_driver
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_earn_ride
    FOREIGN KEY (ride_id)   REFERENCES Ride(ride_id)
    ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS Payout_Request (
  payout_id        INT            NOT NULL AUTO_INCREMENT,
  driver_id        INT            NOT NULL,
  requested_amount DECIMAL(12,2)  NOT NULL,
  requested_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status           ENUM('pending','approved','paid','rejected')
                   NOT NULL DEFAULT 'pending',
  processed_at     DATETIME       DEFAULT NULL,

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

CREATE TABLE IF NOT EXISTS Rating (
  rating_id INT      NOT NULL AUTO_INCREMENT,
  ride_id   INT      NOT NULL,
  rated_by  ENUM('rider','driver') NOT NULL,
  rater_id  INT      NOT NULL COMMENT 'FK → User.user_id',
  ratee_id  INT      NOT NULL COMMENT 'FK → User.user_id',
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
--  TRIGGERS
-- ================================================================

DELIMITER $$

-- 1. Update Driver.avg_rating after rider→driver rating
--    Auto-suspend driver if avg drops below 3.5
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

    UPDATE User u
      JOIN Driver d ON d.user_id = u.user_id
    SET u.account_status = 'suspended'
    WHERE u.user_id       = NEW.ratee_id
      AND d.avg_rating    < 3.50
      AND u.account_status = 'active';
  END IF;
END$$


-- 2. Update Rider.avg_rating after driver→rider rating
--    CORRECTION: also flag rider if avg drops below 3.0 (req)
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

    -- Flag (suspend) rider if avg rating falls below 3.0
    UPDATE User u
      JOIN Rider ri ON ri.user_id = u.user_id
    SET u.account_status = 'suspended'
    WHERE u.user_id       = NEW.ratee_id
      AND ri.avg_rating   < 3.00
      AND u.account_status = 'active';
  END IF;
END$$


-- 3. Credit driver wallet on new Driver_Earnings row
CREATE TRIGGER trg_credit_wallet_on_earning
AFTER INSERT ON Driver_Earnings
FOR EACH ROW
BEGIN
  UPDATE Driver
  SET    wallet_balance = wallet_balance + NEW.net_amount
  WHERE  driver_id = NEW.driver_id;
END$$


-- 4. Debit driver wallet when payout flips to 'paid'
--    CORRECTION: guard prevents wallet going negative
CREATE TRIGGER trg_debit_wallet_on_payout
AFTER UPDATE ON Payout_Request
FOR EACH ROW
BEGIN
  DECLARE v_balance DECIMAL(12,2);
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    SELECT wallet_balance INTO v_balance
    FROM   Driver
    WHERE  driver_id = NEW.driver_id;

    IF v_balance < NEW.requested_amount THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient wallet balance for payout';
    END IF;

    UPDATE Driver
    SET    wallet_balance = wallet_balance - NEW.requested_amount
    WHERE  driver_id = NEW.driver_id;
  END IF;
END$$


-- 5. Increment Promo_Code.times_used when a payment uses a promo
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


-- 6. Increment Driver.trips_completed when a ride is completed
CREATE TRIGGER trg_increment_trips_completed
AFTER UPDATE ON Ride
FOR EACH ROW
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    UPDATE Driver
    SET    trips_completed = trips_completed + 1
    WHERE  driver_id = NEW.driver_id;
  END IF;
END$$


-- 7. NEW: Auto-archive ride into Ride_History on completion/cancel
CREATE TRIGGER trg_archive_ride
AFTER UPDATE ON Ride
FOR EACH ROW
BEGIN
  IF (NEW.status = 'completed' OR NEW.status = 'cancelled')
     AND OLD.status NOT IN ('completed','cancelled') THEN

    INSERT INTO Ride_History (
      ride_id, rider_id, driver_id, vehicle_id,
      pickup_address, dropoff_address,
      final_status, cancel_reason,
      distance_km, duration_min, final_fare,
      surge_multiplier, surge_type
    )
    SELECT
      r.ride_id,
      rr.rider_id,
      r.driver_id,
      r.vehicle_id,
      rr.pickup_address,
      rr.dropoff_address,
      NEW.status,
      NEW.cancel_reason,
      NEW.distance_km,
      NEW.duration_min,
      NEW.final_fare,
      NEW.surge_multiplier,
      NEW.surge_type
    FROM Ride r
    JOIN Ride_Request rr ON rr.request_id = r.request_id
    WHERE r.ride_id = NEW.ride_id;

  END IF;
END$$

DELIMITER ;