import time
from typing import Dict, Any, List, Optional
from app.agents.question_understander import QuestionUnderstander
from app.agents.schema_analyzer import SchemaAnalyzer
from app.agents.planner import AnalysisPlanner
from app.agents.sql_generator import SQLGenerator
from app.agents.sql_validator import SQLValidator
from app.agents.execution_engine import ExecutionEngine
from app.agents.result_validator import ResultValidator
from app.agents.visualization_agent import VisualizationAgent
from app.agents.insight_generator import InsightGenerator
from app.core.logging import logger

class AgentPipeline:
    """End-to-End Orchestrator for the 9-stage AI Analyst Pipeline."""

    def __init__(self, file_path: str, columns_info: List[Dict[str, Any]]):
        self.file_path = file_path
        self.columns_info = columns_info
        self.schema_analyzer = SchemaAnalyzer(columns_info)
        self.execution_engine = ExecutionEngine(file_path)

    def process_query(self, question: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        overall_start = time.perf_counter()

        # Step 1: Question Understanding Agent
        understanding = QuestionUnderstander.analyze(question)

        # Step 2: Analysis Planner
        plan = AnalysisPlanner.create_plan(understanding, self.schema_analyzer)

        # Step 3: SQL Generator
        sql_gen = SQLGenerator(self.schema_analyzer)
        raw_sql = sql_gen.generate(question, plan, conversation_history)

        # Step 4: Code / Query Validator
        is_valid, validated_sql, val_error = SQLValidator.validate_and_sanitize(raw_sql)
        if not is_valid:
            return {
                "success": False,
                "error": f"Query validation rejected: {val_error}",
                "sql_query": raw_sql,
                "execution_time_ms": round((time.perf_counter() - overall_start) * 1000, 2)
            }

        # Step 5: Execution Engine (with 1 self-correction retry if needed)
        exec_res = self.execution_engine.execute_query(validated_sql)
        if not exec_res["success"]:
            # Self-correction retry
            logger.info(f"Query failed: {exec_res['error']}. Attempting automatic self-correction...")
            # Fallback to standard grouping query from plan
            retry_sql = sql_gen._generate_deterministic(question, plan)
            _, retry_validated, _ = SQLValidator.validate_and_sanitize(retry_sql)
            exec_res = self.execution_engine.execute_query(retry_validated)
            if exec_res["success"]:
                validated_sql = retry_validated

        if not exec_res["success"]:
            return {
                "success": False,
                "error": f"Execution error: {exec_res['error']}",
                "sql_query": validated_sql,
                "execution_time_ms": round((time.perf_counter() - overall_start) * 1000, 2)
            }

        # Step 6: Result Validator
        validation_info = ResultValidator.validate(exec_res)

        # Step 7: Visualization Agent
        viz_data = VisualizationAgent.create_visualization(
            question=question,
            columns=exec_res["columns"],
            rows=exec_res["rows"],
            validation_info=validation_info
        )

        # Step 8: Insight Generator
        insights = InsightGenerator.generate_insights(
            question=question,
            columns=exec_res["columns"],
            rows=exec_res["rows"],
            sql_query=validated_sql
        )

        total_elapsed = round((time.perf_counter() - overall_start) * 1000, 2)

        return {
            "success": True,
            "question": question,
            "sql_query": validated_sql,
            "columns": exec_res["columns"],
            "rows": exec_res["rows"],
            "row_count": exec_res["row_count"],
            "visualization": viz_data,
            "insights": insights,
            "execution_time_ms": total_elapsed,
            "query_time_ms": exec_res["execution_time_ms"]
        }
