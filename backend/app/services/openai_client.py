import time
from typing import Any

import httpx

from app.core.config import Settings


class OpenAIServiceError(RuntimeError):
    pass


class OpenAIResponsesClient:
    def __init__(self, settings: Settings) -> None:
        if not settings.openai_api_key:
            raise OpenAIServiceError("OPENAI_API_KEY is missing.")
        self.api_key = settings.openai_api_key
        self.model = settings.default_model
        self.timeout = settings.request_timeout_seconds

    def create_structured_response(
        self,
        *,
        instructions: str,
        input_text: str,
        schema_name: str,
        schema: dict[str, Any],
        max_output_tokens: int,
    ) -> dict[str, Any]:
        payload = {
            "model": self.model,
            "instructions": instructions,
            "input": input_text,
            "max_output_tokens": max_output_tokens,
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": schema_name,
                    "strict": True,
                    "schema": schema,
                }
            },
        }
        response: httpx.Response | None = None
        for attempt in range(3):
            try:
                response = httpx.post(
                    "https://api.openai.com/v1/responses",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=self.timeout,
                )
            except httpx.TimeoutException as exc:
                if attempt == 2:
                    raise OpenAIServiceError("OpenAI request timed out.") from exc
                time.sleep(0.5 * (attempt + 1))
                continue
            except httpx.HTTPError as exc:
                raise OpenAIServiceError("Could not connect to OpenAI.") from exc

            if response.status_code < 400:
                break
            if response.status_code in {429, 500, 502, 503, 504} and attempt < 2:
                time.sleep(0.5 * (attempt + 1))
                continue
            raise OpenAIServiceError(self._error_message(response))

        if response is None or response.status_code >= 400:
            raise OpenAIServiceError("OpenAI request failed.")
        try:
            payload = response.json()
        except ValueError as exc:
            raise OpenAIServiceError("OpenAI returned an unreadable response.") from exc

        if payload.get("status") == "incomplete":
            reason = payload.get("incomplete_details", {}).get("reason", "unknown reason")
            raise OpenAIServiceError(f"OpenAI response was incomplete: {reason}.")
        text = self._response_text(payload)
        if not text:
            raise OpenAIServiceError("OpenAI returned no text.")
        try:
            import json

            return json.loads(text)
        except (TypeError, ValueError) as exc:
            raise OpenAIServiceError("OpenAI returned invalid structured output.") from exc

    def _response_text(self, payload: dict[str, Any]) -> str:
        chunks: list[str] = []
        for item in payload.get("output", []):
            for part in item.get("content", []):
                if part.get("type") in {"output_text", "text"}:
                    chunks.append(part.get("text", ""))
                if part.get("type") == "refusal":
                    raise OpenAIServiceError(part.get("refusal") or "OpenAI refused the request.")
        return "".join(chunks).strip()

    def _error_message(self, response: httpx.Response) -> str:
        try:
            error = response.json().get("error", {})
            message = error.get("message") or error.get("type")
        except ValueError:
            message = response.text[:300]
        return f"OpenAI request failed ({response.status_code}): {message or 'unknown error'}"
