from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.logging import logger

class InsightGenerator:
    """Generates strictly grounded business insights, findings, and recommendations."""

    @staticmethod
    def generate_insights(
        question: str,
        columns: List[str],
        rows: List[Dict[str, Any]],
        sql_query: str
    ) -> Dict[str, Any]:
        if not rows:
            return {
                "answer": "No data points were returned matching your criteria.",
                "key_findings": ["The query executed successfully but found 0 matching records."],
                "business_insights": "Consider broadening your filters or checking if the requested segment exists in the dataset.",
                "recommendations": ["Verify the spelling of category or region names.", "Check date range limits."],
                "limitations": "Zero records found in current filtered slice.",
                "follow_up_questions": [
                    "What are the available categories?",
                    "Show the total row count of the dataset",
                    "List all unique regions"
                ]
            }

        # If OpenAI is configured, we can ask LLM to format the grounded narrative,
        # providing the EXACT rows in prompt so it cannot hallucinate.
        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY.strip()) > 5:
            try:
                llm_res = InsightGenerator._generate_with_llm(question, columns, rows, sql_query)
                if llm_res:
                    return llm_res
            except Exception as e:
                logger.warning(f"LLM insight generation failed, using deterministic analytical engine: {e}")

        # Deterministic Grounded Insights
        return InsightGenerator._generate_deterministic(question, columns, rows)

    @staticmethod
    def _generate_with_llm(
        question: str,
        columns: List[str],
        rows: List[Dict[str, Any]],
        sql_query: str
    ) -> Optional[Dict[str, Any]]:
        import json
        from openai import OpenAI
        
        client_kwargs = {"api_key": settings.OPENAI_API_KEY}
        if settings.OPENAI_BASE_URL:
            client_kwargs["base_url"] = settings.OPENAI_BASE_URL
        client = OpenAI(**client_kwargs)

        sample_rows = rows[:15]
        prompt = f"""You are InsightAI, a senior data analyst and business strategist.
The user asked: "{question}"

The SQL query executed:
{sql_query}

The query returned {len(rows)} rows. Here is the actual query output (first {len(sample_rows)} rows):
{json.dumps(sample_rows, indent=2)}

CRITICAL RULES:
1. NEVER INVENT OR HALLUCINATE NUMBERS. Every single statistic or metric cited must come directly from the rows above.
2. Provide a structured JSON response matching this schema:
{{
  "answer": "Direct 1-2 sentence answer to the user's question with exact top numbers.",
  "key_findings": [
    "3-4 bullet points highlighting specific numbers, ranks, and percentages"
  ],
  "business_insights": "Paragraph explaining business drivers and implications based purely on this evidence.",
  "recommendations": [
    "2 practical, actionable next steps for management"
  ],
  "limitations": "Any caveats or constraints regarding this data slice.",
  "follow_up_questions": [
    "3 insightful follow-up questions to explore next"
  ]
}}
Return ONLY valid JSON.
"""
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=600
        )
        data = json.loads(response.choices[0].message.content)
        return data

    @staticmethod
    def _generate_deterministic(
        question: str,
        columns: List[str],
        rows: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        num_rows = len(rows)
        first_row = rows[0]

        # Case 1: Single KPI row (e.g. Total Revenue / Average Order Value)
        if num_rows == 1:
            kpi_items = [f"{k.replace('_', ' ').title()}: {v}" for k, v in first_row.items() if v is not None]
            answer_text = f"Analysis yields: {', '.join(kpi_items[:3])}."
            findings = [
                f"{k.replace('_', ' ').title()} is currently {v} across the dataset."
                for k, v in first_row.items() if v is not None
            ]
            return {
                "answer": answer_text,
                "key_findings": findings,
                "business_insights": "This core aggregate indicates baseline operational performance across all transactions.",
                "recommendations": [
                    "Benchmark this aggregate against historical quarters.",
                    "Segment this metric across top customer cohorts and regions."
                ],
                "limitations": "Aggregated overall metric masks variance across individual sub-segments.",
                "follow_up_questions": [
                    "How has this metric trended monthly?",
                    "Break this down by region",
                    "Which category contributes the most?"
                ]
            }

        # Case 2: Multi-row Ranking / Breakdown / Trend
        label_col = columns[0]
        # find primary numeric value column
        metric_col = columns[1] if len(columns) > 1 else columns[0]
        for col in columns[1:]:
            if isinstance(first_row.get(col), (int, float)):
                metric_col = col
                break

        top_entity = first_row.get(label_col)
        top_val = first_row.get(metric_col)

        # Calculate total across returned rows if numeric
        vals = [r.get(metric_col) for r in rows if isinstance(r.get(metric_col), (int, float))]
        total_val = sum(vals) if vals else 0
        top_pct = round((top_val / total_val * 100), 1) if (total_val > 0 and isinstance(top_val, (int, float))) else None

        answer_text = f"**{top_entity}** ranks highest with **{top_val:,}** in {metric_col.replace('_', ' ')}." if isinstance(top_val, (int, float)) else f"Top result is **{top_entity}**."

        findings = [
            f"**{top_entity}** leads the dataset with {metric_col.replace('_', ' ')} of {top_val}."
        ]
        if top_pct is not None:
            findings.append(f"It accounts for approximately {top_pct}% of the total represented in this top group.")
        if num_rows > 1:
            second_entity = rows[1].get(label_col)
            second_val = rows[1].get(metric_col)
            findings.append(f"Runner-up is **{second_entity}** with {second_val}.")
        if num_rows > 2:
            lowest_entity = rows[-1].get(label_col)
            lowest_val = rows[-1].get(metric_col)
            findings.append(f"The lowest in this group is **{lowest_entity}** with {lowest_val}.")

        recommendations = [
            f"Focus marketing and sales optimization on high-performing segments like '{top_entity}'.",
            "Examine whether lower-ranked segments need product repositioning or targeted incentives."
        ]

        insights = f"Performance is concentrated around top leaders, with {top_entity} generating the highest impact in {metric_col.replace('_', ' ')}."

        return {
            "answer": answer_text,
            "key_findings": findings,
            "business_insights": insights,
            "recommendations": recommendations,
            "limitations": f"Analysis covers top {num_rows} records returned by the analytical query.",
            "follow_up_questions": [
                f"Show the monthly trend for {top_entity}",
                f"What is the profit margin for {top_entity}?",
                "Compare top performers against the regional average"
            ]
        }
