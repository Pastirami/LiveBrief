from functools import lru_cache
from os import getenv

from dotenv import load_dotenv


load_dotenv()


class Settings:
    app_name: str = getenv("APP_NAME", "LiveBrief API")
    app_env: str = getenv("APP_ENV", "development")
    api_prefix: str = getenv("API_PREFIX", "/api/v1")
    default_model: str = getenv("DEFAULT_MODEL", "gpt-4.1-mini")
    router_embedding_model: str = getenv(
        "ROUTER_EMBEDDING_MODEL",
        "sentence-transformers/all-MiniLM-L6-v2",
    )
    router_embedding_threshold: float = float(getenv("ROUTER_EMBEDDING_THRESHOLD", "0.52"))
    openai_api_key: str | None = getenv("OPENAI_API_KEY")
    extractor_mode: str = getenv("EXTRACTOR_MODE", "ai").lower()
    request_timeout_seconds: float = float(getenv("REQUEST_TIMEOUT_SECONDS", "45"))
    article_timeout_seconds: float = float(getenv("ARTICLE_TIMEOUT_SECONDS", "20"))
    max_articles: int = int(getenv("MAX_ARTICLES", "10"))
    max_article_chars: int = int(getenv("MAX_ARTICLE_CHARS", "50000"))
    max_download_bytes: int = int(getenv("MAX_DOWNLOAD_BYTES", "5000000"))
    cors_origins: list[str] = [
        origin.strip()
        for origin in getenv(
            "CORS_ORIGINS",
            "http://localhost:5174,http://127.0.0.1:5174",
        ).split(",")
        if origin.strip()
    ]
    cors_origin_regex: str | None = getenv(
        "CORS_ORIGIN_REGEX",
        r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):5174",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
