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
from app.modules.volunteers.router import router as volunteers_router, singular_router as singular_volunteers_router
from app.modules.capacity_building.router import router as capacity_building_router
from app.modules.attachments.router import router as attachments_router

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Self-healing startup checks: ensures tables/views/columns expected by the API exist."""
    from app.database.session import engine
    try:
        with engine.begin() as conn:
            # 1. Ensure department_name exists in volunteer_registration
            conn.execute(text("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'volunteer_registration'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_schema = 'public' AND table_name = 'volunteer_registration' AND column_name = 'department_name'
                    ) THEN
                        ALTER TABLE public.volunteer_registration ADD COLUMN department_name VARCHAR(150);
                        
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_schema = 'public' AND table_name = 'volunteer_registration' AND column_name = 'cohv_type'
                        ) THEN
                            UPDATE public.volunteer_registration SET department_name = cohv_type::text WHERE department_name IS NULL;
                        ELSIF EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_schema = 'public' AND table_name = 'volunteer_registration' AND column_name = 'department_id'
                        ) THEN
                            UPDATE public.volunteer_registration v
                            SET department_name = dm.department_name
                            FROM public.department_master dm
                            WHERE v.department_id = dm.department_id AND v.department_name IS NULL;
                        END IF;
                    END IF;
                END $$;
            """))

            # 2. Ensure profession_master view exists if only Designation_master exists
            conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profession_master'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'profession_master'
                    ) AND EXISTS (
                        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Designation_master'
                    ) THEN
                        CREATE OR REPLACE VIEW public.profession_master AS SELECT * FROM public."Designation_master";
                    END IF;
                END $$;
            """))

            # 3. Ensure sector_master has 'human' and migrate from legacy 'public' if needed
            conn.execute(text("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sector_master'
                    ) THEN
                        IF EXISTS (SELECT 1 FROM public.sector_master WHERE sector_code = 'public') 
                           AND NOT EXISTS (SELECT 1 FROM public.sector_master WHERE sector_code = 'human') THEN
                            INSERT INTO public.sector_master (
                                sector_code, sector_name, section_code, population_label,
                                accent_color, sort_order
                            )
                            SELECT
                                'human', 'Public Health', section_code, population_label,
                                accent_color, sort_order
                            FROM public.sector_master
                            WHERE sector_code = 'public';

                            UPDATE public.population_type_master
                               SET sector_code = 'human'
                             WHERE sector_code = 'public';

                            DELETE FROM public.sector_master
                             WHERE sector_code = 'public';
                        END IF;

                        INSERT INTO public.sector_master (sector_code, sector_name, section_code, population_label, accent_color, sort_order)
                        VALUES 
                            ('human',       'Human Health',  'C1', 'Human Population',     '#5B8BB8', 1),
                            ('animal',      'Animal Health', 'C2', 'Livestock Population', '#8B7EC4', 2),
                            ('wildlife',    'Wildlife',      'C3', 'Wildlife Population',  '#7FA88C', 3),
                            ('environment', 'Environmental', 'C4', 'Population Exposed',   '#D18F6F', 4)
                        ON CONFLICT (sector_code) DO NOTHING;
                    END IF;
                END $$;
            """))
    except Exception as exc:
        logger.warning("Could not execute db compatibility startup checks: %s", exc)
    
    yield

app = FastAPI(
    title="OneHealth Volunteer API",
    description="Secure volunteer registration and authentication APIs",
    version="1.0.0",
    lifespan=lifespan,
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
app.include_router(singular_volunteers_router)
app.include_router(events_router)
app.include_router(referrals_router)
app.include_router(awareness_router)
app.include_router(sample_support_router)
app.include_router(success_stories_router)
app.include_router(capacity_building_router)
app.include_router(attachments_router)

settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/api/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="api_uploads")
