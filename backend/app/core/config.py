from functools import lru_cache
from os import getenv

from dotenv import load_dotenv


load_dotenv()


class Settings:
    app_name: str = getenv("APP_NAME", "LiveBrief API")
    app_env: str = getenv("APP_ENV", "development")
    api_prefix: str = getenv("API_PREFIX", "/api/v1")
    default_model: str = getenv("DEFAULT_MODEL", "gpt-4.1-mini")
    openai_api_key: str | None = getenv("OPENAI_API_KEY")
    extractor_mode: str = getenv("EXTRACTOR_MODE", "ai").lower()
    cors_origins: list[str] = [
        origin.strip()
        for origin in getenv(
            "CORS_ORIGINS",
            "http://localhost:5174,http://127.0.0.1:5174",
        ).split(",")
        if origin.strip()
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
