import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .database.session import engine, Base, SessionLocal
from .services.employee_service import seed_database_if_empty
from .api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("mindguard.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize tables and seed database if empty
    logger.info("Initializing MindGuard AI database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_result = seed_database_if_empty(db, force=False)
        logger.info(f"Database readiness verified: {seed_result}")
    except Exception as e:
        logger.error(f"Error during startup database seeding: {e}", exc_info=True)
    finally:
        db.close()

    yield
    logger.info("MindGuard AI backend shutting down.")


app = FastAPI(
    title="MindGuard AI - Burnout & Overwork Pattern Detection Platform",
    description=(
        "MindGuard AI is an AI-powered digital wellbeing platform that identifies sustained "
        "work patterns potentially associated with overwork and declining productivity. "
        "Product Principle: We don't measure how hard an employee works. We identify when their "
        "working patterns may be becoming unhealthy."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware for local frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local hackathon development & demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing the request.",
            "detail": str(exc),
        },
    )

app.include_router(router)


@app.get("/")
def root():
    return {
        "message": "Welcome to MindGuard AI API",
        "documentation": "/docs",
        "health": "/api/health",
        "principle": "We don't measure how hard an employee works. We identify when their working patterns may be becoming unhealthy.",
    }
