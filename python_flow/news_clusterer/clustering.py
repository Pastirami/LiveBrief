from collections import defaultdict
from typing import List, Tuple

import numpy as np
from sklearn.cluster import KMeans

from .models import Article, ClusteredArticle


def choose_k(n_articles: int) -> int:
    if n_articles <= 2:
        return 1
    if n_articles <= 5:
        return 2
    if n_articles <= 9:
        return 3
    return 4


def top_terms_per_cluster(tfidf_matrix, labels, feature_names, top_n: int = 6):
    terms = {}
    labels = np.array(labels)

    for cluster_id in sorted(set(labels)):
        idx = np.where(labels == cluster_id)[0]
        cluster_matrix = tfidf_matrix[idx]
        mean_scores = np.asarray(cluster_matrix.mean(axis=0)).ravel()
        top_idx = mean_scores.argsort()[::-1][:top_n]
        terms[int(cluster_id)] = [feature_names[i] for i in top_idx]

    return terms


def build_cluster_label(cluster_id: int, cluster_terms: dict, articles_in_cluster: List[Article]) -> str:
    top_terms = cluster_terms.get(cluster_id, [])
    if not top_terms:
        return f"Cluster {cluster_id}"

    short_terms = top_terms[:3]
    title_hint = articles_in_cluster[0].title if articles_in_cluster else f"Cluster {cluster_id}"

    return f"{' / '.join(short_terms)} | {title_hint}"


def cluster_articles(articles: List[Article], vectorizer) -> Tuple[List[ClusteredArticle], dict]:
    documents = [article.text if article.text else article.title for article in articles]
    tfidf_matrix = vectorizer.fit_transform(documents)

    k = choose_k(len(articles))
    model = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = model.fit_predict(tfidf_matrix)

    feature_names = vectorizer.get_feature_names_out()
    cluster_terms = top_terms_per_cluster(tfidf_matrix, labels, feature_names)

    grouped_articles = defaultdict(list)
    for article, label in zip(articles, labels):
        grouped_articles[int(label)].append(article)

    cluster_labels = {
        cluster_id: build_cluster_label(cluster_id, cluster_terms, grouped_articles[cluster_id])
        for cluster_id in grouped_articles
    }

    clustered_articles = []
    for article, label in zip(articles, labels):
        clustered_articles.append(
            ClusteredArticle(
                url=article.url,
                title=article.title,
                domain=article.domain,
                cluster_id=int(label),
                top_terms=cluster_terms[int(label)],
                preview=(article.text[:220] + "...") if len(article.text) > 220 else article.text,
            )
        )

    summary = defaultdict(list)
    for item in clustered_articles:
        summary[item.cluster_id].append(item.url)

    return clustered_articles, {
        "clusters": dict(summary),
        "top_terms": cluster_terms,
        "cluster_labels": cluster_labels,
    }