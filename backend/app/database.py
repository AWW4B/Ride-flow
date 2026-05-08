# ============================================================
# app/database.py — Database Connection Pool
# ============================================================
# TODO 1: Implement MySQL connection pooling.
# Using mysql-connector-python's pooling or a connection manager.
#
# Example:
# import mysql.connector.pooling
# from app.config import settings
#
# dbconfig = {
#   "host": settings.DB_HOST,
#   "port": settings.DB_PORT,
#   "user": settings.DB_USER,
#   "password": settings.DB_PASSWORD,
#   "database": settings.DB_NAME,
# }
#
# pool = mysql.connector.pooling.MySQLConnectionPool(
#     pool_name="mypool",
#     pool_size=5,
#     **dbconfig
# )
#
# def get_db_connection():
#     return pool.get_connection()
#
# TODO 2: Create a helper function to easily call stored procedures.
# Stored procedures in MySQL are called using cursor.callproc()
# Example:
# def call_proc(proc_name: str, args: tuple):
#     conn = get_db_connection()
#     cursor = conn.cursor(dictionary=True)
#     try:
#         result_args = cursor.callproc(proc_name, args)
#         
#         # Fetch the result sets if any
#         results = []
#         for result in cursor.stored_results():
#             results.extend(result.fetchall())
#             
#         conn.commit()
#         return result_args, results
#     finally:
#         cursor.close()
#         conn.close()
