-- ================================================================
--  RideFlow — procedures.sql
--  All stored procedures.
--  Run AFTER schema.sql.
--  Procedures implement the business logic that the requirements
--  explicitly call out as needing stored-procedure treatment:
--    • Fare calculation with surge (req: "stored procedure handles this")
--    • Ride request submission
--    • Driver matching (find nearest online verified driver)
--    • Ride completion (calc fare, create earnings, update statuses)
--    • Promo code validation
--    • Payout request creation with wallet balance check
--    • Admin: verify driver / vehicle
--    • Admin: generate revenue report (date range)
-- ================================================================

USE rideflow;

DELIMITER $$

-- ================================================================
--  sp_calculate_fare
--  Calculates estimated fare including surge for a given trip.
--  Called before ride confirmation to show rider the price.
--
--  IN:  p_vehicle_type  — 'economy'|'premium'|'bike'
--       p_distance_km   — estimated trip distance
--       p_duration_min  — estimated trip duration
--       p_promo_code    — promo code string or NULL
--  OUT: p_base_fare     — raw fare before surge
--       p_surge_mult    — surge multiplier applied
--       p_surge_type    — 'none'|'time_based'|'demand_based'
--       p_promo_disc    — discount amount from promo (0 if none)
--       p_final_fare    — base_fare * surge_mult - promo_disc
--       p_fare_cfg_id   — fare config id used (for Ride snapshot)
--       p_error         — NULL on success, message on error
-- ================================================================
CREATE PROCEDURE sp_calculate_fare(
  IN  p_vehicle_type  VARCHAR(10),
  IN  p_distance_km   DECIMAL(8,2),
  IN  p_duration_min  INT,
  IN  p_promo_code    VARCHAR(30),
  OUT p_base_fare     DECIMAL(10,2),
  OUT p_surge_mult    DECIMAL(4,2),
  OUT p_surge_type    VARCHAR(20),
  OUT p_promo_disc    DECIMAL(10,2),
  OUT p_final_fare    DECIMAL(10,2),
  OUT p_fare_cfg_id   INT,
  OUT p_error         VARCHAR(255)
)
BEGIN
  DECLARE v_base_rate     DECIMAL(8,2);
  DECLARE v_per_km        DECIMAL(8,2);
  DECLARE v_per_min       DECIMAL(8,2);
  DECLARE v_time_mult     DECIMAL(4,2) DEFAULT 1.00;
  DECLARE v_demand_mult   DECIMAL(4,2) DEFAULT 1.00;
  DECLARE v_disc_type     VARCHAR(20);
  DECLARE v_disc_val      DECIMAL(8,2);
  DECLARE v_promo_id      INT;
  DECLARE v_surge_raw     DECIMAL(10,2);

  SET p_error = NULL;
  SET p_promo_disc = 0.00;
  SET p_surge_type = 'none';

  -- 1. Get active fare config
  SELECT config_id, base_rate, per_km_rate, per_min_rate
  INTO   p_fare_cfg_id, v_base_rate, v_per_km, v_per_min
  FROM   Fare_Config
  WHERE  vehicle_type = p_vehicle_type
    AND  effective_to IS NULL
  ORDER BY effective_from DESC
  LIMIT 1;

  IF p_fare_cfg_id IS NULL THEN
    SET p_error = 'No active fare config found for vehicle type';
    LEAVE sp_calculate_fare;  -- exit procedure
  END IF;

  -- 2. Calculate base fare
  SET p_base_fare = v_base_rate
                  + (v_per_km  * p_distance_km)
                  + (v_per_min * p_duration_min);

  -- 3. Time-based surge — check current time against Surge_Rule
  SELECT MAX(multiplier)
  INTO   v_time_mult
  FROM   Surge_Rule
  WHERE  CURTIME() BETWEEN time_from AND time_to
    AND  (days_mask & (1 << (WEEKDAY(CURDATE())))) > 0;

  IF v_time_mult IS NULL THEN
    SET v_time_mult = 1.00;
  END IF;

  -- 4. Demand-based surge — use the highest applicable tier
  --    (In production the ratio is computed by the app layer
  --     and passed in; here we read the highest-multiplier tier
  --     as a conservative server-side fallback.)
  SELECT MAX(multiplier)
  INTO   v_demand_mult
  FROM   Demand_Surge_Config;

  IF v_demand_mult IS NULL THEN
    SET v_demand_mult = 1.00;
  END IF;

  -- 5. Pick dominant surge
  IF v_time_mult >= v_demand_mult THEN
    SET p_surge_mult = v_time_mult;
    IF v_time_mult > 1.00 THEN
      SET p_surge_type = 'time_based';
    END IF;
  ELSE
    SET p_surge_mult = v_demand_mult;
    SET p_surge_type = 'demand_based';
  END IF;

  -- 6. Promo code validation
  IF p_promo_code IS NOT NULL THEN
    SELECT promo_id, discount_type, discount_value
    INTO   v_promo_id, v_disc_type, v_disc_val
    FROM   Promo_Code
    WHERE  code       = p_promo_code
      AND  CURDATE()  BETWEEN valid_from AND valid_to
      AND  (usage_limit IS NULL OR times_used < usage_limit);

    IF v_promo_id IS NULL THEN
      SET p_error = 'Promo code is invalid or expired';
      -- Do not abort — just skip discount
      SET p_error = NULL;
    ELSE
      SET v_surge_raw = p_base_fare * p_surge_mult;
      IF v_disc_type = 'percentage' THEN
        SET p_promo_disc = v_surge_raw * v_disc_val / 100.00;
      ELSE
        SET p_promo_disc = LEAST(v_disc_val, v_surge_raw);
      END IF;
    END IF;
  END IF;

  -- 7. Final fare
  SET p_final_fare = GREATEST(0.00, (p_base_fare * p_surge_mult) - p_promo_disc);

END$$


-- ================================================================
--  sp_submit_ride_request
--  Rider submits a new ride request.
--  Validates rider is active, then inserts Ride_Request.
--
--  IN:  p_rider_id, pickup/dropoff coords + addresses,
--       p_vehicle_type, p_scheduled_time (NULL = immediate)
--  OUT: p_request_id — new request id
--       p_error      — NULL on success
-- ================================================================
CREATE PROCEDURE sp_submit_ride_request(
  IN  p_rider_id      INT,
  IN  p_pickup_lat    DECIMAL(9,6),
  IN  p_pickup_lng    DECIMAL(9,6),
  IN  p_pickup_addr   VARCHAR(300),
  IN  p_dropoff_lat   DECIMAL(9,6),
  IN  p_dropoff_lng   DECIMAL(9,6),
  IN  p_dropoff_addr  VARCHAR(300),
  IN  p_vehicle_type  VARCHAR(10),
  IN  p_scheduled_time DATETIME,
  OUT p_request_id    INT,
  OUT p_error         VARCHAR(255)
)
BEGIN
  DECLARE v_status VARCHAR(20);

  SET p_error = NULL;
  SET p_request_id = NULL;

  -- Check rider account is active
  SELECT u.account_status INTO v_status
  FROM   Rider ri
  JOIN   User  u ON u.user_id = ri.user_id
  WHERE  ri.rider_id = p_rider_id;

  IF v_status IS NULL THEN
    SET p_error = 'Rider not found';
  ELSEIF v_status <> 'active' THEN
    SET p_error = CONCAT('Rider account is ', v_status);
  ELSE
    INSERT INTO Ride_Request (
      rider_id, pickup_lat, pickup_lng, pickup_address,
      dropoff_lat, dropoff_lng, dropoff_address,
      vehicle_type_requested, scheduled_time, status
    ) VALUES (
      p_rider_id, p_pickup_lat, p_pickup_lng, p_pickup_addr,
      p_dropoff_lat, p_dropoff_lng, p_dropoff_addr,
      p_vehicle_type, p_scheduled_time, 'pending'
    );
    SET p_request_id = LAST_INSERT_ID();
  END IF;
END$$


-- ================================================================
--  sp_find_nearest_driver
--  Returns the closest online verified driver for a request.
--  Uses Haversine approximation via SQL.
--  The matching engine calls this, then inserts Driver_Notification.
--
--  IN:  p_request_id
--  OUT: p_driver_id  — best match, or NULL if none
--       p_vehicle_id — driver's primary verified vehicle
--       p_error
-- ================================================================
CREATE PROCEDURE sp_find_nearest_driver(
  IN  p_request_id  INT,
  OUT p_driver_id   INT,
  OUT p_vehicle_id  INT,
  OUT p_error       VARCHAR(255)
)
BEGIN
  DECLARE v_pickup_lat   DECIMAL(9,6);
  DECLARE v_pickup_lng   DECIMAL(9,6);
  DECLARE v_vtype        VARCHAR(10);

  SET p_error = NULL;
  SET p_driver_id  = NULL;
  SET p_vehicle_id = NULL;

  -- Get request details
  SELECT pickup_lat, pickup_lng, vehicle_type_requested
  INTO   v_pickup_lat, v_pickup_lng, v_vtype
  FROM   Ride_Request
  WHERE  request_id = p_request_id;

  IF v_pickup_lat IS NULL THEN
    SET p_error = 'Ride request not found';
  ELSE
    -- Haversine formula (in km); exclude drivers already in a trip
    -- Also exclude drivers already notified & pending for this request
    SELECT d.driver_id, dv.vehicle_id,
      (6371 * ACOS(
         COS(RADIANS(v_pickup_lat)) * COS(RADIANS(d.current_lat))
       * COS(RADIANS(d.current_lng) - RADIANS(v_pickup_lng))
       + SIN(RADIANS(v_pickup_lat)) * SIN(RADIANS(d.current_lat))
      )) AS distance_km
    INTO p_driver_id, p_vehicle_id
    FROM   Driver       d
    JOIN   Driver_Vehicle dv ON dv.driver_id  = d.driver_id
                             AND dv.is_primary = 1
    JOIN   Vehicle       v  ON v.vehicle_id   = dv.vehicle_id
                             AND v.vehicle_type = v_vtype
                             AND v.verification_status = 'verified'
    JOIN   User          u  ON u.user_id = d.user_id
                             AND u.account_status = 'active'
    WHERE  d.availability        = 'online'
      AND  d.verification_status = 'verified'
      AND  d.current_lat IS NOT NULL
      AND  d.current_lng IS NOT NULL
      AND  d.driver_id NOT IN (
             SELECT driver_id FROM Driver_Notification
             WHERE  request_id = p_request_id
               AND  response IN ('accepted','pending')
           )
    ORDER BY distance_km ASC
    LIMIT 1;

    IF p_driver_id IS NULL THEN
      SET p_error = 'No available driver found';
    END IF;
  END IF;
END$$


-- ================================================================
--  sp_complete_ride
--  Called when a driver marks a ride as completed.
--  Steps:
--    1. Validates ride exists and is in_progress
--    2. Updates Ride: status, completed_at, distance, duration,
--       base_fare, final_fare
--    3. Inserts Driver_Earnings (snapshots commission rate)
--    4. Trigger trg_credit_wallet_on_earning fires automatically
--    5. Trigger trg_increment_trips_completed fires automatically
--    6. Trigger trg_archive_ride fires automatically
--
--  IN:  p_ride_id, p_distance_km, p_duration_min
--  OUT: p_final_fare, p_net_earning, p_error
-- ================================================================
CREATE PROCEDURE sp_complete_ride(
  IN  p_ride_id      INT,
  IN  p_distance_km  DECIMAL(8,2),
  IN  p_duration_min INT,
  OUT p_final_fare   DECIMAL(10,2),
  OUT p_net_earning  DECIMAL(10,2),
  OUT p_error        VARCHAR(255)
)
BEGIN
  DECLARE v_driver_id      INT;
  DECLARE v_fare_cfg_id    INT;
  DECLARE v_surge_mult     DECIMAL(4,2);
  DECLARE v_promo_disc     DECIMAL(10,2);
  DECLARE v_base_rate      DECIMAL(8,2);
  DECLARE v_per_km         DECIMAL(8,2);
  DECLARE v_per_min        DECIMAL(8,2);
  DECLARE v_base_fare      DECIMAL(10,2);
  DECLARE v_commission_rate DECIMAL(5,2);
  DECLARE v_commission_amt DECIMAL(10,2);
  DECLARE v_ride_status    VARCHAR(20);

  SET p_error = NULL;
  SET p_final_fare  = NULL;
  SET p_net_earning = NULL;

  -- Fetch ride state
  SELECT status, driver_id, fare_config_id, surge_multiplier, promo_discount
  INTO   v_ride_status, v_driver_id, v_fare_cfg_id, v_surge_mult, v_promo_disc
  FROM   Ride
  WHERE  ride_id = p_ride_id;

  IF v_ride_status IS NULL THEN
    SET p_error = 'Ride not found';
  ELSEIF v_ride_status <> 'in_progress' THEN
    SET p_error = CONCAT('Cannot complete ride in status: ', v_ride_status);
  ELSE
    -- Fetch fare config rates
    SELECT base_rate, per_km_rate, per_min_rate
    INTO   v_base_rate, v_per_km, v_per_min
    FROM   Fare_Config
    WHERE  config_id = v_fare_cfg_id;

    SET v_base_fare  = v_base_rate
                     + (v_per_km  * p_distance_km)
                     + (v_per_min * p_duration_min);

    SET p_final_fare = GREATEST(0.00,
                         (v_base_fare * v_surge_mult) - v_promo_disc);

    -- Snapshot active commission rate
    SELECT commission_rate INTO v_commission_rate
    FROM   Platform_Config
    WHERE  effective_to IS NULL
    ORDER BY effective_from DESC
    LIMIT 1;

    IF v_commission_rate IS NULL THEN
      SET v_commission_rate = 20.00;  -- sensible default
    END IF;

    SET v_commission_amt = p_final_fare * v_commission_rate / 100.00;
    SET p_net_earning    = p_final_fare - v_commission_amt;

    -- Update Ride (triggers fire after this UPDATE)
    UPDATE Ride
    SET  status       = 'completed',
         completed_at = NOW(),
         distance_km  = p_distance_km,
         duration_min = p_duration_min,
         base_fare    = v_base_fare,
         final_fare   = p_final_fare
    WHERE ride_id = p_ride_id;

    -- Update Ride_Request status
    UPDATE Ride_Request
    SET  status = 'matched'  -- already matched; left for audit
    WHERE request_id = (
      SELECT request_id FROM Ride WHERE ride_id = p_ride_id
    );

    -- Insert earnings (trg_credit_wallet_on_earning fires here)
    INSERT INTO Driver_Earnings (
      driver_id, ride_id, gross_amount,
      commission_rate, commission_amount, net_amount
    ) VALUES (
      v_driver_id, p_ride_id, p_final_fare,
      v_commission_rate, v_commission_amt, p_net_earning
    );

    -- Set driver back to online
    UPDATE Driver SET availability = 'online' WHERE driver_id = v_driver_id;
  END IF;
END$$


-- ================================================================
--  sp_cancel_ride
--  Cancel a ride (by rider, driver, or system timeout).
--
--  IN:  p_ride_id, p_cancelled_by ('rider'|'driver'|'system'),
--       p_reason
--  OUT: p_error
-- ================================================================
CREATE PROCEDURE sp_cancel_ride(
  IN  p_ride_id       INT,
  IN  p_cancelled_by  VARCHAR(10),
  IN  p_reason        VARCHAR(255),
  OUT p_error         VARCHAR(255)
)
BEGIN
  DECLARE v_status    VARCHAR(20);
  DECLARE v_driver_id INT;

  SET p_error = NULL;

  SELECT status, driver_id INTO v_status, v_driver_id
  FROM   Ride WHERE ride_id = p_ride_id;

  IF v_status IS NULL THEN
    SET p_error = 'Ride not found';
  ELSEIF v_status IN ('completed','cancelled') THEN
    SET p_error = CONCAT('Ride already ', v_status);
  ELSE
    UPDATE Ride
    SET  status        = 'cancelled',
         cancel_reason = CONCAT('[', p_cancelled_by, '] ', p_reason)
    WHERE ride_id = p_ride_id;

    -- Free driver back to online
    UPDATE Driver SET availability = 'online' WHERE driver_id = v_driver_id;
  END IF;
END$$


-- ================================================================
--  sp_validate_promo
--  Validate a promo code and return discount amount for a fare.
--
--  IN:  p_code, p_fare_amount
--  OUT: p_promo_id, p_discount_amount, p_error
-- ================================================================
CREATE PROCEDURE sp_validate_promo(
  IN  p_code            VARCHAR(30),
  IN  p_fare_amount     DECIMAL(10,2),
  OUT p_promo_id        INT,
  OUT p_discount_amount DECIMAL(10,2),
  OUT p_error           VARCHAR(255)
)
BEGIN
  DECLARE v_disc_type VARCHAR(20);
  DECLARE v_disc_val  DECIMAL(8,2);

  SET p_error           = NULL;
  SET p_promo_id        = NULL;
  SET p_discount_amount = 0.00;

  SELECT promo_id, discount_type, discount_value
  INTO   p_promo_id, v_disc_type, v_disc_val
  FROM   Promo_Code
  WHERE  code       = p_code
    AND  CURDATE()  BETWEEN valid_from AND valid_to
    AND  (usage_limit IS NULL OR times_used < usage_limit);

  IF p_promo_id IS NULL THEN
    SET p_error = 'Invalid, expired, or exhausted promo code';
  ELSE
    IF v_disc_type = 'percentage' THEN
      SET p_discount_amount = p_fare_amount * v_disc_val / 100.00;
    ELSE
      SET p_discount_amount = LEAST(v_disc_val, p_fare_amount);
    END IF;
  END IF;
END$$


-- ================================================================
--  sp_request_payout
--  Driver requests a payout; validates wallet balance first.
--
--  IN:  p_driver_id, p_amount
--  OUT: p_payout_id, p_error
-- ================================================================
CREATE PROCEDURE sp_request_payout(
  IN  p_driver_id  INT,
  IN  p_amount     DECIMAL(12,2),
  OUT p_payout_id  INT,
  OUT p_error      VARCHAR(255)
)
BEGIN
  DECLARE v_balance DECIMAL(12,2);

  SET p_error     = NULL;
  SET p_payout_id = NULL;

  SELECT wallet_balance INTO v_balance
  FROM   Driver WHERE driver_id = p_driver_id;

  IF v_balance IS NULL THEN
    SET p_error = 'Driver not found';
  ELSEIF p_amount <= 0 THEN
    SET p_error = 'Payout amount must be positive';
  ELSEIF v_balance < p_amount THEN
    SET p_error = CONCAT('Insufficient balance. Available: ', v_balance);
  ELSE
    INSERT INTO Payout_Request (driver_id, requested_amount, status)
    VALUES (p_driver_id, p_amount, 'pending');
    SET p_payout_id = LAST_INSERT_ID();
  END IF;
END$$


-- ================================================================
--  sp_verify_driver
--  Admin: mark driver (and their vehicle) as verified/rejected.
--
--  IN:  p_driver_id, p_new_status ('verified'|'rejected'),
--       p_vehicle_id (the vehicle to verify, or NULL to skip)
--  OUT: p_error
-- ================================================================
CREATE PROCEDURE sp_verify_driver(
  IN  p_driver_id  INT,
  IN  p_new_status VARCHAR(10),
  IN  p_vehicle_id INT,
  OUT p_error      VARCHAR(255)
)
BEGIN
  SET p_error = NULL;

  IF p_new_status NOT IN ('verified','rejected') THEN
    SET p_error = 'Status must be verified or rejected';
  ELSE
    UPDATE Driver
    SET  verification_status = p_new_status
    WHERE driver_id = p_driver_id;

    IF ROW_COUNT() = 0 THEN
      SET p_error = 'Driver not found';
    ELSEIF p_vehicle_id IS NOT NULL THEN
      UPDATE Vehicle
      SET  verification_status = p_new_status
      WHERE vehicle_id = p_vehicle_id;
    END IF;
  END IF;
END$$


-- ================================================================
--  sp_revenue_report
--  Admin: fetch revenue summary for a date range.
--  Returns a result set (call via SELECT in app layer).
--
--  IN:  p_date_from, p_date_to
-- ================================================================
CREATE PROCEDURE sp_revenue_report(
  IN p_date_from DATE,
  IN p_date_to   DATE
)
BEGIN
  SELECT
    DATE(de.credited_at)              AS earning_date,
    p.payment_method,
    COUNT(de.earning_id)              AS ride_count,
    SUM(de.gross_amount)              AS gross_revenue,
    SUM(de.commission_amount)         AS platform_commission,
    SUM(de.net_amount)                AS driver_payouts,
    COUNT(CASE WHEN p.payment_status = 'refunded' THEN 1 END) AS refunds,
    SUM(CASE WHEN p.payment_status = 'refunded' THEN p.amount ELSE 0 END)
                                      AS refund_amount
  FROM  Driver_Earnings de
  JOIN  Ride    r ON r.ride_id  = de.ride_id
  JOIN  Payment p ON p.ride_id  = de.ride_id
  WHERE DATE(de.credited_at) BETWEEN p_date_from AND p_date_to
  GROUP BY earning_date, p.payment_method
  ORDER BY earning_date ASC, p.payment_method ASC;
END$$

DELIMITER ;