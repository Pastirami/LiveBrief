import json
import re
from typing import Any

import httpx

from app.core.config import Settings
from app.schemas.analysis import EventClaim, SourceDocument
from app.utils.text import first_sentence_containing, first_time, stable_id


class AIExtractionError(RuntimeError):
    pass


class AIEventExtractor:
    def __init__(self, settings: Settings) -> None:
        if not settings.openai_api_key:
            raise AIExtractionError("OPENAI_API_KEY is missing.")
        self.api_key = settings.openai_api_key
        self.model = settings.default_model

    def extract(self, sources: list[SourceDocument]) -> list[EventClaim]:
        claims: list[EventClaim] = []
        for source in sources:
            claims.extend(self._extract_source(source))
        if not claims:
            raise AIExtractionError("AI extraction returned no claims.")
        return claims

    def _extract_source(self, source: SourceDocument) -> list[EventClaim]:
        response = httpx.post(
            "https://api.openai.com/v1/responses",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.model,
                "input": self._prompt(source),
                "max_output_tokens": 1400,
            },
            timeout=45,
        )
        if response.status_code >= 400:
            try:
                message = response.json().get("error", {}).get("message")
            except Exception:
                message = response.text
            raise AIExtractionError(f"OpenAI extraction failed: {message}")

        payload = response.json()
        raw_text = self._response_text(payload)
        parsed = self._parse_json(raw_text)
        claims: list[EventClaim] = []
        for item in parsed.get("claims", []):
            claim = self._to_claim(source, item)
            if claim is not None:
                claims.append(claim)
        return claims

    def _prompt(self, source: SourceDocument) -> str:
        return f"""
You are extracting structured claims for a journalism verification tool.
Return ONLY valid JSON with this exact shape:
{{
  "claims": [
    {{
      "group_key": "incident",
      "group_label": "short human label",
      "field": "Incident|Injured|Time|Location|Cause|Verification|Other",
      "value": "concise normalized value",
      "claim": "one sentence claim",
      "evidence": "short quote or close paraphrase from the article",
      "time": "HH:MM or null",
      "location": "place or null",
      "subject": "person/org/source making or involved in the claim",
      "action": "short verb phrase",
      "numbers": {{"injured": 8}},
      "confidence": 0-100,
      "risk": "low|medium|high|critical"
    }}
  ]
}}

Rules:
- group_key must be exactly one of: incident, casualty_count, event_time, location, cause, verification_status, other.
- Do not decide what is true.
- Extract only claims supported by the source text.
- Include casualty numbers, times, locations, official confirmation status, and causes when present.
- Create verification_status only when the article explicitly says unverified, not verified, not confirmed, or pending confirmation.
- Keep evidence short and source-grounded.

Source name: {source.name}
Source type: {source.source_type}
URL: {source.url or "none"}
Text:
{source.text[:8000]}
""".strip()

    def _response_text(self, payload: dict[str, Any]) -> str:
        chunks: list[str] = []
        for item in payload.get("output", []):
            for part in item.get("content", []):
                if part.get("type") in {"output_text", "text"}:
                    chunks.append(part.get("text", ""))
        return "".join(chunks).strip()

    def _parse_json(self, text: str) -> dict[str, Any]:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, flags=re.DOTALL)
            if match:
                return json.loads(match.group(0))
            raise AIExtractionError("AI response was not valid JSON.")

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
        numbers = item.get("numbers") if isinstance(item.get("numbers"), dict) else {}
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
            status="confirmed" if group_key in {"incident", "verification_status"} else "to_verify",
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
