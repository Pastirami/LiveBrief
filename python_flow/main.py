import argparse
import json
from pathlib import Path

from news_clusterer.scraper import scrape_url
from news_clusterer.vectorizer import build_vectorizer
from news_clusterer.clustering import cluster_articles


def main():
    parser = argparse.ArgumentParser(
        description="Scrape URLs, vectorize article text, and cluster similar news."
    )
    parser.add_argument("urls", nargs="+", help="List of URLs to analyze")
    parser.add_argument(
        "--output",
        default="output/news_clusterer/result.json",
        help="Path to output JSON",
    )
    args = parser.parse_args()

    articles = []
    errors = []

    for url in args.urls:
        try:
            article = scrape_url(url)
            if article.text.strip():
                articles.append(article)
            else:
                errors.append({"url": url, "error": "Empty extracted text"})
        except Exception as exc:
            errors.append({"url": url, "error": str(exc)})

    if not articles:
        result = {
            "articles": [],
            "clustered_articles": [],
            "summary": {},
            "errors": errors,
        }
    else:
        vectorizer = build_vectorizer(len(articles))
        clustered_articles, summary = cluster_articles(articles, vectorizer)
        result = {
            "articles": [article.to_dict() for article in articles],
            "clustered_articles": [item.to_dict() for item in clustered_articles],
            "summary": summary,
            "errors": errors,
        }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()