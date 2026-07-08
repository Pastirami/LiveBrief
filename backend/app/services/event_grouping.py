from collections import defaultdict

from app.schemas.analysis import EventClaim, EventGroup


class EventGroupingService:
    """Groups extracted claims by claim type.

    A later version can replace this with TF-IDF/cosine or embedding grouping while
    keeping the API contract stable.
    """

    def group(self, claims: list[EventClaim]) -> list[EventGroup]:
        grouped: dict[str, list[EventClaim]] = defaultdict(list)
        for claim in claims:
            grouped[claim.group_key].append(claim)

        groups: list[EventGroup] = []
        for group_key, group_claims in grouped.items():
            values = {claim.value for claim in group_claims}
            status = "consistent"
            if len(values) > 1:
                status = "needs_review"
            if group_key in {"casualty_count", "event_time"} and len(values) > 1:
                status = "conflict"

            groups.append(
                EventGroup(
                    id=group_key,
                    label=group_claims[0].group_label,
                    claims=group_claims,
                    status=status,
                    summary=self._summary(group_claims, status),
                )
            )
        return groups

    def _summary(self, claims: list[EventClaim], status: str) -> str:
        sources = ", ".join(claim.source_name for claim in claims)
        if status == "conflict":
            return f"Conflicting values reported by {sources}."
        if status == "needs_review":
            return f"Different wording found across {sources}; editor review recommended."
        return f"Consistent claim set from {sources}."
