from fastapi.testclient import TestClient

from app.api.v1.endpoints import analysis
from app.main import app
from app.services.analysis_pipeline import AnalysisPipeline
from app.services.article_ingestion import ArticleFetchError, ArticleIngestionService


client = TestClient(app)


def test_health_reports_ai_readiness_without_exposing_key():
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert isinstance(payload["ai_configured"], bool)
    assert "api_key" not in payload


def test_analysis_endpoint_runs_complete_rule_pipeline(monkeypatch):
    monkeypatch.setattr(analysis, "pipeline", AnalysisPipeline(extractor_mode="rule"))
    response = client.post(
        "/api/v1/analysis/run",
        json={
            "topic": "City hall fire",
            "articles": [
                {
                    "source_name": "Fire service",
                    "source_type": "Official statement",
                    "text": "The fire service confirmed an explosion at 09:15. Three people were injured.",
                },
                {
                    "source_name": "Local desk",
                    "source_type": "News report",
                    "text": "A blast was reported at 09:30. Five people were injured.",
                },
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["analysis_mode"] == "rule_based"
    assert len(payload["sources"]) == 2
    assert payload["claims"]
    assert payload["conflicts"]


def test_invalid_article_url_is_rejected_by_schema():
    response = client.post(
        "/api/v1/analysis/run",
        json={
            "topic": "Unsafe input",
            "articles": [{"source_name": "Local file", "url": "file:///etc/passwd"}],
        },
    )

    assert response.status_code == 422


def test_preview_endpoint_returns_clean_article_metadata(monkeypatch):
    monkeypatch.setattr(
        analysis.pipeline.ingestion,
        "_fetch_url_document",
        lambda url: {
            "final_url": "https://example.com/story",
            "source_name": "Example News",
            "title": "Storm closes the harbour",
            "text": "Officials closed the harbour after heavy storm damage. Repairs are under way.",
        },
    )

    response = client.post(
        "/api/v1/analysis/preview",
        json={"url": "https://example.com/story"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "Storm closes the harbour"
    assert payload["source_name"] == "Example News"
    assert payload["word_count"] == 12
    assert "Officials closed" in payload["excerpt"]


def test_private_network_url_is_blocked():
    service = ArticleIngestionService()

    try:
        service._assert_public_url("http://127.0.0.1:8000/private")
    except ArticleFetchError as exc:
        assert "Private or local" in str(exc)
    else:
        raise AssertionError("Private URL should have been rejected")


def test_brief_endpoint_does_not_treat_topic_as_evidence():
    response = client.post(
        "/api/v1/analysis/brief",
        json={
            "topic": "Unverified explosion near Central Station",
            "approved_claims": [
                {
                    "id": "time-1",
                    "group_key": "event_time",
                    "group_label": "Event time",
                    "source_id": "source-1",
                    "source_name": "Source",
                    "field": "Time",
                    "value": "Aircraft descended at 21:21",
                    "claim": "Radar showed the aircraft descending at 21:21.",
                    "evidence": "radar showed it rapidly descending at 21:21",
                    "time": "21:21",
                    "confidence": 90,
                    "status": "confirmed",
                    "risk": "medium",
                }
            ],
        },
    )

    assert response.status_code == 200
    brief = response.json()["brief"]
    assert brief == "Radar showed the aircraft descending at 21:21."
    assert "explosion" not in brief.lower()
    assert "Central Station" not in brief
