from app.schemas.article import AnalyzeRequest, ArticleInput


def get_sample_case() -> AnalyzeRequest:
    return AnalyzeRequest(
        topic="Explosion reported near Central Station",
        articles=[
            ArticleInput(
                source_name="Source A",
                source_type="Official brief",
                received_at="08:04",
                text="Officials say 8 people were injured after an explosion near Central Station at 08:00.",
            ),
            ArticleInput(
                source_name="Source B",
                source_type="Local media",
                received_at="08:11",
                text="Local media reports 12 people injured after a blast around 08:15 near the station.",
            ),
            ArticleInput(
                source_name="Source C",
                source_type="Police statement",
                received_at="08:18",
                text="Police confirmed an explosion but said casualty figures are not yet verified.",
            ),
        ],
    )
