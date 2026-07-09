import sys
import joblib
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

MODEL_PATH = "source_category_model.joblib"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}


def clean_spaces(text: str) -> str:
    return " ".join(text.split())


def extract_main_text(soup: BeautifulSoup) -> str:
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside"]):
        tag.decompose()

    selectors = ["article", "main", "[role='main']", ".article-body", ".post-content", ".entry-content"]
    for selector in selectors:
        node = soup.select_one(selector)
        if node:
            paragraphs = [clean_spaces(p.get_text(" ", strip=True)) for p in node.find_all("p")]
            text = " ".join(p for p in paragraphs if p)
            if len(text) > 200:
                return text

    paragraphs = [clean_spaces(p.get_text(" ", strip=True)) for p in soup.find_all("p")]
    return " ".join(p for p in paragraphs if p)


def scrape_url(url: str) -> dict:
    response = requests.get(url, headers=HEADERS, timeout=15)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "lxml")

    title = clean_spaces(soup.title.get_text(" ", strip=True)) if soup.title else url
    text = extract_main_text(soup)

    return {
        "url": url,
        "domain": urlparse(url).netloc,
        "title": title,
        "text": text
    }


def main():
    urls = sys.argv[1:]
    if not urls:
        print("Usage: python predict_urls.py <url1> <url2> ...")
        return

    model = joblib.load(MODEL_PATH)

    for url in urls:
        try:
            article = scrape_url(url)
            predicted_category = model.predict([article["text"]])[0]

            print({
                "url": article["url"],
                "domain": article["domain"],
                "title": article["title"],
                "predicted_category": predicted_category
            })
        except Exception as exc:
            print({
                "url": url,
                "error": str(exc)
            })


if __name__ == "__main__":
    main()