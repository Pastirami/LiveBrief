from app.schemas.analysis import AnalysisResult
from app.schemas.article import AnalyzeRequest
from app.core.config import get_settings
from app.services.ai_event_extractor import AIEventExtractor
from app.services.article_ingestion import ArticleIngestionService
from app.services.brief_generator import BriefGenerator
from app.services.conflict_detector import ConflictDetector
from app.services.event_extractor import RuleBasedEventExtractor
from app.services.event_grouping import EventGroupingService
from app.utils.text import stable_id


class AnalysisPipeline:
    def __init__(self, extractor_mode: str | None = None) -> None:
        self.settings = get_settings()
        self.ingestion = ArticleIngestionService()
        self.extractor_mode = extractor_mode or self.settings.extractor_mode
        self.extractor = self._build_extractor()
        self.grouping = EventGroupingService()
        self.conflicts = ConflictDetector()
        self.briefs = BriefGenerator()

    def _build_extractor(self):
        if self.extractor_mode == "rule":
            return RuleBasedEventExtractor()
        return AIEventExtractor(self.settings)

    def analyze(self, request: AnalyzeRequest) -> AnalysisResult:
        sources = self.ingestion.ingest(request)
        claims = self.extractor.extract(sources)
        groups = self.grouping.group(claims)
        conflicts = self.conflicts.detect(groups)
        timeline = sorted(
            claims,
            key=lambda claim: (claim.time is None, claim.time or "", claim.source_name),
        )
        suggested_brief = self.briefs.generate(request.topic, claims).brief
        return AnalysisResult(
            case_id=stable_id(request.topic, str(len(sources)), "".join(source.id for source in sources)),
            topic=request.topic,
            analysis_mode="rule_based" if isinstance(self.extractor, RuleBasedEventExtractor) else "ai",
            sources=sources,
            claims=claims,
            groups=groups,
            conflicts=conflicts,
            timeline=timeline,
            suggested_brief=suggested_brief,
        )
