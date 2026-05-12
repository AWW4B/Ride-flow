# 🚗 RideFlow

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen.svg?style=for-the-badge)](https://ride-flow-eight.vercel.app/)
[![Database](https://img.shields.io/badge/Database-MySQL-blue.svg?style=for-the-badge&logo=mysql)]()
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=for-the-badge&logo=fastapi)]()

> A modern ride-hailing platform inspired by industry leaders such as Uber, Careem, and InDrive.

---

### 🌟 Live Demo

Experience the platform live on Vercel: **[RideFlow Live App](https://ride-flow-eight.vercel.app/)**

---

## 📖 About The Project

RideFlow connects riders who need transportation with nearby drivers willing to provide it. The platform handles the entire lifecycle of a trip from a rider requesting a ride, to driver matching, real-time trip tracking, fare calculation, payment processing, and post-trip ratings. The goal of this project is to develop a robust Database Management System (DBMS) that automates, streamlines, and secures all core operations of a ride-hailing business.

---

## ✨ Key Features & Modules

### 👥 1. User Management System
- **Roles:** Super Admin, Riders, Drivers.
- **Role-based Access Control:** Enforced using MySQL DCL commands (GRANT & REVOKE).
- **Secure Authentication:** Password hashing, status tracking (Active/Suspended/Banned).

### 🚖 2. Ride Management Module
- **Ride Request & Matching:** Location-based nearest driver matching.
- **Real-time Ride States:** Requested → Accepted → Driver En Route → In Progress → Completed → Cancelled.
- **Scheduling & History:** Advance booking and comprehensive ride archives.

### 🚘 3. Driver & Vehicle Management
- **Driver Profiles:** Verification status, availability toggles, total trips, and average ratings.
- **Vehicle Registration:** Support for multiple vehicles per driver (Economy / Premium / Bike).
- **Active Matching:** Only verified vehicles and online drivers can accept requests.

### 💳 4. Fare & Payment Management
- **Dynamic Fare Calculation:** Base Rate + (Per KM × Distance) + (Per Minute × Duration).
- **Surge Pricing & Promos:** Automated multiplier during peak hours via stored procedures.
- **Multiple Payment Methods:** Cash, Wallet, Credit/Debit Card.
- **Driver Earnings:** Commission deductions and wallet payouts.

### ⭐ 5. Ratings & Reviews
- **Mutual Rating System:** Both riders and drivers rate each other (1-5 stars) after a trip.
- **Automated Flagging:** Database triggers automatically flag driver accounts if average ratings drop below 3.5 stars.
- **Leaderboards:** Live ranking of top-rated drivers by city.

### **Awwab Ahmad**

* Roll No: **23i-0079**

#### 🌟Contributions

* Developed the core RideFlow platform architecture.
* Implemented the DBMS design for ride-hailing workflows.
* Built user management system with role-based access control.
* Developed ride request and driver matching system.
* Implemented ride lifecycle management.
* Designed driver and vehicle management modules.
* Integrated fare calculation and payment management system.
* Developed ratings and reviews functionality.
* Contributed to FastAPI backend and React frontend integration.
* Configured deployment setup using Vercel and Oracle Cloud.

---

### **Zohaib**

* Roll No: **23i-0096**

#### 🔧 Contributions & Fixes

* Fixed critical driver wallet issue by ensuring `sp_complete_ride` is called on ride completion.
* Implemented proper driver earnings insertion and wallet credit flow.
* Added manual fallback logic for `Driver_Earnings` insertion.
* Added support for dynamic payment methods (`cash`, `wallet`, `card`).
* Updated `RideRequest` model to include `payment_method`.
* Fixed payment records always being stored as `cash`.
* Fixed driver availability not resetting after ride cancellation.
* Added automatic recovery from `on_trip` state after cancellation.
* Cleared stale driver coordinates after ride completion/cancellation.
* Fixed nearest-driver matching corruption caused by stale locations.
* Removed race condition by atomically updating `status` and `started_at`.
* Registered missing rides router in `main.py`.
* Fully implemented previously incomplete `rides.py` endpoints.
* Implemented `POST /rides/estimate` endpoint.
* Added driver live location fields to rider active ride response.
* Added `GET /driver/rides/active` endpoint for active trip polling.
* Added `POST /driver/rides/{id}/complete` endpoint with real distance/duration support.
* Replaced hardcoded fare completion logic with real trip metrics.
* Added frontend API support for ride completion endpoint.
* Added frontend API methods for newly implemented ride endpoints.
* Added validation for latitude and longitude ranges in driver location updates.
* Improved cancellation handling throughout ride lifecycle automation.
* Improved ride lifecycle consistency and state synchronization across backend services.


## 🛠️ Tech Stack Highlights
* **Database:** MySQL (Cloud-hosted for high availability)
* **Backend:** Python (FastAPI)
* **Frontend:** React / Web App
* **Deployment:** Vercel (Frontend), Oracle Cloud (Backend/DB)

---
*Developed for Semester 6 Database Systems Lab Project.*