from pydantic import BaseModel, Field

from app.schemas.analysis import EventClaim


class BriefRequest(BaseModel):
    topic: str = Field(..., examples=["Explosion reported near Central Station"])
    approved_claims: list[EventClaim] = Field(
        default_factory=list,
        description="Claims already validated by the journalist.",
    )
    include_unverified_context: bool = Field(
        default=True,
        description="When true, the generator may mention that unresolved claims exist without asserting them.",
    )


class BriefResponse(BaseModel):
    topic: str
    brief: str
    used_claim_ids: list[str]
    excluded_claim_ids: list[str]
    safety_notes: list[str]
