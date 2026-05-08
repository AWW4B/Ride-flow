import mysql.connector.pooling
from app.config import settings

# ── Build SSL kwargs only if a CA cert path is provided ──────────────────────
def _ssl_args():
    if settings.DB_CA:
        return {"ssl_ca": settings.DB_CA, "ssl_verify_cert": True}
    return {}

_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="rideflow",
    pool_size=10,
    host=settings.DB_HOST,
    port=settings.DB_PORT,
    user=settings.DB_USER,
    password=settings.DB_PASSWORD,
    database=settings.DB_NAME,
    **_ssl_args(),
)


def get_conn():
    """Return a connection from the pool. Caller must close() it."""
    return _pool.get_connection()


def query(sql: str, params=None) -> list[dict]:
    """Run a SELECT and return list of dicts."""
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, params or ())
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


def execute(sql: str, params=None) -> int:
    """Run INSERT/UPDATE/DELETE; return lastrowid."""
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(sql, params or ())
        conn.commit()
        return cur.lastrowid
    finally:
        cur.close()
        conn.close()


def call_proc(name: str, in_args: list) -> tuple:
    """
    Call a stored procedure.
    Returns (out_args_tuple, result_rows_list).
    MySQL stored procs return OUT params appended to the args tuple.
    """
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        result_args = cur.callproc(name, in_args)
        rows = []
        for rs in cur.stored_results():
            rows.extend(rs.fetchall())
        conn.commit()
        return result_args, rows
    finally:
        cur.close()
        conn.close()
