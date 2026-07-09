from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_extraction import text

CUSTOM_STOPWORDS = {
    "said", "reporting", "editing", "posted", "published", "updated", "last",
    "reuters", "article", "articles", "review", "news", "write", "corrections",
    "internazionale", "global", "banking", "finance", "explore", "category",
    "scrivici", "posta", "luglio", "giovedì", "giovedi", "athens",
    "del", "della", "delle", "degli", "dei", "nelle", "nella", "sul", "sulla",
    "vigili", "fuoco", "autorità", "autorita", "persone", "people",
}

def build_stopwords():
    return text.ENGLISH_STOP_WORDS.union(CUSTOM_STOPWORDS)

def build_vectorizer(n_documents: int | None = None) -> TfidfVectorizer:
    max_df = 1.0 if n_documents is not None and n_documents < 5 else 0.8

    return TfidfVectorizer(
        stop_words=list(build_stopwords()),
        max_features=2000,
        ngram_range=(1, 2),
        min_df=1,
        max_df=max_df,
        lowercase=True,
    )