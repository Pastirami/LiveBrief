from urllib.parse import urlparse
import re
import requests
from bs4 import BeautifulSoup

from .models import Article

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
}

NOISE_PATTERNS = [
    r"Explore more articles.*$",
    r"Scrivici per correzioni.*$",
    r"Write to us for corrections.*$",
    r"Published by .*?$",
    r"Last updated: .*?$",
]


def clean_spaces(text: str) -> str:
    return " ".join(text.split())


def clean_text_noise(text: str) -> str:
    cleaned = text
    for pattern in NOISE_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE | re.DOTALL)
    return clean_spaces(cleaned)


def extract_main_text(soup: BeautifulSoup) -> str:
    for tag in soup([
        "script", "style", "noscript", "header", "footer",
        "nav", "aside", "figure", "blockquote", "table"
    ]):
        tag.decompose()

    selectors = [
        "article",
        "main",
        "[role='main']",
        ".article-body",
        ".post-content",
        ".entry-content",
    ]

    for selector in selectors:
        node = soup.select_one(selector)
        if node:
            paragraphs = [
                clean_spaces(p.get_text(" ", strip=True))
                for p in node.find_all("p")
            ]
            text = " ".join(p for p in paragraphs if p)
            if len(text) > 300:
                return clean_text_noise(text)

    paragraphs = [clean_spaces(p.get_text(" ", strip=True)) for p in soup.find_all("p")]
    text = " ".join(p for p in paragraphs if p)
    return clean_text_noise(text)


def extract_published_at(soup: BeautifulSoup):
    meta_candidates = [
        {"property": "article:published_time"},
        {"name": "pubdate"},
        {"name": "publish-date"},
        {"name": "date"},
    ]

    for attrs in meta_candidates:
        tag = soup.find("meta", attrs=attrs)
        if tag and tag.get("content"):
            return tag["content"]
    return None


def scrape_url(url: str) -> Article:
    response = requests.get(url, headers=HEADERS, timeout=15)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")

    title = clean_spaces(soup.title.get_text(" ", strip=True)) if soup.title else url
    text = extract_main_text(soup)
    domain = urlparse(url).netloc
    published_at = extract_published_at(soup)

    return Article(
        url=url,
        title=title,
        text=text,
        domain=domain,
        published_at=published_at,
    )