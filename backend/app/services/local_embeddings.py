from functools import lru_cache


class LocalEmbeddingError(RuntimeError):
    pass


class LocalSentenceEmbeddingModel:
    """Lazy wrapper around an open-source sentence-transformers model."""

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name

    def encode(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        model = _load_sentence_transformer(self.model_name)
        try:
            vectors = model.encode(
                texts,
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False,
            )
        except Exception as exc:  # pragma: no cover - model/runtime specific
            raise LocalEmbeddingError("Local embedding model failed to encode text.") from exc
        return vectors.tolist()


@lru_cache(maxsize=4)
def _load_sentence_transformer(model_name: str):
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:  # pragma: no cover - depends on optional install
        raise LocalEmbeddingError(
            "sentence-transformers is not installed. Install backend requirements to enable local embedding routing."
        ) from exc

    try:
        return SentenceTransformer(model_name)
    except Exception as exc:  # pragma: no cover - network/cache/model specific
        raise LocalEmbeddingError(f"Could not load local embedding model: {model_name}") from exc
