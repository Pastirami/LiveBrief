import re
from typing import Any

from app.core.config import Settings
from app.schemas.analysis import EventClaim, SourceDocument
from app.services.openai_client import OpenAIResponsesClient, OpenAIServiceError
from app.utils.text import first_sentence_containing, first_time, stable_id


class AIExtractionError(OpenAIServiceError):
    pass


class AIEventExtractor:
    def __init__(self, settings: Settings) -> None:
        try:
            self.client = OpenAIResponsesClient(settings)
        except OpenAIServiceError as exc:
            raise AIExtractionError(str(exc)) from exc

    def extract(self, sources: list[SourceDocument]) -> list[EventClaim]:
        claims: list[EventClaim] = []
        for source in sources:
            claims.extend(self._extract_source(source))
        if not claims:
            raise AIExtractionError("AI extraction returned no claims.")
        return claims

    def _extract_source(self, source: SourceDocument) -> list[EventClaim]:
        try:
            parsed = self.client.create_structured_response(
                instructions=(
                    "You extract source-grounded factual claims for journalists. "
                    "Never decide truth, merge sources, or add facts absent from the article."
                ),
                input_text=self._prompt(source),
                schema_name="livebrief_claims",
                schema=self._schema(),
                max_output_tokens=1800,
            )
        except OpenAIServiceError as exc:
            raise AIExtractionError(str(exc)) from exc
        claims: list[EventClaim] = []
        for item in parsed.get("claims", []):
            claim = self._to_claim(source, item)
            if claim is not None:
                claims.append(claim)
        return claims

    def _prompt(self, source: SourceDocument) -> str:
        return f"""
Rules:
- group_key must be exactly one of: incident, casualty_count, event_time, location, cause, verification_status, other.
- Do not decide what is true.
- Extract only claims supported by the source text.
- Include casualty numbers, times, locations, official confirmation status, and causes when present.
- Create verification_status only when the article explicitly says unverified, not verified, not confirmed, or pending confirmation.
- evidence must be a short exact excerpt from the supplied source whenever possible.
- confidence measures extraction confidence, not whether the claim is true.
- time must be an HH:MM value found in the source, or null. Do not emit dates or ISO timestamps.
- numbers must contain injured, killed, missing, arrested, displaced, and amount;
  use null for every numeric category not present in the source.

Source name: {source.name}
Source type: {source.source_type}
URL: {source.url or "none"}
Text:
{source.text[:12000]}
""".strip()

    def _schema(self) -> dict[str, Any]:
        nullable_string = {"type": ["string", "null"]}
        return {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "claims": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "group_key": {
                                "type": "string",
                                "enum": [
                                    "incident",
                                    "casualty_count",
                                    "event_time",
                                    "location",
                                    "cause",
                                    "verification_status",
                                    "other",
                                ],
                            },
                            "group_label": {"type": "string"},
                            "field": {"type": "string"},
                            "value": {"type": "string"},
                            "claim": {"type": "string"},
                            "evidence": {"type": "string"},
                            "time": nullable_string,
                            "location": nullable_string,
                            "subject": nullable_string,
                            "action": nullable_string,
                            "numbers": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "injured": {"type": ["number", "null"]},
                                    "killed": {"type": ["number", "null"]},
                                    "missing": {"type": ["number", "null"]},
                                    "arrested": {"type": ["number", "null"]},
                                    "displaced": {"type": ["number", "null"]},
                                    "amount": {"type": ["number", "null"]},
                                },
                                "required": [
                                    "injured",
                                    "killed",
                                    "missing",
                                    "arrested",
                                    "displaced",
                                    "amount",
                                ],
                            },
                            "confidence": {"type": "integer", "minimum": 0, "maximum": 100},
                            "risk": {
                                "type": "string",
                                "enum": ["low", "medium", "high", "critical"],
                            },
                        },
                        "required": [
                            "group_key",
                            "group_label",
                            "field",
                            "value",
                            "claim",
                            "evidence",
                            "time",
                            "location",
                            "subject",
                            "action",
                            "numbers",
                            "confidence",
                            "risk",
                        ],
                    },
                }
            },
            "required": ["claims"],
        }

    def _to_claim(self, source: SourceDocument, item: dict[str, Any]) -> EventClaim | None:
        field = str(item.get("field") or "Other")
        value = str(item.get("value") or item.get("claim") or "Unspecified claim")
        claim = str(item.get("claim") or value)
        evidence = str(item.get("evidence") or first_sentence_containing(source.text, [value.lower()]))
        group_key = self._normalize_group_key(item, field, value)
        if group_key == "verification_status" and not any(
            token in source.text.lower()
            for token in ["unverified", "not verified", "not yet verified", "not confirmed", "pending confirmation"]
        ):
            return None
        time_value = item.get("time") or first_time(evidence)
        raw_numbers = item.get("numbers") if isinstance(item.get("numbers"), dict) else {}
        numbers = {
            str(key): value
            for key, value in raw_numbers.items()
            if isinstance(value, (int, float)) and not isinstance(value, bool)
        }
        risk = item.get("risk") if item.get("risk") in {"low", "medium", "high", "critical"} else "medium"
        confidence = item.get("confidence")
        if not isinstance(confidence, int):
            confidence = 75

        return EventClaim(
            id=stable_id(source.id, group_key, field, value, evidence),
            group_key=group_key,
            group_label=str(item.get("group_label") or group_key.replace("_", " ").title()),
            source_id=source.id,
            source_name=source.name,
            field=field,
            value=value,
            claim=claim,
            evidence=evidence,
            time=time_value,
            location=item.get("location"),
            subject=item.get("subject") or source.name,
            action=item.get("action"),
            numbers=numbers,
            confidence=max(0, min(100, confidence)),
            status="to_verify",
            risk=risk,
        )

    def _normalize_group_key(
        self,
        item: dict[str, Any],
        field: str,
        value: str,
    ) -> str:
        allowed = {
            "incident",
            "casualty_count",
            "event_time",
            "location",
            "cause",
            "verification_status",
            "other",
        }
        raw = str(item.get("group_key") or "").strip().lower()
        if raw in allowed:
            return raw

        combined = f"{field} {value} {item.get('claim', '')}".lower()
        numbers = item.get("numbers") if isinstance(item.get("numbers"), dict) else {}
        if "injured" in numbers or any(token in combined for token in ["injur", "casualt", "killed", "dead"]):
            return "casualty_count"
        if field.lower() == "time" or re.search(r"\b\d{1,2}:\d{2}\b", combined):
            return "event_time"
        if any(token in combined for token in ["unverified", "not verified", "not confirmed", "pending"]):
            return "verification_status"
        if field.lower() == "location":
            return "location"
        if field.lower() == "cause":
            return "cause"
        if any(token in combined for token in ["explosion", "blast", "attack", "fire", "earthquake"]):
            return "incident"
        return "other"
