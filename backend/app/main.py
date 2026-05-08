from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ============================================================
# app/main.py — FastAPI Application Entry Point
# ============================================================
#
# TODO 1: Initialize the FastAPI app.
# app = FastAPI(title="RideFlow API", version="1.0.0")
#
# TODO 2: Configure CORS so the Next.js frontend (localhost:3000) can access the API.
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
#
# TODO 3: Import your routers and include them.
# from app.routers import auth, rides, driver, rider, admin
# 
# app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
# app.include_router(rides.router, prefix="/api/v1/rides", tags=["Rides"])
# app.include_router(driver.router, prefix="/api/v1/driver", tags=["Driver"])
# app.include_router(rider.router, prefix="/api/v1/rider", tags=["Rider"])
# app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
#
# TODO 4: Setup a simple root endpoint to check if the server is running.
# @app.get("/")
# def read_root():
#     return {"message": "Welcome to RideFlow API"}
#
# TODO 5: Implement WebSocket endpoints (equivalent to socket.io) for live tracking.
# FastAPI has built-in WebSockets.
# @app.websocket("/ws/location")
# async def websocket_endpoint(websocket: WebSocket):
#     await websocket.accept()
#     while True:
#         data = await websocket.receive_text()
#         await websocket.send_text(f"Message text was: {data}")
