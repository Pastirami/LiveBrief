from app.schemas.analysis import ConflictAlert, EventGroup


class ConflictDetector:
    def detect(self, groups: list[EventGroup]) -> list[ConflictAlert]:
        alerts: list[ConflictAlert] = []
        has_unverified = any(group.id == "verification_status" for group in groups)
        for group in groups:
            if group.id == "casualty_count":
                alerts.extend(self._casualty_alerts(group, has_unverified))
            if group.id == "event_time":
                alerts.extend(self._time_alerts(group))
        return alerts

    def _casualty_alerts(
        self,
        group: EventGroup,
        has_unverified: bool,
    ) -> list[ConflictAlert]:
        values = sorted({claim.value for claim in group.claims})
        if len(values) <= 1 and not has_unverified:
            return []
        return [
            ConflictAlert(
                id="casualty-count-conflict",
                group_id=group.id,
                severity="critical",
                title="Casualty count conflict",
                summary="Sources provide different casualty figures or lack primary confirmation.",
                conflicting_values=values,
                recommendation="Do not publish a precise casualty number until a primary source confirms it.",
            )
        ]

    def _time_alerts(self, group: EventGroup) -> list[ConflictAlert]:
        times = sorted({claim.time for claim in group.claims if claim.time})
        if len(times) <= 1:
            return []
        return [
            ConflictAlert(
                id="event-time-mismatch",
                group_id=group.id,
                severity="medium",
                title="Event time mismatch",
                summary="Sources place the event at different times.",
                conflicting_values=times,
                recommendation="Use approximate wording until an official timestamp is confirmed.",
            )
        ]
