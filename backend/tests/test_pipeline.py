from app.data.sample_case import get_sample_case
from app.services.analysis_pipeline import AnalysisPipeline
from app.services.brief_generator import BriefGenerator


def test_pipeline_detects_conflicts_and_groups_claims():
    result = AnalysisPipeline(extractor_mode="rule").analyze(get_sample_case())

    assert result.topic == "Explosion reported near Central Station"
    assert len(result.sources) == 3
    assert len(result.claims) >= 6
    assert any(group.id == "casualty_count" for group in result.groups)
    assert any(alert.id == "casualty-count-conflict" for alert in result.conflicts)
    assert result.timeline[0].time == "08:00"


def test_brief_generator_uses_only_approved_claims():
    result = AnalysisPipeline(extractor_mode="rule").analyze(get_sample_case())
    approved_claims = [claim for claim in result.claims if claim.status == "confirmed"]

    response = BriefGenerator().generate(result.topic, approved_claims)

    assert response.used_claim_ids
    assert "journalist-approved" in response.brief
    assert "twelve" not in response.brief.lower()
