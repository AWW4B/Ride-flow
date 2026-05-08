"""
database/push_schema.py
One-time script to push schema.sql to TiDB Cloud (or any MySQL-compatible cloud DB).
Run ONCE before starting the backend: python database/push_schema.py

Reads credentials from environment variables only — never hardcoded.
Requires: pip install mysql-connector-python python-dotenv bcrypt
"""

import os, sys, bcrypt
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

# ── Connection config from env ─────────────────────────────────────────────────
DB_HOST     = os.environ["DB_HOST"]
DB_PORT     = int(os.environ.get("DB_PORT", 3306))
DB_USER     = os.environ["DB_USER"]
DB_PASSWORD = os.environ["DB_PASSWORD"]
DB_NAME     = os.environ.get("DB_NAME", "rideflow")
DB_CA       = os.environ.get("DB_CA")

# ── Admin seed from env ────────────────────────────────────────────────────────
ADMIN_EMAIL    = os.environ.get("ADMIN_USERNAME", "admin@rideflow.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
ADMIN_NAME     = "Super Admin"

def get_connection(database=None):
    kwargs = dict(
        host=DB_HOST, port=DB_PORT,
        user=DB_USER, password=DB_PASSWORD,
        connection_timeout=30,  # ← removed multi_statements=True
    )
    if database:
        kwargs["database"] = database
    if DB_CA:
        kwargs["ssl_ca"] = DB_CA
        kwargs["ssl_verify_cert"] = True
    return mysql.connector.connect(**kwargs)


def run_schema():
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        sql = f.read()

    print("📡 Connecting to database...")
    conn = get_connection()
    cursor = conn.cursor()

    print("🏗️  Running schema.sql...")
    
    delimiter = ";"
    current_statement = ""

    for line in sql.splitlines():
        stripped = line.strip()

        # Detect DELIMITER changes
        if stripped.upper().startswith("DELIMITER"):
            delimiter = stripped.split()[1]
            continue

        current_statement += line + "\n"

        # Check if current statement ends with the active delimiter
        if current_statement.strip().endswith(delimiter):
            stmt = current_statement.strip()
            # Remove trailing delimiter
            if delimiter != ";":
                stmt = stmt[: -len(delimiter)].strip()
            else:
                stmt = stmt[:-1].strip()

            if stmt and not stmt.startswith("--"):
                try:
                    cursor.execute(stmt)
                    conn.commit()
                except mysql.connector.Error as e:
                    if e.errno not in (1007, 1050, 1304, 1359, 1826):
                        print(f"  ⚠ Warning: {e}")

            current_statement = ""

    cursor.close()
    conn.close()
    print("✅ Schema applied.")


def seed_admin():
    """
    Updates the placeholder admin hash (inserted by schema.sql) with a real bcrypt hash.
    The schema seeds admin@rideflow.pk with a dummy hash — this overwrites it correctly.
    """
    print("👤 Seeding admin user with real bcrypt hash...")
    conn = get_connection(database=DB_NAME)
    cursor = conn.cursor()
    password_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()

    # Try UPDATE first (schema already INSERTs admin row with placeholder hash)
    cursor.execute(
        "UPDATE `User` SET password_hash=%s WHERE email=%s AND role='admin'",
        (password_hash, ADMIN_EMAIL),
    )
    if cursor.rowcount == 0:
        # Fallback: INSERT if schema seed didn't run
        cursor.execute(
            """INSERT IGNORE INTO `User`
               (full_name, email, password_hash, role, account_status)
               VALUES (%s, %s, %s, 'admin', 'active')""",
            (ADMIN_NAME, ADMIN_EMAIL, password_hash),
        )
    conn.commit()
    cursor.close()
    conn.close()
    print(f"✅ Admin ready — email: {ADMIN_EMAIL}")


if __name__ == "__main__":
    try:
        run_schema()
        seed_admin()
        print("\n🚀 Database ready! You can now start the backend.")
    except KeyError as e:
        print(f"\n❌ Missing environment variable: {e}")
        print("   Copy .env.example to .env and fill in your credentials.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
