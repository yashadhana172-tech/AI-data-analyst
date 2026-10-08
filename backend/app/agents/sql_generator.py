import os
import json
import re
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.logging import logger
from app.agents.schema_analyzer import SchemaAnalyzer
from app.agents.planner import AnalysisPlanner

class SQLGenerator:
    """Generates DuckDB-compatible SQL using LLM with deterministic fallbacks."""

    def __init__(self, schema_analyzer: SchemaAnalyzer):
        self.schema_analyzer = schema_analyzer

    def generate(self, question: str, plan: Dict[str, Any], conversation_context: Optional[List[Dict[str, str]]] = None) -> str:
        # Check if LLM is available and configured
        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY.strip()) > 5:
            try:
                llm_sql = self._generate_with_llm(question, plan, conversation_context)
                if llm_sql:
                    return llm_sql
            except Exception as e:
                logger.warning(f"LLM SQL generation failed, falling back to analytical planner: {e}")

        # Deterministic Analytical Fallback
        return self._generate_deterministic(question, plan)

    def _generate_with_llm(self, question: str, plan: Dict[str, Any], conversation_context: Optional[List[Dict[str, str]]] = None) -> Optional[str]:
        from openai import OpenAI
        
        client_kwargs = {"api_key": settings.OPENAI_API_KEY}
        if settings.OPENAI_BASE_URL:
            client_kwargs["base_url"] = settings.OPENAI_BASE_URL
        client = OpenAI(**client_kwargs)

        cols_desc = []
        for c in self.schema_analyzer.columns_info:
            samples = c.get("sample_values_json", "[]")
            cols_desc.append(f"- {c['name']} ({c['data_type']}) [Sample values: {samples}]")
        schema_text = "\n".join(cols_desc)

        prompt = f"""You are a master data analyst writing DuckDB SQL.
The table is named: `dataset`.
Schema:
{schema_text}

Rules:
1. ONLY return the raw SQL query. No explanations, no markdown formatting, no ```sql wrappers.
2. The query MUST be a read-only SELECT or WITH statement.
3. Use DuckDB SQL syntax. Table name is `dataset`.
4. Wrap column names in double quotes if they contain spaces or special characters.
5. Apply appropriate aggregate functions (SUM, AVG, COUNT, etc.) and alias them with readable names.
6. When analyzing monthly or yearly trends, use strftime(CAST(order_date AS DATE), '%Y-%m') or similar.
7. Always order results meaningfully.

User Question: {question}
"""
        messages = [
            {"role": "system", "content": "You are a read-only DuckDB SQL generation engine. Return ONLY the SQL query string."}
        ]
        if conversation_context:
            for msg in conversation_context[-4:]:
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": prompt})

        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.1,
            max_tokens=300
        )
        sql = response.choices[0].message.content.strip()
        # Clean markdown code block if LLM wrapped it
        sql = re.sub(r"^```(?:sql)?\s*", "", sql, flags=re.IGNORECASE)
        sql = re.sub(r"\s*```$", "", sql)
        return sql.strip()

    def _generate_deterministic(self, question: str, plan: Dict[str, Any]) -> str:
        q_lower = question.lower()
        dim = plan.get("target_dimension")
        metric = plan.get("target_metric")
        agg = plan.get("aggregation", "SUM")
        date_col = plan.get("date_column")
        limit = plan.get("limit", 10)
        is_asc = plan.get("is_ascending", False)
        order_dir = "ASC" if is_asc else "DESC"

        # Check for Correlation request
        if "correlat" in q_lower:
            metrics = self.schema_analyzer.get_metric_columns()
            if len(metrics) >= 2:
                # Find which metrics are mentioned
                mentioned = [m for m in metrics if m.lower() in q_lower]
                m1 = mentioned[0] if len(mentioned) > 0 else metrics[0]
                m2 = mentioned[1] if len(mentioned) > 1 else (metrics[1] if len(metrics) > 1 else metrics[0])
                return f"SELECT corr(\"{m1}\", \"{m2}\") AS correlation_coefficient, COUNT(*) AS data_points FROM dataset WHERE \"{m1}\" IS NOT NULL AND \"{m2}\" IS NOT NULL LIMIT 1;"

        # Check for Unusual / Outlier / Anomaly request
        if any(w in q_lower for w in ["unusual", "outlier", "anomaly"]):
            m = metric or "revenue"
            return f"SELECT * FROM dataset WHERE \"{m}\" > (SELECT AVG(\"{m}\") + 2.5 * STDDEV(\"{m}\") FROM dataset) OR \"{m}\" < (SELECT AVG(\"{m}\") - 2.5 * STDDEV(\"{m}\") FROM dataset) ORDER BY \"{m}\" DESC LIMIT {limit};"

        # Check for Monthly / Time Trend request
        if plan.get("is_monthly_trend") and date_col:
            m = metric or "revenue"
            return f"""SELECT 
    strftime(CAST("{date_col}" AS DATE), '%Y-%m') AS month,
    ROUND({agg}("{m}"), 2) AS total_{m},
    COUNT(*) AS order_count
FROM dataset
WHERE "{date_col}" IS NOT NULL
GROUP BY month
ORDER BY month ASC
LIMIT {limit};"""

        # Check for Average Order Value / Single KPI
        if any(w in q_lower for w in ["average order value", "aov", "overall revenue", "total profit", "total revenue"]):
            if "order value" in q_lower:
                return f"SELECT ROUND(AVG(revenue), 2) AS average_order_value, ROUND(SUM(revenue), 2) AS total_revenue, COUNT(*) AS total_orders FROM dataset;"
            elif "profit" in q_lower:
                return f"SELECT ROUND(SUM(profit), 2) AS total_profit, ROUND(AVG(profit), 2) AS average_profit, ROUND(SUM(profit) / NULLIF(SUM(revenue), 0) * 100, 2) AS overall_profit_margin_pct FROM dataset;"
            elif "revenue" in q_lower or "sales" in q_lower:
                return f"SELECT ROUND(SUM(revenue), 2) AS total_revenue, ROUND(AVG(revenue), 2) AS average_order_revenue, COUNT(*) AS total_orders FROM dataset;"

        # Category / Dimension Breakdown or Ranking
        if dim and metric:
            return f"""SELECT 
    "{dim}",
    ROUND({agg}("{metric}"), 2) AS total_{metric},
    COUNT(*) AS transaction_count
FROM dataset
WHERE "{dim}" IS NOT NULL
GROUP BY "{dim}"
ORDER BY total_{metric} {order_dir}
LIMIT {limit};"""

        if dim:
            return f"""SELECT 
    "{dim}",
    COUNT(*) AS record_count
FROM dataset
WHERE "{dim}" IS NOT NULL
GROUP BY "{dim}"
ORDER BY record_count DESC
LIMIT {limit};"""

        # Default fallback: summary of key metric
        if metric:
            return f"""SELECT 
    COUNT(*) AS total_records,
    ROUND(SUM("{metric}"), 2) AS total_{metric},
    ROUND(AVG("{metric}"), 2) AS average_{metric},
    ROUND(MIN("{metric}"), 2) AS min_{metric},
    ROUND(MAX("{metric}"), 2) AS max_{metric}
FROM dataset;"""

        return f"SELECT * FROM dataset LIMIT {limit};"
