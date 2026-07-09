import json

from app.core.config import Settings, get_settings
from app.schemas.analysis import EventClaim
from app.schemas.brief import BriefResponse
from app.services.openai_client import OpenAIResponsesClient, OpenAIServiceError


class BriefGenerator:
    def __init__(
        self,
        *,
        use_ai: bool = False,
        settings: Settings | None = None,
    ) -> None:
        self.use_ai = use_ai
        self.settings = settings or get_settings()

    def generate(
        self,
        topic: str,
        claims: list[EventClaim],
        include_unverified_context: bool = True,
    ) -> BriefResponse:
        approved = [
            claim
            for claim in claims
            if claim.status in {"confirmed", "add_to_brief"}
        ]
        excluded = [claim for claim in claims if claim.id not in {item.id for item in approved}]
        if not approved:
            return BriefResponse(
                topic=topic,
                brief=f"No claims have been approved for publication about {topic}.",
                used_claim_ids=[],
                excluded_claim_ids=[claim.id for claim in excluded],
                safety_notes=["No unapproved claim was included."],
            )

        if self.use_ai and self.settings.openai_api_key:
            try:
                brief, notes = self._generate_ai(topic, approved, include_unverified_context)
            except OpenAIServiceError:
                brief, notes = self._generate_deterministic(approved)
                notes.append("AI drafting was unavailable; a deterministic approved-fact brief was used.")
        else:
            brief, notes = self._generate_deterministic(approved)

        return BriefResponse(
            topic=topic,
            brief=brief,
            used_claim_ids=[claim.id for claim in approved],
            excluded_claim_ids=[claim.id for claim in excluded],
            safety_notes=notes,
        )

    def _generate_ai(
        self,
        topic: str,
        approved: list[EventClaim],
        include_unverified_context: bool,
    ) -> tuple[str, list[str]]:
        client = OpenAIResponsesClient(self.settings)
        claims = [
            {
                "id": claim.id,
                "source": claim.source_name,
                "claim": claim.claim,
                "value": claim.value,
                "evidence": claim.evidence,
                "time": claim.time,
                "location": claim.location,
            }
            for claim in approved
        ]
        payload = client.create_structured_response(
            instructions=(
                "You are a careful breaking-news copy editor. Write a concise publication-ready "
                "brief using only the approved claims supplied. Attribute claims when the source "
                "matters. Preserve uncertainty. Never invent names, numbers, causes, dates, or context."
            ),
            input_text=(
                "The topic label is intentionally omitted because it is not evidence.\n"
                f"May mention unresolved uncertainty already present in a claim: {include_unverified_context}\n"
                f"Approved claims:\n{json.dumps(claims, ensure_ascii=False)}"
            ),
            schema_name="livebrief_brief",
            schema={
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "brief": {"type": "string"},
                    "safety_notes": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": ["brief", "safety_notes"],
            },
            max_output_tokens=700,
        )
        brief = str(payload.get("brief") or "").strip()
        if not brief:
            raise OpenAIServiceError("OpenAI returned an empty brief.")
        notes = [str(note) for note in payload.get("safety_notes", []) if str(note).strip()]
        notes.append("Draft generated exclusively from journalist-approved claim IDs.")
        return brief, notes

    def _generate_deterministic(
        self,
        approved: list[EventClaim],
    ) -> tuple[str, list[str]]:
        unique: list[EventClaim] = []
        seen: set[tuple[str, str]] = set()
        for claim in approved:
            key = (claim.group_key, claim.value.casefold())
            if key not in seen:
                unique.append(claim)
                seen.add(key)

        sentences: list[str] = []
        for claim in unique:
            sentence = claim.claim.strip() or claim.value.strip()
            if sentence and sentence[-1] not in ".!?":
                sentence += "."
            if sentence:
                sentences.append(sentence)

        return (
            " ".join(sentences),
            [
                "No unapproved claim was included.",
                "Duplicate approved claims were collapsed without adding new facts.",
            ],
        )
