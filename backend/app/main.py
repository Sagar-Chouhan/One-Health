import logging
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.session import get_db

logger = logging.getLogger(__name__)

from app.modules.referrals.router import router as referrals_router
from app.modules.auth.router import router as auth_router
from app.modules.awareness.router import router as awareness_router
from app.modules.departments.router import router as departments_router
from app.modules.events.router import router as events_router
from app.modules.locations.router import router as locations_router
from app.modules.supervisors.router import router as supervisors_router
from app.modules.sample_support.router import router as sample_support_router
from app.modules.success_stories.router import router as success_stories_router
from app.modules.volunteers.router import router as volunteers_router, singular_router as volunteer_singular_router

app = FastAPI(
    title="OneHealth Volunteer API",
    description="Secure volunteer registration and authentication APIs",
    version="1.0.0",
)


def _make_json_safe(val):
    if hasattr(val, "filename"):
        return getattr(val, "filename", str(val))
    if isinstance(val, dict):
        return {k: _make_json_safe(v) for k, v in val.items()}
    if isinstance(val, (list, tuple, set)):
        return [_make_json_safe(v) for v in val]
    if isinstance(val, (str, int, float, bool, type(None))):
        return val
    return str(val)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    raw_errors = exc.errors()
    clean_errors = _make_json_safe(raw_errors)
    logger.warning("422 Validation Error on %s %s: %s", request.method, request.url.path, clean_errors)

    return JSONResponse(
        status_code=422,
        content={"detail": clean_errors},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 422:
        print(f"!!! 422 HTTPException on {request.method} {request.url.path}: {exc.detail}", flush=True)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

# The React web app (Vite) runs on a different origin in development, so it
# needs CORS to call these APIs. Tighten / move to env before production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8082",
        "http://127.0.0.1:8082",
  
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))

    return {
        "status": "success",
        "application": "OneHealth Volunteer API",
        "database": "connected",
    }


app.include_router(auth_router)
app.include_router(departments_router)
app.include_router(locations_router)
app.include_router(supervisors_router)
app.include_router(volunteers_router)
app.include_router(volunteer_singular_router)
app.include_router(events_router)
app.include_router(referrals_router)
app.include_router(awareness_router)
app.include_router(sample_support_router)
app.include_router(success_stories_router)

settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/api/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="api_uploads")
