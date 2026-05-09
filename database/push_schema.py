"""
database/push_schema.py
One-time script to push schema.sql to a local MySQL 8 server on the VM.
Run ONCE before starting the backend:
    python database/push_schema.py

Reads credentials from environment variables — never hardcoded.
On the VM, export variables in ~/.env (loaded via python-dotenv) OR
set them in /etc/environment and source them before running.

Requires: pip install mysql-connector-python python-dotenv bcrypt
"""

import os
import sys
import re
import bcrypt
import mysql.connector
from dotenv import load_dotenv

# Load .env from the repo root (one level up from database/)
_repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_repo_root, "backend", ".env"))
# Also try a .env in the database/ directory itself (for standalone use)
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ── Connection config from env ─────────────────────────────────────────────────
DB_HOST     = os.environ.get("DB_HOST", "127.0.0.1")
DB_PORT     = int(os.environ.get("DB_PORT", 3306))
DB_USER     = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_NAME     = os.environ.get("DB_NAME", "rideflow")
DB_CA       = os.environ.get("DB_CA", "")          # Empty = no SSL (local MySQL)

# ── Admin seed from env ────────────────────────────────────────────────────────
ADMIN_EMAIL    = os.environ.get("ADMIN_USERNAME", "admin@rideflow.pk")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
ADMIN_NAME     = "Super Admin"


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_connection(database=None):
    """Open a raw (non-pooled) connection; caller must close()."""
    kwargs = dict(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        connection_timeout=30,
        autocommit=False,
    )
    if database:
        kwargs["database"] = database
    if DB_CA:
        kwargs["ssl_ca"] = DB_CA
        kwargs["ssl_verify_cert"] = True
    return mysql.connector.connect(**kwargs)


def _split_statements(sql: str) -> list[str]:
    """
    Split a SQL file that may contain DELIMITER changes into a list of
    individual statements (without the trailing delimiter).

    Handles:
      • DELIMITER ;  (standard)
      • DELIMITER $$  (stored procedures / triggers)
      • Line and block comments are left intact (MySQL server handles them).
    """
    statements = []
    delimiter = ";"
    current = []

    for line in sql.splitlines():
        stripped = line.strip()

        # ── DELIMITER directive ───────────────────────────────────────────────
        if re.match(r"^DELIMITER\s+", stripped, re.IGNORECASE):
            delimiter = stripped.split()[1]
            continue

        current.append(line)
        joined = "\n".join(current)

        # ── Statement complete? ───────────────────────────────────────────────
        if joined.rstrip().endswith(delimiter):
            stmt = joined.rstrip()
            # Remove trailing delimiter
            stmt = stmt[: -len(delimiter)].rstrip()
            if stmt and not re.match(r"^\s*--", stmt):
                statements.append(stmt)
            current = []

    # Flush anything left (statement without trailing delimiter at EOF)
    remainder = "\n".join(current).strip()
    if remainder and not re.match(r"^\s*--", remainder):
        statements.append(remainder)

    return statements


# ─────────────────────────────────────────────────────────────────────────────
#  Ignorable MySQL error numbers
# ─────────────────────────────────────────────────────────────────────────────
# 1007 – Can't create database; database exists
# 1050 – Table already exists
# 1304 – PROCEDURE already exists
# 1359 – Trigger already exists
# 1826 – Duplicate foreign key constraint name
# 1396 – CREATE USER failed (user already exists) — safe to ignore on re-run
IGNORABLE_ERRNOS = {1007, 1050, 1304, 1359, 1826, 1396}


# ─────────────────────────────────────────────────────────────────────────────
#  Main steps
# ─────────────────────────────────────────────────────────────────────────────

def run_schema():
    """Apply schema.sql to the MySQL server (idempotent on re-run)."""
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        sql = f.read()

    print(f"📡 Connecting to MySQL at {DB_HOST}:{DB_PORT} as '{DB_USER}' …")
    conn = get_connection()
    cursor = conn.cursor()

    print("🏗️  Parsing and executing schema.sql …")
    statements = _split_statements(sql)
    print(f"   Found {len(statements)} statements.")

    ok = skip = warn = 0
    for idx, stmt in enumerate(statements, 1):
        # Skip diagnostic statements that return result sets we don't care about
        first_word = stmt.strip().split()[0].upper() if stmt.strip() else ""
        if first_word in ("SHOW", "DESCRIBE", "DESC", "EXPLAIN", "SELECT"):
            skip += 1
            continue

        try:
            cursor.execute(stmt)
            conn.commit()
            ok += 1
        except mysql.connector.Error as e:
            if e.errno in IGNORABLE_ERRNOS:
                skip += 1          # Already exists — safe to ignore
            else:
                warn += 1
                preview = stmt.strip()[:120].replace("\n", " ")
                print(f"  ⚠  stmt #{idx}: {e.msg}")
                print(f"     SQL: {preview} …")

    cursor.close()
    conn.close()
    print(f"✅ Schema applied — {ok} executed, {skip} skipped (already exist), {warn} warnings.")


def seed_admin():
    """
    Overwrite the placeholder bcrypt hash inserted by schema.sql's SEED section
    with a real bcrypt hash derived from ADMIN_PASSWORD.
    Falls back to INSERT IGNORE if the row is missing entirely.
    """
    print(f"👤 Seeding admin user '{ADMIN_EMAIL}' with a real bcrypt hash …")
    conn = get_connection(database=DB_NAME)
    cursor = conn.cursor()

    password_hash = bcrypt.hashpw(
        ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt(rounds=12)
    ).decode("utf-8")

    # UPDATE first (schema already INSERTs admin row with placeholder hash)
    cursor.execute(
        "UPDATE `User` SET password_hash=%s WHERE email=%s AND role='admin'",
        (password_hash, ADMIN_EMAIL),
    )
    if cursor.rowcount == 0:
        # Fallback: INSERT if schema seed didn't run for some reason
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


def verify_connection():
    """Quick smoke-test before doing anything destructive."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        print(f"✅ Connected — MySQL {version}")
        return True
    except mysql.connector.Error as e:
        print(f"❌ Cannot connect to MySQL: {e}")
        print("   Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in your .env")
        return False


# ─────────────────────────────────────────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  RideFlow — Database Setup Script")
    print(f"  Host   : {DB_HOST}:{DB_PORT}")
    print(f"  DB     : {DB_NAME}")
    print(f"  User   : {DB_USER}")
    print(f"  SSL CA : {DB_CA or '(none — plain TCP)'}")
    print("=" * 60)

    try:
        if not verify_connection():
            sys.exit(1)

        run_schema()
        seed_admin()

        print()
        print("🚀 Database ready!  You can now start the backend:")
        print("   uvicorn app.main:app --host 0.0.0.0 --port 8000")

    except KeyError as e:
        print(f"\n❌ Missing environment variable: {e}")
        print("   Make sure backend/.env (or ~/.env) contains the variable.")
        sys.exit(1)
    except mysql.connector.Error as e:
        print(f"\n❌ MySQL error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        raise
