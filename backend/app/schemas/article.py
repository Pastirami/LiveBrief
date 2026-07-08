from pydantic import BaseModel, Field, model_validator


class ArticleInput(BaseModel):
    source_name: str = Field(..., examples=["Source A"])
    text: str | None = Field(
        default=None,
        description="Raw article text. Use this for the 48-hour MVP and reliable demos.",
    )
    url: str | None = Field(
        default=None,
        description="Optional article URL. URL fetching can be implemented by the ingestion service.",
    )
    source_type: str = Field(default="article", examples=["Official brief"])
    received_at: str | None = Field(default=None, examples=["08:04"])

    @model_validator(mode="after")
    def require_text_or_url(self):
        if not self.text and not self.url:
            raise ValueError("Either text or url is required.")
        return self


class AnalyzeRequest(BaseModel):
    topic: str = Field(..., examples=["Explosion reported near Central Station"])
    articles: list[ArticleInput] = Field(min_length=1)
