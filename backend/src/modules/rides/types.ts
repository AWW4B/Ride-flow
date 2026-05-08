// ============================================================
// src/modules/rides/types.ts
// ============================================================
//
// TODO: Define types for rides module.
//
//   export type RideStatus = 'accepted' | 'enroute' | 'in_progress' | 'completed' | 'cancelled';
//
//   export interface Ride {
//     ride_id:          number;
//     request_id:       number;
//     driver_id:        number;
//     vehicle_id:       number;
//     status:           RideStatus;
//     surge_multiplier: number;
//     surge_type:       'none' | 'time_based' | 'demand_based';
//     fare_config_id:   number;
//     promo_discount:   number;
//     base_fare:        number | null;
//     final_fare:       number | null;
//     distance_km:      number | null;
//     duration_min:     number | null;
//     started_at:       Date;
//     completed_at:     Date | null;
//     cancel_reason:    string | null;
//   }
//
//   export interface BookRideBody {
//     pickup_lat:       number;
//     pickup_lng:       number;
//     pickup_address:   string;
//     dropoff_lat:      number;
//     dropoff_lng:      number;
//     dropoff_address:  string;
//     vehicle_type:     'economy' | 'premium' | 'bike';
//     promo_code?:      string;
//     scheduled_time?:  string;   // ISO datetime
//   }
//
//   export interface FareEstimateBody {
//     vehicle_type:   'economy' | 'premium' | 'bike';
//     distance_km:    number;
//     duration_min:   number;
//     promo_code?:    string;
//   }
//
//   export interface CompleteRideBody {
//     distance_km:  number;
//     duration_min: number;
//   }
//
//   export interface CancelRideBody {
//     reason: string;
//   }
