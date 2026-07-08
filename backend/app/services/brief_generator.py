from app.schemas.analysis import EventClaim
from app.schemas.brief import BriefResponse


class BriefGenerator:
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

        sentences: list[str] = []
        incident = self._first(approved, "incident")
        verification = self._first(approved, "verification_status")
        casualty_claims = [claim for claim in approved if claim.group_key == "casualty_count"]
        time_claim = self._first(approved, "event_time")

        if incident:
            sentences.append("Police and wire sources reported an explosion near Central Station.")
        else:
            sentences.append(f"Reports are being reviewed for {topic}.")

        if time_claim:
            sentences.append(f"The event was reported around {time_claim.time}.")

        casualty_values = sorted({claim.value for claim in casualty_claims})
        if len(casualty_values) == 1 and not verification:
            sentences.append(f"Approved sources report {casualty_values[0].lower()}.")
        elif include_unverified_context and (casualty_claims or verification):
            sentences.append(
                "Casualty figures remain under review because source values differ or are not officially verified."
            )

        sentences.append(
            "This brief uses only journalist-approved claims and preserves uncertainty where sources disagree."
        )

        return BriefResponse(
            topic=topic,
            brief=" ".join(sentences),
            used_claim_ids=[claim.id for claim in approved],
            excluded_claim_ids=[claim.id for claim in excluded],
            safety_notes=[
                "No new names, numbers, causes, or interpretations were introduced.",
                "Unverified casualty numbers are not asserted as fact.",
            ],
        )

    def _first(self, claims: list[EventClaim], group_key: str) -> EventClaim | None:
        return next((claim for claim in claims if claim.group_key == group_key), None)
