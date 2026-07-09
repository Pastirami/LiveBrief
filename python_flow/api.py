from typing import List
from fastapi import FastAPI
from pydantic import BaseModel

from news_clusterer.scraper import scrape_url
from news_clusterer.vectorizer import build_vectorizer
from news_clusterer.clustering import cluster_articles

app = FastAPI(title="News Clusterer API")


class AnalyzeRequest(BaseModel):
    urls: List[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
def analyze(payload: AnalyzeRequest):
    articles = []
    errors = []

    for url in payload.urls:
        try:
            article = scrape_url(url)
            if article.text.strip():
                articles.append(article)
            else:
                errors.append({"url": url, "error": "Empty extracted text"})
        except Exception as exc:
            errors.append({"url": url, "error": str(exc)})

    if not articles:
        return {
            "articles": [],
            "clustered_articles": [],
            "summary": {},
            "errors": errors,
        }

    vectorizer = build_vectorizer()
    clustered_articles, summary = cluster_articles(articles, vectorizer)

    return {
        "articles": [article.to_dict() for article in articles],
        "clustered_articles": [item.to_dict() for item in clustered_articles],
        "summary": summary,
        "errors": errors,
    }