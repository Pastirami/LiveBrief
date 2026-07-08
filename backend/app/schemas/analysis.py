from typing import Literal

from pydantic import BaseModel, Field


ClaimStatus = Literal["confirmed", "to_verify", "ignored", "add_to_brief"]
RiskLevel = Literal["low", "medium", "high", "critical"]


class SourceDocument(BaseModel):
    id: str
    name: str
    source_type: str = Field(default="article")
    url: str | None = None
    received_at: str | None = None
    text: str


class EventClaim(BaseModel):
    id: str
    group_key: str
    group_label: str
    source_id: str
    source_name: str
    field: str
    value: str
    claim: str
    evidence: str
    time: str | None = None
    location: str | None = None
    subject: str | None = None
    action: str | None = None
    numbers: dict[str, int | float] = Field(default_factory=dict)
    confidence: int = Field(ge=0, le=100)
    status: ClaimStatus = "to_verify"
    risk: RiskLevel = "medium"


class EventGroup(BaseModel):
    id: str
    label: str
    claims: list[EventClaim]
    status: Literal["consistent", "needs_review", "conflict"]
    summary: str


class ConflictAlert(BaseModel):
    id: str
    group_id: str
    severity: RiskLevel
    title: str
    summary: str
    conflicting_values: list[str] = Field(default_factory=list)
    recommendation: str


class AnalysisResult(BaseModel):
    case_id: str
    topic: str
    analysis_mode: Literal["ai", "rule_based"]
    sources: list[SourceDocument]
    claims: list[EventClaim]
    groups: list[EventGroup]
    conflicts: list[ConflictAlert]
    timeline: list[EventClaim]
    suggested_brief: str
