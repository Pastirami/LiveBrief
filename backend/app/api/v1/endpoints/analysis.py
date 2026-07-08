from fastapi import APIRouter, HTTPException

from app.data.sample_case import get_sample_case
from app.schemas.analysis import AnalysisResult
from app.schemas.article import AnalyzeRequest
from app.schemas.brief import BriefRequest, BriefResponse
from app.services.analysis_pipeline import AnalysisPipeline
from app.services.brief_generator import BriefGenerator

router = APIRouter()
pipeline = AnalysisPipeline()
brief_generator = BriefGenerator()


@router.get(
    "/demo",
    response_model=AnalyzeRequest,
    summary="Return a ready-to-run demo case",
)
def get_demo_case() -> AnalyzeRequest:
    return get_sample_case()


@router.post(
    "/run",
    response_model=AnalysisResult,
    summary="Analyze articles and compare source claims",
)
def run_analysis(payload: AnalyzeRequest) -> AnalysisResult:
    try:
        return pipeline.analyze(payload)
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
    return brief_generator.generate(
        topic=payload.topic,
        claims=payload.approved_claims,
        include_unverified_context=payload.include_unverified_context,
    )
