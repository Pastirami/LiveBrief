from dataclasses import dataclass, asdict
from typing import List, Optional


@dataclass
class Article:
    url: str
    title: str
    text: str
    domain: str
    published_at: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ClusteredArticle:
    url: str
    title: str
    domain: str
    cluster_id: int
    top_terms: List[str]
    preview: str

    def to_dict(self) -> dict:
        return asdict(self)