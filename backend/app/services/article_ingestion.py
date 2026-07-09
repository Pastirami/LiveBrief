import ipaddress
import socket
from urllib.parse import urlparse

import httpx
import trafilatura
from bs4 import BeautifulSoup

from app.core.config import Settings, get_settings
from app.schemas.analysis import SourceDocument
from app.schemas.article import AnalyzeRequest
from app.utils.text import normalize_space, stable_id


class ArticleFetchError(RuntimeError):
    pass


class ArticleIngestionService:
    """Converts request payloads into normalized source documents."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def ingest(self, request: AnalyzeRequest) -> list[SourceDocument]:
        if len(request.articles) > self.settings.max_articles:
            raise ValueError(f"A maximum of {self.settings.max_articles} articles is supported.")

        sources: list[SourceDocument] = []
        for index, article in enumerate(request.articles, start=1):
            source_id = stable_id(article.source_name, article.url or article.text or str(index))
            text = normalize_space(article.text or "")
            if not text and article.url:
                try:
                    text = self._fetch_url_text(article.url)
                except ArticleFetchError as exc:
                    raise ArticleFetchError(f"{article.source_name}: {exc}") from exc
            if not text:
                raise ValueError(f"No article text could be extracted for {article.source_name}.")
            text = text[: self.settings.max_article_chars]
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
        self._assert_public_url(url)
        try:
            with httpx.Client(
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; LiveBrief/1.0; newsroom analysis)",
                    "Accept": "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8",
                    "Accept-Language": "en-US,en;q=0.8",
                },
                follow_redirects=True,
                timeout=self.settings.article_timeout_seconds,
            ) as client:
                with client.stream("GET", url) as response:
                    response.raise_for_status()
                    self._assert_public_url(str(response.url))
                    content_type = response.headers.get("content-type", "").lower()
                    if not any(kind in content_type for kind in ("text/html", "text/plain", "application/xhtml")):
                        raise ArticleFetchError(f"Unsupported content type: {content_type or 'unknown'}.")
                    chunks: list[bytes] = []
                    size = 0
                    for chunk in response.iter_bytes():
                        size += len(chunk)
                        if size > self.settings.max_download_bytes:
                            raise ArticleFetchError("Article download exceeded the size limit.")
                        chunks.append(chunk)
                    body = b"".join(chunks).decode(response.encoding or "utf-8", errors="replace")
        except ArticleFetchError:
            raise
        except httpx.TimeoutException as exc:
            raise ArticleFetchError("The article request timed out.") from exc
        except httpx.HTTPStatusError as exc:
            raise ArticleFetchError(f"The publisher returned HTTP {exc.response.status_code}.") from exc
        except httpx.HTTPError as exc:
            raise ArticleFetchError("The article could not be downloaded.") from exc

        extracted = trafilatura.extract(
            body,
            url=url,
            include_comments=False,
            include_tables=False,
            favor_precision=True,
        )
        if not extracted:
            soup = BeautifulSoup(body, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "form"]):
                tag.decompose()
            extracted = soup.get_text(" ", strip=True)
        text = normalize_space(extracted or "")
        if len(text) < 80:
            raise ArticleFetchError(
                "No usable article body was found. Paste the article text instead."
            )
        return text

    def _assert_public_url(self, url: str) -> None:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ArticleFetchError("Only public HTTP(S) article URLs are supported.")
        try:
            addresses = {
                item[4][0]
                for item in socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM)
            }
        except socket.gaierror as exc:
            raise ArticleFetchError("The article hostname could not be resolved.") from exc
        for address in addresses:
            ip = ipaddress.ip_address(address)
            if not ip.is_global:
                raise ArticleFetchError("Private or local network addresses are not allowed.")
