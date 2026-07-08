import os
from pathlib import Path

import httpx
from dotenv import load_dotenv


def extract_text(response_data: dict) -> str:
    chunks: list[str] = []
    for item in response_data.get("output", []):
        for part in item.get("content", []):
            if part.get("type") in {"output_text", "text"}:
                chunks.append(part.get("text", ""))
    return "".join(chunks).strip()


def main() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    load_dotenv(env_path)

    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("DEFAULT_MODEL", "gpt-4.1-mini")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is missing")

    response = httpx.post(
        "https://api.openai.com/v1/responses",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "input": "Reply with exactly: livebrief-ok",
            "max_output_tokens": 20,
        },
        timeout=30,
    )

    print(f"status={response.status_code}")
    if response.status_code >= 400:
        payload = response.json()
        error = payload.get("error", {})
        print(f"error_type={error.get('type')}")
        print(f"error_message={error.get('message')}")
        raise SystemExit(1)

    payload = response.json()
    print(f"model={payload.get('model')}")
    print(f"output={extract_text(payload)}")


if __name__ == "__main__":
    main()
