from app.schemas.analysis import EventClaim, SourceDocument
from app.utils.text import (
    extract_injury_count,
    first_sentence_containing,
    first_time,
    stable_id,
)


class RuleBasedEventExtractor:
    """Deterministic MVP extractor.

    This is intentionally isolated so an AI extractor can replace it later without
    changing routers, schemas, grouping, or validation logic.
    """

    def extract(self, sources: list[SourceDocument]) -> list[EventClaim]:
        claims: list[EventClaim] = []
        for source in sources:
            lowered = source.text.lower()
            time = first_time(source.text)

            if "explosion" in lowered or "blast" in lowered:
                claims.append(self._incident_claim(source, time))

            injury_count = extract_injury_count(source.text)
            if injury_count is not None:
                claims.append(self._casualty_claim(source, injury_count, time))

            if time:
                claims.append(self._time_claim(source, time))

            if any(token in lowered for token in ["not yet verified", "unverified", "not verified"]):
                claims.append(self._verification_claim(source, time))

        return claims

    def _incident_claim(self, source: SourceDocument, time: str | None) -> EventClaim:
        evidence = first_sentence_containing(source.text, ["explosion", "blast"])
        return EventClaim(
            id=stable_id(source.id, "incident"),
            group_key="incident",
            group_label="Incident confirmed",
            source_id=source.id,
            source_name=source.name,
            field="Incident",
            value="Explosion reported near Central Station",
            claim=evidence,
            evidence=evidence,
            time=time,
            location="Central Station",
            subject=source.name,
            action="reported an explosion",
            confidence=88,
            status="confirmed" if "confirmed" in evidence.lower() else "to_verify",
            risk="low",
        )

    def _casualty_claim(
        self,
        source: SourceDocument,
        injury_count: int,
        time: str | None,
    ) -> EventClaim:
        evidence = first_sentence_containing(source.text, ["injur"])
        return EventClaim(
            id=stable_id(source.id, "casualty", str(injury_count)),
            group_key="casualty_count",
            group_label="Casualty count",
            source_id=source.id,
            source_name=source.name,
            field="Injured",
            value=f"{injury_count} people injured",
            claim=evidence,
            evidence=evidence,
            time=time,
            location="Central Station",
            subject=source.name,
            action="reported casualties",
            numbers={"injured": injury_count},
            confidence=72,
            status="to_verify",
            risk="high",
        )

    def _time_claim(self, source: SourceDocument, time: str) -> EventClaim:
        evidence = first_sentence_containing(source.text, [time, "explosion", "blast"])
        return EventClaim(
            id=stable_id(source.id, "time", time),
            group_key="event_time",
            group_label="Event time",
            source_id=source.id,
            source_name=source.name,
            field="Time",
            value=f"Event reported at {time}",
            claim=evidence,
            evidence=evidence,
            time=time,
            location="Central Station",
            subject=source.name,
            action="reported event time",
            confidence=68,
            status="confirmed" if source.source_type.lower().startswith("official") else "to_verify",
            risk="medium",
        )

    def _verification_claim(self, source: SourceDocument, time: str | None) -> EventClaim:
        evidence = first_sentence_containing(source.text, ["verified", "unverified"])
        return EventClaim(
            id=stable_id(source.id, "verification"),
            group_key="verification_status",
            group_label="Verification status",
            source_id=source.id,
            source_name=source.name,
            field="Verification",
            value="Casualty figures are not verified",
            claim=evidence,
            evidence=evidence,
            time=time,
            location="Central Station",
            subject=source.name,
            action="withheld casualty confirmation",
            confidence=95,
            status="confirmed",
            risk="low",
        )
