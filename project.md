● The database for the project should be MySQL and Domain can be a web app or Desktop App
(your choice).
● If you use any cloud database, you will get 5 bonus marks.
Project Title : RideFlow
RideFlow is a ride-hailing platform inspired by industry leaders such as Uber, Careem, and InDrive. It
connects riders who need transportation with nearby drivers willing to provide it. The platform handles
the entire lifecycle of a trip from a rider requesting a ride, to driver matching, real-time trip tracking,
fare calculation, payment processing, and post-trip ratings. Managing all of these operations manually
across thousands of daily transactions is impractical and error-prone. The goal of this project is to
develop a Database Management System (DBMS) that automates, streamlines, and secures all core
operations of a ride-hailing business.
Project Scope & Functional Modules
The system is divided into seven interconnected modules:
1. User Management System
The platform supports multiple types of users, each with different roles and access levels:
● Admin / Super Admin: Has full control over the system. Can manage users, drivers, vehicles,
pricing rules, and generate all reports.
● Riders: Register an account, request rides, make payments, and leave ratings.
● Drivers: Register with their vehicle details, accept or reject ride requests, complete trips, and
receive earnings.
● Role-based access control is enforced using DCL commands (GRANT & REVOKE) in MySQL
so that each role can only access the data and operations relevant to them.
● Each user record stores: Full Name, Email, Phone Number, Password Hash, Role, Account Status
(Active / Suspended / Banned), and Registration Date.
2. Ride Management Module

This is the core module of the system. It manages the entire trip lifecycle from request to completion.
Ride Request & Matching:
● A rider submits a ride request by entering their pickup location and drop-off destination.
● The system searches for the nearest available driver using location data.
● The driver is notified and can Accept or Reject the request.
● If rejected, the system automatically moves to the next available driver.
Ride States (tracked in the database):
● Requested → Accepted → Driver En Route → In Progress → Completed → Cancelled
Ride details stored include: Ride ID, Rider ID, Driver ID, Vehicle ID, Pickup Location, Drop-off
Location, Ride Status & Fare.
Scheduling & History:
● Riders can schedule rides in advance.
● All completed and cancelled rides are archived in a Ride History table.
3. Driver & Vehicle Management Module
Drivers are a distinct category of users with additional attributes and responsibilities.
Driver Profile includes: License Number, CNIC / National ID, Profile Photo, Verification Status
(Pending / Verified / Rejected), Availability Status (Online / Offline / On Trip), Total Trips Completed &
Average Rating.
Vehicle Registration:
● Each driver registers one or more vehicles.
● Vehicle details stored: Vehicle ID, Driver ID, Make, Model, Year, Color, License Plate, Vehicle
Type (Economy / Premium / Bike), and Verification Status.
● The system enforces that only verified vehicles can be used for active rides.
Driver Availability:
● Drivers toggle their status between Online and Offline.
● The system only matches Online drivers to incoming ride requests
4. Fare & Payment Management Module
This module handles all financial operations on the platform.
Fare Calculation:
● Base fare is calculated using: Base Rate + (Per KM Rate × Distance) + (Per Minute Rate ×
Duration).
● Surge Pricing: During peak hours or high-demand periods, a surge multiplier is applied
automatically. A stored procedure handles this calculation.
● Promo codes can be applied to reduce the final fare.

Payment Methods supported:
● Cash (paid directly to driver)
● Wallet / In-App Balance
● Credit / Debit Card
Payment records store: Payment ID, Ride ID, Rider ID, Amount, Payment Method, Payment Status
(Pending / Paid / Failed / Refunded), Transaction Date, and Promo Code Discount Applied.
Driver Earnings & Payouts:
● The platform deducts a commission percentage from every fare.
● Net earnings are credited to the driver's wallet.
● Drivers can request weekly payouts.
Financial Reports generated include:
● Total platform revenue by city and date range
● Total driver earnings and commissions
● Revenue breakdown by payment method
● Refund and dispute totals
5. Ratings & Reviews Module
After every completed ride, both the rider and the driver rate each other. This mutual rating system
ensures accountability on both sides of the platform.
Rating details stored: Rating ID, Ride ID, Rated By (Rider or Driver), Rated User ID, Score (1–5 stars),
Optional Comment, and Timestamp.
System Behavior:
● A trigger automatically flags a driver's account if their average rating falls below 3.5 stars,
notifying the admin for review.
● Riders with consistently low ratings (e.g., below 3.0) can be flagged and warned.
● Ratings feed into a live Leaderboard View showing top-rated drivers in each city.