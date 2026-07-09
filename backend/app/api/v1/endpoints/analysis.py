from fastapi import APIRouter, HTTPException

from app.data.sample_case import get_sample_case
from app.schemas.analysis import AnalysisResult
from app.schemas.article import (
    AnalyzeRequest,
    ArticlePreviewRequest,
    ArticlePreviewResponse,
    ArticleRouteRequest,
    ArticleRouteResponse,
)
from app.schemas.brief import BriefRequest, BriefResponse
from app.services.analysis_pipeline import AnalysisPipeline
from app.services.article_ingestion import ArticleFetchError
from app.services.article_routing import ArticleDeckRouter
from app.services.brief_generator import BriefGenerator

router = APIRouter()
pipeline = AnalysisPipeline()
article_router = ArticleDeckRouter()
# Publication copy is assembled deterministically from approved claim text.
# AI remains responsible for extraction, never for adding prose-level facts.
brief_generator = BriefGenerator(use_ai=False)


@router.get(
    "/demo",
    response_model=AnalyzeRequest,
    summary="Return a ready-to-run demo case",
)
def get_demo_case() -> AnalyzeRequest:
    return get_sample_case()


@router.post(
    "/preview",
    response_model=ArticlePreviewResponse,
    summary="Fetch and clean a public article URL before analysis",
)
def preview_article(payload: ArticlePreviewRequest) -> ArticlePreviewResponse:
    try:
        return pipeline.ingestion.preview_url(payload.url)
    except ArticleFetchError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post(
    "/route",
    response_model=ArticleRouteResponse,
    summary="Route one article into an existing story deck or a new deck",
)
def route_article(payload: ArticleRouteRequest) -> ArticleRouteResponse:
    return article_router.route(payload.article, payload.decks)


@router.post(
    "/run",
    response_model=AnalysisResult,
    summary="Analyze articles and compare source claims",
)
def run_analysis(payload: AnalyzeRequest) -> AnalysisResult:
    try:
        return pipeline.analyze(payload)
    except ArticleFetchError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post(
    "/brief",
    response_model=BriefResponse,
    summary="Generate a brief from journalist-approved claims",
)
def generate_brief(payload: BriefRequest) -> BriefResponse:
    try:
        return brief_generator.generate(
            topic=payload.topic,
            claims=payload.approved_claims,
            include_unverified_context=payload.include_unverified_context,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
