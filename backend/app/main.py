import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.logging import logger
from app.database.init_db import init_db

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.datasets import router as datasets_router
from app.api.chat import router as chat_router
from app.api.analysis import router as analysis_router
from app.api.reports import router as reports_router
from app.api.dashboard import router as dashboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure directories & database tables exist
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    os.makedirs(settings.REPORTS_DIR, exist_ok=True)
    try:
        init_db()
        logger.info("Application initialized successfully with database & demo seed.")
    except Exception as e:
        logger.error(f"Error during database startup initialization: {e}")
    yield
    # Shutdown
    logger.info("Application shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise-grade AI-powered Data Analyst Web Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler to prevent leaking internal stack traces to users
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred. Our engineering team has logged this issue."}
    )

# Mount API routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(datasets_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(analysis_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "llm_provider": settings.LLM_PROVIDER,
        "openai_configured": bool(settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY.strip()) > 5)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
