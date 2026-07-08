import re
from hashlib import sha1


NUMBER_WORDS = {
    "zero": 0,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
}


def stable_id(*parts: str) -> str:
    raw = "::".join(part.strip().lower() for part in parts if part)
    return sha1(raw.encode("utf-8")).hexdigest()[:12]


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def first_time(text: str) -> str | None:
    match = re.search(r"\b([01]?\d|2[0-3]):[0-5]\d\b", text)
    return match.group(0) if match else None


def first_sentence_containing(text: str, keywords: list[str]) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", normalize_space(text))
    for sentence in sentences:
        lowered = sentence.lower()
        if any(keyword in lowered for keyword in keywords):
            return sentence
    return sentences[0] if sentences else normalize_space(text)


def extract_injury_count(text: str) -> int | None:
    lowered = text.lower()
    digit_match = re.search(r"\b(\d{1,4})\s+(?:people\s+)?(?:were\s+)?injur", lowered)
    if digit_match:
        return int(digit_match.group(1))

    for word, number in NUMBER_WORDS.items():
        if re.search(rf"\b{word}\s+(?:people\s+)?(?:were\s+)?injur", lowered):
            return number
    return None
