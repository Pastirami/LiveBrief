from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator, model_validator


def validate_public_url_shape(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("URL must be a public http:// or https:// address.")
    if parsed.username or parsed.password:
        raise ValueError("URLs containing credentials are not supported.")
    return value


class ArticleInput(BaseModel):
    source_name: str = Field(..., min_length=1, max_length=120, examples=["Source A"])
    text: str | None = Field(
        default=None,
        max_length=100_000,
        description="Raw article text. Use this for the 48-hour MVP and reliable demos.",
    )
    url: str | None = Field(
        default=None,
        description="Optional article URL. URL fetching can be implemented by the ingestion service.",
    )
    source_type: str = Field(default="article", examples=["Official brief"])
    received_at: str | None = Field(default=None, examples=["08:04"])

    @field_validator("source_name", "source_type")
    @classmethod
    def strip_labels(cls, value: str) -> str:
        return value.strip()

    @field_validator("url")
    @classmethod
    def validate_public_url_shape(cls, value: str | None) -> str | None:
        return validate_public_url_shape(value)

    @model_validator(mode="after")
    def require_text_or_url(self):
        if self.text:
            self.text = self.text.strip()
        if not self.text and not self.url:
            raise ValueError("Either text or url is required.")
        return self


class AnalyzeRequest(BaseModel):
    topic: str = Field(
        ...,
        min_length=3,
        max_length=240,
        examples=["Explosion reported near Central Station"],
    )
    articles: list[ArticleInput] = Field(min_length=1, max_length=10)

    @field_validator("topic")
    @classmethod
    def strip_topic(cls, value: str) -> str:
        return value.strip()


class ArticlePreviewRequest(BaseModel):
    url: str = Field(..., description="Public article URL to fetch and clean before analysis.")

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        validated = validate_public_url_shape(value)
        if validated is None:
            raise ValueError("URL is required.")
        return validated


class ArticlePreviewResponse(BaseModel):
    url: str
    final_url: str
    source_name: str
    title: str
    text: str
    excerpt: str
    word_count: int


class DeckRouteCandidate(BaseModel):
    case_id: str
    topic: str
    source_count: int = 0
    source_names: list[str] = Field(default_factory=list)
    excerpts: list[str] = Field(default_factory=list)


class ArticleRouteRequest(BaseModel):
    article: ArticlePreviewResponse
    decks: list[DeckRouteCandidate] = Field(default_factory=list)


class ArticleRouteResponse(BaseModel):
    target_case_id: str | None = Field(
        default=None,
        description="Existing deck to append to. Null means create a new deck.",
    )
    topic: str
    confidence: int = Field(ge=0, le=100)
    reason: str
