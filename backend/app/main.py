from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings


tags_metadata = [
    {
        "name": "health",
        "description": "Runtime health and service metadata.",
    },
    {
        "name": "analysis",
        "description": (
            "Article ingestion, event extraction, source comparison, conflict alerts, "
            "and approved-fact brief generation."
        ),
    },
]


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        summary="Backend API for the LiveBrief newsroom verification workflow.",
        description=(
            "LiveBrief compares multiple breaking-news sources, highlights conflicting "
            "claims, and generates final copy only from journalist-approved facts."
        ),
        openapi_tags=tags_metadata,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
