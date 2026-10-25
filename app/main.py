import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.database import engine, Base
import app.models  # Ensure all models are registered

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-assisted Human Capital Management System for Admin, HR, and Employees"
)

# Enable CORS for local dev and frontend Vite server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import & Register Routers
from app.routers.setup_router import router as setup_router
from app.routers.auth_router import router as auth_router
from app.routers.org_router import router as org_router
from app.routers.employee_router import router as employee_router
from app.routers.attendance_router import router as attendance_router
from app.routers.leave_router import router as leave_router
from app.routers.payroll_router import router as payroll_router
from app.routers.analytics_router import router as analytics_router
from app.routers.ai_router import router as ai_router
from app.routers.comms_router import router as comms_router
from app.routers.audit_router import router as audit_router

app.include_router(setup_router)
app.include_router(auth_router)
app.include_router(org_router)
app.include_router(employee_router)
app.include_router(attendance_router)
app.include_router(leave_router)
app.include_router(payroll_router)
app.include_router(analytics_router)
app.include_router(ai_router)
app.include_router(comms_router)
app.include_router(audit_router)

# Mount Frontend static files if built
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes or docs
        if full_path.startswith("api") or full_path in ["docs", "openapi.json", "redoc"]:
            return None
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"app": settings.PROJECT_NAME, "status": "online"}
else:
    @app.get("/")
    def root():
        return {
            "app": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "online",
            "docs_url": "/docs"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
