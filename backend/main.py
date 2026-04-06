import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from database import engine, Base
from tasks.scheduler import start_scheduler, stop_scheduler
from routers import clothing, outfits, budget, deals, analytics, style_suggestions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Smart Wardrobe API...")

    # Create DB tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ready")

    # Ensure upload directories exist
    for sub in ("originals", "thumbnails"):
        os.makedirs(os.path.join(settings.UPLOAD_DIR, sub), exist_ok=True)

    # Start the deals scheduler
    start_scheduler()

    yield

    # Shutdown
    stop_scheduler()
    logger.info("Smart Wardrobe API shut down")


app = FastAPI(
    title="Smart Wardrobe API",
    description="Backend for the Smart Wardrobe app — clothing management, AI outfit suggestions, budget tracking, and sale deals.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images as static files
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register all routers
app.include_router(clothing.router)
app.include_router(outfits.router)
app.include_router(budget.router)
app.include_router(deals.router)
app.include_router(analytics.router)
app.include_router(style_suggestions.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Smart Wardrobe API"}
