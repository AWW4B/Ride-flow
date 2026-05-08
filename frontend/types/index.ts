export type UserRole = 'admin' | 'rider' | 'driver';
export type AccountStatus = 'active' | 'suspended' | 'banned';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type AvailabilityStatus = 'online' | 'offline' | 'on_trip';
export type RideStatus = 'accepted' | 'enroute' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'wallet' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type VehicleType = 'economy' | 'premium' | 'bike';
export type SurgeType = 'none' | 'time_based' | 'demand_based';
export type PayoutStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  role: UserRole;
  account_status: AccountStatus;
  registered_at: string;
}

export interface Driver {
  driver_id: number;
  user_id: number;
  full_name: string;
  email: string;
  city: string;
  license_number: string;
  verification_status: VerificationStatus;
  availability: AvailabilityStatus;
  trips_completed: number;
  avg_rating: number;
  wallet_balance: number;
  vehicle?: string;
  vehicle_type?: VehicleType;
  phone?: string;
}

export interface Rider {
  rider_id: number;
  user_id: number;
  full_name: string;
  email: string;
  avg_rating: number;
  account_status: AccountStatus;
  total_rides: number;
  total_spent: number;
  cancelled_rides: number;
  registered_at: string;
  phone?: string;
}

export interface Ride {
  ride_id: number;
  rider_name: string;
  driver_name: string;
  vehicle: string;
  pickup_address: string;
  dropoff_address: string;
  status: RideStatus;
  distance_km: number;
  duration_min: number;
  final_fare: number;
  surge_multiplier: number;
  surge_type: SurgeType;
  started_at: string;
  completed_at?: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
}

export interface Payment {
  payment_id: number;
  ride_id: number;
  rider_name: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  promo_code?: string;
  promo_discount: number;
  transaction_date: string;
}

export interface Rating {
  rating_id: number;
  ride_id: number;
  rated_by: 'rider' | 'driver';
  rater_name: string;
  ratee_name: string;
  score: number;
  comment?: string;
  rated_at: string;
}

export interface PayoutRequest {
  payout_id: number;
  driver_name: string;
  driver_id: number;
  requested_amount: number;
  status: PayoutStatus;
  requested_at: string;
  wallet_balance: number;
}

export interface KPI {
  label: string;
  value: string;
  delta?: string;
  deltaDir?: 'up' | 'down';
  icon: string;
  accent?: boolean;
}
