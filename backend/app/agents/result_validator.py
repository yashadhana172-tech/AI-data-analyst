from typing import Dict, Any

class ResultValidator:
    """Validates query results before visualization and insight generation."""

    @staticmethod
    def validate(exec_result: Dict[str, Any]) -> Dict[str, Any]:
        if not exec_result.get("success", False):
            return {
                "is_valid": False,
                "error": exec_result.get("error", "Unknown execution error"),
                "can_visualize": False,
                "type": "error"
            }

        rows = exec_result.get("rows", [])
        columns = exec_result.get("columns", [])

        if not rows:
            return {
                "is_valid": True,
                "warning": "The query executed successfully but returned 0 rows matching the criteria.",
                "can_visualize": False,
                "type": "empty"
            }

        if len(rows) == 1 and len(columns) <= 4:
            return {
                "is_valid": True,
                "can_visualize": True,
                "type": "kpi_card",
                "row_count": 1,
                "col_count": len(columns)
            }

        return {
            "is_valid": True,
            "can_visualize": True,
            "type": "multi_row",
            "row_count": len(rows),
            "col_count": len(columns)
        }
