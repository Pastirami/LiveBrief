from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator, model_validator


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
        if value is None:
            return None
        value = value.strip()
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("URL must be a public http:// or https:// address.")
        if parsed.username or parsed.password:
            raise ValueError("URLs containing credentials are not supported.")
        return value

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
