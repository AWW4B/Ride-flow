import type { Driver, Rider, Ride, Payment, Rating, PayoutRequest } from '@/types';

export const mockDrivers: Driver[] = [
  { driver_id:1, user_id:5, full_name:'Ali Raza',     email:'ali@example.com',   city:'Islamabad', license_number:'LIC-ALI-001',   verification_status:'verified', availability:'online',  trips_completed:124, avg_rating:4.91, wallet_balance:387.18,  vehicle:'Toyota Corolla 2022', vehicle_type:'economy', phone:'+923009876543' },
  { driver_id:2, user_id:6, full_name:'Bilal Sheikh',  email:'bilal@example.com', city:'Lahore',    license_number:'LIC-BILAL-001', verification_status:'verified', availability:'on_trip', trips_completed:89,  avg_rating:4.72, wallet_balance:1240.50, vehicle:'Honda CB150 2023',   vehicle_type:'bike',    phone:'+923335551234' },
  { driver_id:3, user_id:7, full_name:'Usman Tariq',   email:'usman@example.com', city:'Islamabad', license_number:'LIC-USMAN-001', verification_status:'verified', availability:'offline', trips_completed:207, avg_rating:4.85, wallet_balance:204.00,  vehicle:'Toyota Fortuner 2021', vehicle_type:'premium', phone:'+923335554321' },
  { driver_id:4, user_id:8, full_name:'Zain Ahmed',    email:'zain@example.com',  city:'Karachi',   license_number:'LIC-ZAIN-001',  verification_status:'pending',  availability:'offline', trips_completed:0,   avg_rating:0.00, wallet_balance:0,       vehicle:'Suzuki Alto 2020',   vehicle_type:'economy', phone:'+923211234567' },
  { driver_id:5, user_id:9, full_name:'Farhan Baig',   email:'farhan@example.com',city:'Lahore',    license_number:'LIC-FARHAN-001',verification_status:'verified', availability:'online',  trips_completed:311, avg_rating:4.60, wallet_balance:5620.00, vehicle:'Yamaha YBR125 2022', vehicle_type:'bike',    phone:'+923451234567' },
  { driver_id:6, user_id:10,full_name:'Kamran Iqbal',  email:'kamran@example.com',city:'Islamabad', license_number:'LIC-KAMRAN-001',verification_status:'rejected', availability:'offline', trips_completed:0,   avg_rating:0.00, wallet_balance:0,       vehicle:'Suzuki Mehran 2019', vehicle_type:'economy', phone:'+923001111222' },
];

export const mockRiders: Rider[] = [
  { rider_id:1, user_id:3, full_name:'Sara Khan',   email:'sara@example.com',  avg_rating:4.00, account_status:'active',    total_rides:23, total_spent:8340.50, cancelled_rides:1, registered_at:'2026-01-15T08:00:00Z', phone:'+923001234567' },
  { rider_id:2, user_id:4, full_name:'Hamza Malik', email:'hamza@example.com', avg_rating:5.00, account_status:'active',    total_rides:14, total_spent:3570.00, cancelled_rides:0, registered_at:'2026-02-01T10:00:00Z', phone:'+923001234568' },
  { rider_id:3, user_id:11,full_name:'Ayesha Noor', email:'ayesha@example.com',avg_rating:2.80, account_status:'suspended', total_rides:7,  total_spent:2100.00, cancelled_rides:4, registered_at:'2026-03-10T12:00:00Z', phone:'+923009988776' },
  { rider_id:4, user_id:12,full_name:'Omar Siddiq', email:'omar@example.com',  avg_rating:4.50, account_status:'active',    total_rides:41, total_spent:14200.00,cancelled_rides:2, registered_at:'2025-11-20T09:00:00Z', phone:'+923451239876' },
  { rider_id:5, user_id:13,full_name:'Fatima Zahra',email:'fatima@example.com',avg_rating:3.90, account_status:'active',    total_rides:8,  total_spent:2880.00, cancelled_rides:1, registered_at:'2026-04-01T11:00:00Z', phone:'+923331122334' },
];

export const mockRides: Ride[] = [
  { ride_id:1, rider_name:'Sara Khan',   driver_name:'Ali Raza',    vehicle:'Toyota Corolla', pickup_address:'F-7 Markaz, Islamabad',  dropoff_address:'Blue Area, Islamabad',    status:'completed',  distance_km:8.5,  duration_min:22, final_fare:483.97, surge_multiplier:1.5, surge_type:'time_based',  started_at:'2026-04-26T09:00:00Z', completed_at:'2026-04-26T09:22:00Z', payment_method:'wallet', payment_status:'paid' },
  { ride_id:2, rider_name:'Hamza Malik', driver_name:'Usman Tariq', vehicle:'Toyota Fortuner',pickup_address:'G-9 Markaz, Islamabad', dropoff_address:'Jinnah Super, Islamabad', status:'completed',  distance_km:5.2,  duration_min:15, final_fare:255.00, surge_multiplier:1.0, surge_type:'none',        started_at:'2026-04-27T10:05:00Z', completed_at:'2026-04-27T10:20:00Z', payment_method:'cash',   payment_status:'paid' },
  { ride_id:3, rider_name:'Sara Khan',   driver_name:'Ali Raza',    vehicle:'Toyota Corolla', pickup_address:'E-11, Islamabad',         dropoff_address:'DHA Phase 2, Islamabad',  status:'in_progress',distance_km:0,    duration_min:0,  final_fare:0,      surge_multiplier:1.0, surge_type:'none',        started_at:'2026-05-08T14:10:00Z', payment_method:'wallet', payment_status:'pending' },
  { ride_id:4, rider_name:'Omar Siddiq', driver_name:'Bilal Sheikh', vehicle:'Honda CB150',   pickup_address:'Gulberg III, Lahore',     dropoff_address:'Liberty Market, Lahore',  status:'enroute',   distance_km:0,    duration_min:0,  final_fare:0,      surge_multiplier:1.4, surge_type:'time_based',  started_at:'2026-05-08T14:30:00Z', payment_method:'card',   payment_status:'pending' },
  { ride_id:5, rider_name:'Fatima Zahra',driver_name:'Farhan Baig',  vehicle:'Yamaha YBR125', pickup_address:'DHA Phase 5, Lahore',     dropoff_address:'Johar Town, Lahore',      status:'accepted',  distance_km:0,    duration_min:0,  final_fare:0,      surge_multiplier:1.0, surge_type:'none',        started_at:'2026-05-08T14:42:00Z', payment_method:'wallet', payment_status:'pending' },
  { ride_id:6, rider_name:'Ayesha Noor', driver_name:'Ali Raza',    vehicle:'Toyota Corolla', pickup_address:'F-10, Islamabad',         dropoff_address:'I-8 Markaz, Islamabad',   status:'cancelled',  distance_km:0,    duration_min:0,  final_fare:0,      surge_multiplier:1.0, surge_type:'none',        started_at:'2026-04-25T17:00:00Z', payment_method:'cash',   payment_status:'pending' },
];

export const mockPayments: Payment[] = [
  { payment_id:1, ride_id:1, rider_name:'Sara Khan',   amount:483.97, payment_method:'wallet', payment_status:'paid',    promo_code:'WELCOME10', promo_discount:53.78, transaction_date:'2026-04-26T09:22:00Z' },
  { payment_id:2, ride_id:2, rider_name:'Hamza Malik', amount:255.00, payment_method:'cash',   payment_status:'paid',    promo_code:undefined,   promo_discount:0,     transaction_date:'2026-04-27T10:20:00Z' },
  { payment_id:3, ride_id:7, rider_name:'Omar Siddiq', amount:620.50, payment_method:'card',   payment_status:'paid',    promo_code:'FLAT50',    promo_discount:50,    transaction_date:'2026-05-01T12:10:00Z' },
  { payment_id:4, ride_id:8, rider_name:'Sara Khan',   amount:180.00, payment_method:'wallet', payment_status:'refunded',promo_code:undefined,   promo_discount:0,     transaction_date:'2026-05-03T08:45:00Z' },
  { payment_id:5, ride_id:9, rider_name:'Fatima Zahra',amount:95.00,  payment_method:'card',   payment_status:'failed',  promo_code:undefined,   promo_discount:0,     transaction_date:'2026-05-05T16:30:00Z' },
];

export const mockRatings: Rating[] = [
  { rating_id:1, ride_id:1, rated_by:'rider',  rater_name:'Sara Khan',   ratee_name:'Ali Raza',    score:5, comment:'Very smooth ride, on time!',       rated_at:'2026-04-26T09:25:00Z' },
  { rating_id:2, ride_id:1, rated_by:'driver', rater_name:'Ali Raza',    ratee_name:'Sara Khan',   score:4, comment:'Polite passenger, no issues.',     rated_at:'2026-04-26T09:26:00Z' },
  { rating_id:3, ride_id:2, rated_by:'rider',  rater_name:'Hamza Malik', ratee_name:'Usman Tariq', score:4, comment:'Good drive, a bit slow.',          rated_at:'2026-04-27T10:25:00Z' },
  { rating_id:4, ride_id:2, rated_by:'driver', rater_name:'Usman Tariq', ratee_name:'Hamza Malik', score:5, comment:'Great rider, very respectful.',    rated_at:'2026-04-27T10:26:00Z' },
  { rating_id:5, ride_id:7, rated_by:'rider',  rater_name:'Omar Siddiq', ratee_name:'Farhan Baig', score:5, comment:'Excellent service!',              rated_at:'2026-05-01T12:20:00Z' },
  { rating_id:6, ride_id:8, rated_by:'driver', rater_name:'Ali Raza',    ratee_name:'Sara Khan',   score:3, comment:'Kept changing the drop-off.',     rated_at:'2026-05-03T08:50:00Z' },
];

export const mockPayouts: PayoutRequest[] = [
  { payout_id:1, driver_name:'Ali Raza',    driver_id:1, requested_amount:300.00, status:'pending',  requested_at:'2026-05-07T10:00:00Z', wallet_balance:387.18 },
  { payout_id:2, driver_name:'Farhan Baig', driver_id:5, requested_amount:2000.00,status:'approved', requested_at:'2026-05-06T09:00:00Z', wallet_balance:5620.00 },
  { payout_id:3, driver_name:'Usman Tariq', driver_id:3, requested_amount:150.00, status:'paid',     requested_at:'2026-05-01T08:00:00Z', wallet_balance:54.00 },
];

export const revenueData = [
  { date:'Apr 22', revenue:1240, rides:8  },
  { date:'Apr 23', revenue:980,  rides:6  },
  { date:'Apr 24', revenue:1560, rides:11 },
  { date:'Apr 25', revenue:890,  rides:5  },
  { date:'Apr 26', revenue:1830, rides:14 },
  { date:'Apr 27', revenue:2100, rides:16 },
  { date:'Apr 28', revenue:1450, rides:10 },
  { date:'Apr 29', revenue:1690, rides:13 },
  { date:'Apr 30', revenue:2340, rides:18 },
  { date:'May 01', revenue:2780, rides:21 },
  { date:'May 02', revenue:1920, rides:15 },
  { date:'May 03', revenue:2560, rides:20 },
  { date:'May 04', revenue:3100, rides:24 },
  { date:'May 05', revenue:2870, rides:22 },
  { date:'May 06', revenue:3450, rides:27 },
  { date:'May 07', revenue:2980, rides:23 },
  { date:'May 08', revenue:1240, rides:9  },
];

export const paymentMethodData = [
  { name:'Cash',   value:42, color:'#8A8780' },
  { name:'Wallet', value:38, color:'#C4A96D' },
  { name:'Card',   value:20, color:'#6A9FD4' },
];
