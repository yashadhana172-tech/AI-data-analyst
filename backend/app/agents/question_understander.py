import re
from typing import Dict, Any, List

class QuestionUnderstander:
    """Understands user's analytical query intent and parameters."""

    @staticmethod
    def analyze(question: str) -> Dict[str, Any]:
        q_lower = question.lower().strip()

        # Intent detection
        intent = "general_analysis"
        if any(w in q_lower for w in ["trend", "over time", "monthly", "daily", "yearly", "growth", "timeline"]):
            intent = "trend_over_time"
        elif any(w in q_lower for w in ["top", "highest", "best", "leading", "most", "bottom", "lowest", "least"]):
            intent = "ranking"
        elif any(w in q_lower for w in ["compare", "comparison", "versus", "vs", "difference"]):
            intent = "comparison"
        elif any(w in q_lower for w in ["correlat", "relation", "relationship", "associated with"]):
            intent = "correlation"
        elif any(w in q_lower for w in ["unusual", "anomaly", "anomalies", "outlier", "outliers", "abnormal"]):
            intent = "anomaly_detection"
        elif any(w in q_lower for w in ["distribution", "spread", "histogram", "range"]):
            intent = "distribution"
        elif any(w in q_lower for w in ["average", "avg", "total", "sum", "overall", "mean"]):
            intent = "aggregation"
        elif any(w in q_lower for w in ["by", "per", "breakdown", "categor"]):
            intent = "breakdown"

        # Extract number if "top N" or "limit N"
        top_n = None
        num_match = re.search(r"\b(top|first|lowest|bottom)\s+(\d+)\b", q_lower)
        if num_match:
            top_n = int(num_match.group(2))
        elif "top" in q_lower:
            top_n = 10  # default top 10 if unspecified

        # Ascending vs Descending
        is_ascending = any(w in q_lower for w in ["bottom", "lowest", "least", "worst", "smallest"])

        return {
            "original_question": question,
            "intent": intent,
            "top_n": top_n,
            "is_ascending": is_ascending,
            "requires_time_grouping": intent == "trend_over_time" or any(w in q_lower for w in ["month", "year", "quarter", "date"]),
        }
