import json
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.metrics import accuracy_score, classification_report

JSON_PATH = "bbc_news_train.json"
MODEL_PATH = "source_category_model.joblib"


def load_dataset(json_path: str):
    data = json.loads(Path(json_path).read_text(encoding="utf-8"))
    texts, labels = [], []

    for item in data:
        text = str(item.get("text", "")).strip()
        category = str(item.get("category", "")).strip().lower()
        if text and category:
            texts.append(text)
            labels.append(category)

    return texts, labels


def build_pipeline():
    return Pipeline([
        ("tfidf", TfidfVectorizer(stop_words="english", max_features=5000, ngram_range=(1, 2))),
        ("clf", LinearSVC())
    ])


def main():
    texts, labels = load_dataset(JSON_PATH)

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )

    model = build_pipeline()
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("Accuracy:", accuracy_score(y_test, y_pred))
    print(classification_report(y_test, y_pred))

    joblib.dump(model, MODEL_PATH)
    print("Model saved to", MODEL_PATH)


if __name__ == "__main__":
    main()