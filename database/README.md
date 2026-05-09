# Database Setup — RideFlow

## Prerequisites
```
pip install mysql-connector-python python-dotenv bcrypt
```

## Steps

### 1. Create your cloud database
- Sign up at [Aiven.ai](https://aiven.ai) or [TiDB Cloud](https://tidbcloud.com)
- Create a new MySQL/TiDB cluster
- Download the **CA certificate** and save it (e.g., `database/ca.pem`)

### 2. Configure environment variables
```bash
cp .env.example .env
# Then edit .env with your cloud DB credentials
```

Your `.env` must contain:
```
DB_HOST=your-host.aivencloud.com
DB_PORT=12345
DB_USER=avnadmin
DB_PASSWORD=your_password
DB_NAME=rideflow
DB_CA=database/ca.pem      # path to your CA cert
ADMIN_USERNAME=admin@rideflow.com
ADMIN_PASSWORD=admin123
JWT_SECRET=your_long_random_secret
```

### 3. Push the schema (run ONCE)
```bash
python database/push_schema.py
```

This will:
- Create the `rideflow` database
- Create all tables, views, stored procedures, triggers
- Seed fare rules and promo codes
- Insert the admin user (email/password from env vars)

### 4. Start the backend
```bash
cd backend
uvicorn app.main:app --reload
```

---

## Re-running
`push_schema.py` is safe to re-run — it uses `CREATE IF NOT EXISTS` and `INSERT IGNORE`
so it won't duplicate data.

## SQL files location
All SQL lives in `database/schema.sql`. The original split files
(`schema.sql`, `procedures.sql`, `views.sql`, `indexes.sql`, `seed.sql`)
have been consolidated into a single file for simplicity.
