import json
from pathlib import Path
from urllib.parse import urlparse

import joblib
import pandas as pd
import requests
from bs4 import BeautifulSoup
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

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
    import re
    cleaned = text
    for pattern in NOISE_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE | re.DOTALL)
    return clean_spaces(cleaned)


def extract_main_text(soup: BeautifulSoup) -> str:
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside", "figure", "blockquote", "table"]):
        tag.decompose()

    selectors = ["article", "main", "[role='main']", ".article-body", ".post-content", ".entry-content"]
    for selector in selectors:
        node = soup.select_one(selector)
        if node:
            paragraphs = [clean_spaces(p.get_text(" ", strip=True)) for p in node.find_all("p")]
            text = " ".join(p for p in paragraphs if p)
            if len(text) > 300:
                return clean_text_noise(text)

    paragraphs = [clean_spaces(p.get_text(" ", strip=True)) for p in soup.find_all("p")]
    return clean_text_noise(" ".join(p for p in paragraphs if p))


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
        "text": text,
    }


def csv_to_json(csv_path: str, json_path: str):
    df = pd.read_csv(csv_path)
    records = []
    for _, row in df.iterrows():
        records.append({
            "id": f"bbc_{row['ArticleId']}",
            "source": "bbc_dataset",
            "text": str(row['Text']),
            "category": str(row['Category']).strip().lower(),
        })
    Path(json_path).write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    return records


def train_model(csv_path: str, model_path: str = "bbc_news_model.joblib"):
    df = pd.read_csv(csv_path)
    X = df["Text"].astype(str)
    y = df["Category"].astype(str).str.lower()

    model = Pipeline([
        ("tfidf", TfidfVectorizer(stop_words="english", max_features=5000, ngram_range=(1, 2))),
        ("clf", LinearSVC())
    ])

    model.fit(X, y)
    joblib.dump(model, model_path)
    return model


def load_model(model_path: str = "bbc_news_model.joblib"):
    return joblib.load(model_path)


def predict_text_category(text: str, model) -> str:
    return model.predict([text])[0]


def predict_url_category(url: str, model=None) -> dict:
    if model is None:
        model = load_model()

    article = scrape_url(url)
    predicted_category = predict_text_category(article["text"], model)
    article["predicted_category"] = predicted_category
    return article


if __name__ == "__main__":
    csv_file = "BBC_News_Train.csv"
    json_file = "bbc_news_train.json"
    model_file = "bbc_news_model.joblib"

    records = csv_to_json(csv_file, json_file)
    print(f"Converted {len(records)} records to {json_file}")

    train_model(csv_file, model_file)
    print(f"Model trained and saved to {model_file}")
