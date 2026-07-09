import json
import math
import re
from typing import Any

from app.core.config import Settings, get_settings
from app.schemas.article import (
    ArticlePreviewResponse,
    ArticleRouteResponse,
    DeckRouteCandidate,
)
from app.services.openai_client import OpenAIResponsesClient, OpenAIServiceError


class ArticleDeckRouter:
    """Routes one article card into an existing story deck or a new deck.

    This is the seam for replacing AI text comparison with embeddings later.
    Keep callers dependent on the ArticleRouteResponse contract, not the
    matching strategy.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def route(
        self,
        article: ArticlePreviewResponse,
        decks: list[DeckRouteCandidate],
    ) -> ArticleRouteResponse:
        if not decks:
            return self._new_deck(article, "No existing decks are on the board.")

        if self.settings.openai_api_key:
            try:
                routed = self._route_with_ai(article, decks)
                if routed is not None:
                    return routed
            except OpenAIServiceError:
                pass

        return self._route_with_overlap(article, decks)

    def _route_with_ai(
        self,
        article: ArticlePreviewResponse,
        decks: list[DeckRouteCandidate],
    ) -> ArticleRouteResponse | None:
        client = OpenAIResponsesClient(self.settings)
        deck_payload = [
            {
                "case_id": deck.case_id,
                "topic": deck.topic,
                "source_count": deck.source_count,
                "source_names": deck.source_names[:6],
                "excerpts": deck.excerpts[:3],
            }
            for deck in decks
        ]
        payload = client.create_structured_response(
            instructions=(
                "You route a single news article into a newsroom story deck. "
                "Choose an existing deck only when the article is about the same concrete "
                "event, claim set, company action, place-specific incident, or developing story. "
                "Do not group merely because articles share a broad category such as politics, "
                "markets, weather, crime, or technology. If uncertain, create a new deck."
            ),
            input_text=(
                "Article to route:\n"
                f"{json.dumps(self._article_payload(article), ensure_ascii=False)}\n\n"
                "Existing decks:\n"
                f"{json.dumps(deck_payload, ensure_ascii=False)}"
            ),
            schema_name="livebrief_article_route",
            schema={
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "target_case_id": {"type": ["string", "null"]},
                    "topic": {"type": "string"},
                    "confidence": {"type": "integer", "minimum": 0, "maximum": 100},
                    "reason": {"type": "string"},
                },
                "required": ["target_case_id", "topic", "confidence", "reason"],
            },
            max_output_tokens=450,
        )
        target = payload.get("target_case_id")
        valid_ids = {deck.case_id for deck in decks}
        confidence = payload.get("confidence")
        if not isinstance(confidence, int):
            confidence = 0
        if target not in valid_ids or confidence < 60:
            target = None
        topic = str(payload.get("topic") or article.title or article.source_name).strip()
        return ArticleRouteResponse(
            target_case_id=target,
            topic=topic[:240],
            confidence=max(0, min(100, confidence)),
            reason=str(payload.get("reason") or "AI routing completed."),
        )

    def _route_with_overlap(
        self,
        article: ArticlePreviewResponse,
        decks: list[DeckRouteCandidate],
    ) -> ArticleRouteResponse:
        article_tokens = self._tokens(f"{article.title} {article.excerpt}")
        best: tuple[float, DeckRouteCandidate | None] = (0.0, None)
        for deck in decks:
            deck_text = " ".join([deck.topic, *deck.source_names, *deck.excerpts])
            deck_tokens = self._tokens(deck_text)
            overlap = article_tokens & deck_tokens
            score = len(overlap) / math.sqrt(max(1, len(article_tokens)))
            if score > best[0]:
                best = (score, deck)

        score, deck = best
        if deck is None or score < 0.6:
            return self._new_deck(article, "No existing deck was similar enough.")
        return ArticleRouteResponse(
            target_case_id=deck.case_id,
            topic=deck.topic,
            confidence=min(95, int(score * 55)),
            reason="Matched by local keyword overlap; AI routing was unavailable.",
        )

    def _new_deck(self, article: ArticlePreviewResponse, reason: str) -> ArticleRouteResponse:
        topic = article.title or article.source_name or "Untitled report"
        return ArticleRouteResponse(
            target_case_id=None,
            topic=topic[:240],
            confidence=100,
            reason=reason,
        )

    def _article_payload(self, article: ArticlePreviewResponse) -> dict[str, Any]:
        return {
            "title": article.title,
            "source_name": article.source_name,
            "url": article.final_url or article.url,
            "excerpt": article.excerpt,
        }

    def _tokens(self, text: str) -> set[str]:
        stop = {
            "about",
            "after",
            "from",
            "have",
            "into",
            "over",
            "said",
            "says",
            "that",
            "the",
            "their",
            "this",
            "with",
            "would",
        }
        return {
            token
            for token in re.findall(r"[a-z0-9]{3,}", text.lower())
            if token not in stop
        }
