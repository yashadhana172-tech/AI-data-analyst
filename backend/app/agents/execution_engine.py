import time
import os
import duckdb
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from app.core.logging import logger

class ExecutionEngine:
    """Safe DuckDB analytical execution engine."""

    def __init__(self, file_path: str):
        self.file_path = file_path

    def execute_query(self, sql_query: str, timeout_seconds: float = 10.0) -> Dict[str, Any]:
        """
        Executes a validated read-only SQL query against DuckDB.
        Returns execution statistics, columns, and rows.
        """
        start_time = time.perf_counter()
        con = duckdb.connect(database=":memory:")
        
        try:
            ext = os.path.splitext(self.file_path)[1].lower()
            norm_path = self.file_path.replace("\\", "/")

            # Register dataset table
            if ext == ".csv":
                con.execute(f"CREATE VIEW dataset AS SELECT * FROM read_csv_auto('{norm_path}', normalize_names=True);")
            elif ext in [".xlsx", ".xls"]:
                df = pd.read_excel(self.file_path)
                con.register("dataset", df)
            elif ext == ".parquet":
                con.execute(f"CREATE VIEW dataset AS SELECT * FROM read_parquet('{norm_path}');")
            elif ext == ".json":
                con.execute(f"CREATE VIEW dataset AS SELECT * FROM read_json_auto('{norm_path}');")
            else:
                raise ValueError(f"Unsupported file format: {ext}")

            # Also create an alias for any table name that might have been referenced
            base_name = os.path.splitext(os.path.basename(self.file_path))[0].lower().replace("-", "_").replace(" ", "_")
            if base_name != "dataset":
                con.execute(f"CREATE VIEW {base_name} AS SELECT * FROM dataset;")

            # Execute query
            cursor = con.cursor()
            result_df = cursor.execute(sql_query).df()
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            columns = list(result_df.columns)
            # Replace NaN/inf with None for valid JSON serialization
            sanitized_records = result_df.replace({float("nan"): None, float("inf"): None, float("-inf"): None}).to_dict(orient="records")

            return {
                "success": True,
                "columns": columns,
                "rows": sanitized_records,
                "row_count": len(sanitized_records),
                "execution_time_ms": elapsed_ms,
                "error": None
            }

        except Exception as e:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            error_msg = str(e)
            logger.warning(f"DuckDB Query Execution Error: {error_msg} for SQL: {sql_query}")
            return {
                "success": False,
                "columns": [],
                "rows": [],
                "row_count": 0,
                "execution_time_ms": elapsed_ms,
                "error": error_msg
            }
        finally:
            con.close()
