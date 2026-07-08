import httpx
import trafilatura

from app.schemas.analysis import SourceDocument
from app.schemas.article import AnalyzeRequest
from app.utils.text import normalize_space, stable_id


class ArticleIngestionService:
    """Converts request payloads into normalized source documents."""

    def ingest(self, request: AnalyzeRequest) -> list[SourceDocument]:
        sources: list[SourceDocument] = []
        for index, article in enumerate(request.articles, start=1):
            source_id = stable_id(article.source_name, article.url or article.text or str(index))
            text = normalize_space(article.text or "")
            if not text and article.url:
                text = self._fetch_url_text(article.url)
            if not text:
                raise ValueError(f"No article text could be extracted for {article.source_name}.")
            sources.append(
                SourceDocument(
                    id=source_id,
                    name=article.source_name,
                    source_type=article.source_type,
                    url=article.url,
                    received_at=article.received_at,
                    text=text,
                )
            )
        return sources

    def _fetch_url_text(self, url: str) -> str:
        response = httpx.get(
            url,
            headers={
                "User-Agent": "LiveBrief/0.1 (+https://local.dev)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            follow_redirects=True,
            timeout=20,
        )
        response.raise_for_status()
        extracted = trafilatura.extract(response.text, url=url, include_comments=False)
        return normalize_space(extracted or response.text)
