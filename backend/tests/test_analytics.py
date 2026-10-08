import os
import pytest
from app.agents.sql_validator import SQLValidator
from app.agents.execution_engine import ExecutionEngine
from app.agents.question_understander import QuestionUnderstander
from app.agents.schema_analyzer import SchemaAnalyzer
from app.agents.planner import AnalysisPlanner
from app.agents.visualization_agent import VisualizationAgent
from app.agents.insight_generator import InsightGenerator
from app.analytics.profiler import DataProfiler
from app.analytics.cleaner import DataCleaner
from app.services.report_service import ReportService
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.core.config import settings

SAMPLE_CSV = os.path.join(settings.DATA_DIR, "sample_sales.csv")

def test_password_hashing():
    pw = "SecretP@ssw0rd!"
    hashed = get_password_hash(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("wrong_pass", hashed) is False

def test_jwt_token_flow():
    token = create_access_token("42")
    payload = decode_access_token(token)
    assert payload is not None
    assert payload.get("sub") == "42"

def test_sql_validator_blocks_dml_ddl():
    dangerous = [
        "DROP TABLE users;",
        "DELETE FROM dataset;",
        "UPDATE dataset SET revenue = 0;",
        "INSERT INTO dataset VALUES (1);",
        "ALTER TABLE dataset ADD COLUMN hacked TEXT;",
        "TRUNCATE TABLE dataset;"
    ]
    for q in dangerous:
        is_valid, _, err = SQLValidator.validate_and_sanitize(q)
        assert is_valid is False
        assert err is not None

def test_sql_validator_blocks_multistatement():
    q = "SELECT * FROM dataset; DROP TABLE dataset;"
    is_valid, _, err = SQLValidator.validate_and_sanitize(q)
    assert is_valid is False
    assert "Multi-statement" in err

def test_sql_validator_enforces_limit():
    q = "SELECT order_id, revenue FROM dataset"
    is_valid, sanitized, _ = SQLValidator.validate_and_sanitize(q)
    assert is_valid is True
    assert "LIMIT" in sanitized

def test_sql_validator_caps_excessive_limit():
    q = "SELECT * FROM dataset LIMIT 99999"
    is_valid, sanitized, _ = SQLValidator.validate_and_sanitize(q, max_limit=500)
    assert is_valid is True
    assert "LIMIT 500" in sanitized

def test_duckdb_execution_engine():
    assert os.path.exists(SAMPLE_CSV)
    engine = ExecutionEngine(SAMPLE_CSV)
    res = engine.execute_query("SELECT region, SUM(revenue) AS total_revenue FROM dataset GROUP BY region ORDER BY total_revenue DESC LIMIT 5;")
    assert res["success"] is True
    assert len(res["rows"]) > 0
    assert "region" in res["columns"]
    assert "total_revenue" in res["columns"]
    assert res["execution_time_ms"] > 0

def test_duckdb_execution_engine_handles_errors():
    engine = ExecutionEngine(SAMPLE_CSV)
    res = engine.execute_query("SELECT nonexistent_col FROM dataset;")
    assert res["success"] is False
    assert res["error"] is not None

def test_dataset_profiling():
    profiler = DataProfiler(SAMPLE_CSV)
    profile = profiler.generate_profile()
    assert profile["summary"]["row_count"] >= 1000
    assert profile["summary"]["column_count"] >= 10
    assert "columns" in profile
    assert "column_summaries" in profile
    assert "revenue" in profile["column_summaries"]
    assert profile["column_summaries"]["revenue"]["type"] == "numeric"
    assert profile["column_summaries"]["revenue"]["mean"] > 0

def test_question_understanding():
    q1 = QuestionUnderstander.analyze("What are the top 5 products by revenue?")
    assert q1["intent"] == "ranking"
    assert q1["top_n"] == 5

    q2 = QuestionUnderstander.analyze("Show monthly trends in sales")
    assert q2["intent"] == "trend_over_time"
    assert q2["requires_time_grouping"] is True

def test_schema_analyzer():
    cols = [
        {"name": "revenue", "data_type": "FLOAT", "python_type": "float"},
        {"name": "product_name", "data_type": "VARCHAR", "python_type": "str"},
        {"name": "order_date", "data_type": "DATETIME", "python_type": "datetime"}
    ]
    analyzer = SchemaAnalyzer(cols)
    assert analyzer.find_matching_column("sales") == "revenue"
    assert analyzer.find_matching_column("items") == "product_name"
    assert "revenue" in analyzer.get_metric_columns()
    assert "product_name" in analyzer.get_dimension_columns()

def test_visualization_agent_chart_types():
    # Test Line Chart selection
    rows_trend = [
        {"month": "2024-01", "revenue": 1000},
        {"month": "2024-02", "revenue": 1500}
    ]
    viz_trend = VisualizationAgent.create_visualization("Show monthly revenue trend", ["month", "revenue"], rows_trend, {"type": "multi_row"})
    assert viz_trend["chart_type"] == "line"
    assert viz_trend["plotly_spec"] is not None

    # Test Bar Chart selection
    rows_bar = [
        {"region": "North", "revenue": 5000},
        {"region": "South", "revenue": 4000}
    ]
    viz_bar = VisualizationAgent.create_visualization("Revenue by region", ["region", "revenue"], rows_bar, {"type": "multi_row"})
    assert viz_bar["chart_type"] == "bar"

    # Test KPI Card selection
    rows_kpi = [{"total_revenue": 120500.50}]
    viz_kpi = VisualizationAgent.create_visualization("Overall total revenue", ["total_revenue"], rows_kpi, {"type": "kpi_card"})
    assert viz_kpi["chart_type"] == "kpi_card"

def test_insight_generator_deterministic():
    rows = [
        {"product_name": "MacBook Pro", "total_revenue": 150000},
        {"product_name": "Dell XPS", "total_revenue": 95000}
    ]
    insights = InsightGenerator.generate_insights("Top products", ["product_name", "total_revenue"], rows, "SELECT ...")
    assert "MacBook Pro" in insights["answer"]
    assert len(insights["key_findings"]) >= 2
    assert len(insights["recommendations"]) >= 1
    assert len(insights["follow_up_questions"]) == 3

def test_data_cleaner_preview_and_apply(tmp_path):
    cleaner = DataCleaner(SAMPLE_CSV)
    preview = cleaner.preview_cleaning({"remove_duplicates": True, "drop_empty_columns": True})
    assert "before_rows" in preview
    assert "after_rows" in preview
    assert preview["after_rows"] <= preview["before_rows"]

    out_file = str(tmp_path / "cleaned_sales.csv")
    res = cleaner.apply_and_save({"remove_duplicates": True}, out_file)
    assert os.path.exists(out_file)
    assert res["after_rows"] > 0

def test_report_service_generation(tmp_path):
    profiler = DataProfiler(SAMPLE_CSV)
    profile = profiler.generate_profile()
    rep = ReportService.generate_report("Sample Sales Test", profile)
    assert rep["markdown"] is not None
    assert "Executive Summary" in rep["markdown"]
    assert "Key Metrics" in rep["markdown"]
    assert os.path.exists(rep["html_path"])
