from typing import Dict, Any, List, Optional
from app.agents.schema_analyzer import SchemaAnalyzer

class AnalysisPlanner:
    """Creates a structured analytical plan based on intent and schema."""

    @staticmethod
    def create_plan(understanding: Dict[str, Any], schema_analyzer: SchemaAnalyzer) -> Dict[str, Any]:
        intent = understanding["intent"]
        q_raw = understanding["original_question"].lower()

        metrics = schema_analyzer.get_metric_columns()
        dimensions = schema_analyzer.get_dimension_columns()
        dates = schema_analyzer.get_date_columns()

        # Find target metric
        target_metric = None
        for word in ["revenue", "sales", "profit", "discount", "quantity", "cost", "price", "amount"]:
            if word in q_raw:
                matched = schema_analyzer.find_matching_column(word)
                if matched and matched in metrics:
                    target_metric = matched
                    break
        if not target_metric and metrics:
            target_metric = metrics[0]  # fallback to first numeric metric

        # Determine aggregation type
        agg_func = "SUM"
        if any(w in q_raw for w in ["average", "avg", "mean"]):
            agg_func = "AVG"
        elif any(w in q_raw for w in ["count", "how many", "number of orders"]):
            agg_func = "COUNT"
        elif any(w in q_raw for w in ["maximum", "max", "highest unit"]):
            agg_func = "MAX"
        elif any(w in q_raw for w in ["minimum", "min", "lowest unit"]):
            agg_func = "MIN"

        # Find target dimension
        target_dim = None
        for word in ["product", "category", "region", "customer", "payment_method", "country", "status", "segment"]:
            if word in q_raw:
                matched = schema_analyzer.find_matching_column(word)
                if matched and matched in dimensions:
                    target_dim = matched
                    break

        # Time grouping check
        time_col = dates[0] if dates else None
        is_monthly = any(w in q_raw for w in ["monthly", "month"]) or (intent == "trend_over_time" and time_col)

        limit_count = understanding.get("top_n", 50)
        if not limit_count:
            limit_count = 50

        return {
            "intent": intent,
            "target_metric": target_metric,
            "target_dimension": target_dim,
            "date_column": time_col,
            "aggregation": agg_func,
            "is_monthly_trend": is_monthly,
            "is_ascending": understanding.get("is_ascending", False),
            "limit": limit_count
        }
