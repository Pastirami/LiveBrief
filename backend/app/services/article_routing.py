import math
import re

from app.core.config import Settings, get_settings
from app.schemas.article import (
    ArticlePreviewResponse,
    ArticleRouteResponse,
    DeckRouteCandidate,
)
from app.services.local_embeddings import LocalEmbeddingError, LocalSentenceEmbeddingModel


class ArticleDeckRouter:
    """Routes one article card into an existing story deck or a new deck.

    The public API stays stable while the matching strategy uses a local
    open-source embedding model first and deterministic keyword overlap as
    the offline fallback.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._embedding_model = LocalSentenceEmbeddingModel(self.settings.router_embedding_model)

    def route(
        self,
        article: ArticlePreviewResponse,
        decks: list[DeckRouteCandidate],
    ) -> ArticleRouteResponse:
        if not decks:
            return self._new_deck(article, "No existing decks are on the board.")

        try:
            return self._route_with_local_embeddings(article, decks)
        except LocalEmbeddingError:
            pass

        return self._route_with_overlap(article, decks)

    def _route_with_local_embeddings(
        self,
        article: ArticlePreviewResponse,
        decks: list[DeckRouteCandidate],
    ) -> ArticleRouteResponse:
        article_text = self._article_embedding_text(article)
        deck_texts = [self._deck_embedding_text(deck) for deck in decks]
        vectors = self._embedding_model.encode([article_text, *deck_texts])
        if len(vectors) != len(decks) + 1:
            raise LocalEmbeddingError("Local embedding model returned an unexpected vector count.")

        article_vector = vectors[0]
        scored = [
            (self._cosine(article_vector, deck_vector), deck)
            for deck, deck_vector in zip(decks, vectors[1:], strict=True)
        ]
        score, deck = max(scored, key=lambda item: item[0])
        confidence = max(0, min(100, round(score * 100)))
        if score < self.settings.router_embedding_threshold:
            return self._new_deck(
                article,
                (
                    f"Local embedding match was below threshold "
                    f"({score:.2f} < {self.settings.router_embedding_threshold:.2f})."
                ),
                confidence=confidence,
            )
        return ArticleRouteResponse(
            target_case_id=deck.case_id,
            topic=deck.topic,
            confidence=confidence,
            reason=(
                f"Matched by local open-source embeddings "
                f"({self.settings.router_embedding_model}, cosine {score:.2f})."
            ),
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
            reason="Matched by local keyword overlap; local embedding routing was unavailable.",
        )

    def _new_deck(
        self,
        article: ArticlePreviewResponse,
        reason: str,
        confidence: int = 100,
    ) -> ArticleRouteResponse:
        topic = article.title or article.source_name or "Untitled report"
        return ArticleRouteResponse(
            target_case_id=None,
            topic=topic[:240],
            confidence=max(0, min(100, confidence)),
            reason=reason,
        )

    def _article_embedding_text(self, article: ArticlePreviewResponse) -> str:
        return self._compact_text(
            " ".join(
                [
                    article.title,
                    article.source_name,
                    article.excerpt,
                    article.text[:2400],
                ]
            )
        )

    def _deck_embedding_text(self, deck: DeckRouteCandidate) -> str:
        return self._compact_text(
            " ".join(
                [
                    deck.topic,
                    " ".join(deck.source_names[:8]),
                    " ".join(deck.excerpts[:6]),
                ]
            )
        )

    def _compact_text(self, text: str) -> str:
        return re.sub(r"\s+", " ", text).strip()[:3600]

    def _cosine(self, a: list[float], b: list[float]) -> float:
        if len(a) != len(b) or not a:
            raise LocalEmbeddingError("Embedding vectors are incompatible.")
        dot = sum(x * y for x, y in zip(a, b, strict=True))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(y * y for y in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

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
