from typing import Dict, Any, List, Optional

PALETTE = [
    "#6366F1", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
    "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#06B6D4"
]

class VisualizationAgent:
    """Selects optimal chart type and creates interactive Plotly specifications."""

    @staticmethod
    def create_visualization(
        question: str,
        columns: List[str],
        rows: List[Dict[str, Any]],
        validation_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        if not rows or not columns:
            return {"chart_type": "none", "plotly_spec": None, "recharts_data": []}

        # Single row KPI card
        if validation_info.get("type") == "kpi_card":
            metrics = []
            for col in columns:
                val = rows[0].get(col)
                metrics.append({
                    "label": col.replace("_", " ").title(),
                    "value": val
                })
            return {
                "chart_type": "kpi_card",
                "metrics": metrics,
                "plotly_spec": None,
                "recharts_data": rows
            }

        q_lower = question.lower()
        num_rows = len(rows)

        # Detect types of columns
        first_row = rows[0]
        string_cols = []
        numeric_cols = []
        date_cols = []

        for col in columns:
            val = first_row.get(col)
            if isinstance(val, (int, float)):
                numeric_cols.append(col)
            elif isinstance(val, str):
                if any(w in col.lower() for w in ["date", "month", "year", "time", "day"]):
                    date_cols.append(col)
                else:
                    string_cols.append(col)
            else:
                string_cols.append(col)

        chart_type = "bar"
        x_col = columns[0]
        y_col = numeric_cols[0] if numeric_cols else (columns[1] if len(columns) > 1 else columns[0])

        # Logic for chart type determination:
        if date_cols or "trend" in q_lower or "monthly" in q_lower or "over time" in q_lower:
            chart_type = "line"
            x_col = date_cols[0] if date_cols else columns[0]
        elif "correlation" in q_lower or "scatter" in q_lower or ("relationship" in q_lower and len(numeric_cols) >= 2):
            chart_type = "scatter"
            if len(numeric_cols) >= 2:
                x_col = numeric_cols[0]
                y_col = numeric_cols[1]
        elif ("distribution" in q_lower or "spread" in q_lower or "histogram" in q_lower) and numeric_cols:
            chart_type = "histogram"
            x_col = numeric_cols[0]
        elif ("proportion" in q_lower or "share" in q_lower or "percentage" in q_lower or "pie" in q_lower) and num_rows <= 8:
            chart_type = "pie"
            x_col = string_cols[0] if string_cols else columns[0]
        elif num_rows > 7 and string_cols and ("top" in q_lower or "ranking" in q_lower):
            chart_type = "horizontal_bar"
            x_col = string_cols[0] if string_cols else columns[0]
        elif string_cols and numeric_cols:
            chart_type = "bar"
            x_col = string_cols[0]
            y_col = numeric_cols[0]

        # Build Plotly spec
        title = f"{y_col.replace('_', ' ').title()} by {x_col.replace('_', ' ').title()}" if chart_type not in ["histogram", "scatter"] else question.strip("?")
        
        plotly_data = []
        x_vals = [r.get(x_col) for r in rows]
        y_vals = [r.get(y_col) for r in rows]

        if chart_type == "line":
            plotly_data.append({
                "type": "scatter",
                "mode": "lines+markers",
                "x": x_vals,
                "y": y_vals,
                "name": y_col.replace("_", " ").title(),
                "line": {"color": "#6366F1", "width": 3, "shape": "spline"},
                "marker": {"size": 7, "color": "#4338CA"}
            })
        elif chart_type == "horizontal_bar":
            plotly_data.append({
                "type": "bar",
                "orientation": "h",
                "y": x_vals,
                "x": y_vals,
                "name": y_col.replace("_", " ").title(),
                "marker": {
                    "color": y_vals,
                    "colorscale": "Purples",
                    "line": {"width": 1, "color": "#4F46E5"}
                }
            })
        elif chart_type == "pie":
            plotly_data.append({
                "type": "pie",
                "labels": x_vals,
                "values": y_vals,
                "hole": 0.4,
                "marker": {"colors": PALETTE[:len(x_vals)]},
                "textinfo": "label+percent"
            })
        elif chart_type == "scatter":
            plotly_data.append({
                "type": "scatter",
                "mode": "markers",
                "x": x_vals,
                "y": y_vals,
                "marker": {"size": 9, "color": "#06B6D4", "opacity": 0.8}
            })
        elif chart_type == "histogram":
            plotly_data.append({
                "type": "histogram",
                "x": x_vals,
                "marker": {"color": "#10B981"}
            })
        else: # Bar chart
            plotly_data.append({
                "type": "bar",
                "x": x_vals,
                "y": y_vals,
                "name": y_col.replace("_", " ").title(),
                "marker": {
                    "color": "#6366F1",
                    "line": {"width": 1, "color": "#4F46E5"}
                }
            })

        layout = {
            "title": {"text": title, "font": {"size": 16, "family": "Inter, sans-serif"}},
            "paper_bgcolor": "rgba(0,0,0,0)",
            "plot_bgcolor": "rgba(0,0,0,0)",
            "font": {"color": "#94A3B8", "family": "Inter, sans-serif"},
            "margin": {"l": 50, "r": 30, "t": 50, "b": 60},
            "xaxis": {
                "title": x_col.replace("_", " ").title(),
                "gridcolor": "rgba(148, 163, 184, 0.15)",
                "zeroline": False
            },
            "yaxis": {
                "title": y_col.replace("_", " ").title(),
                "gridcolor": "rgba(148, 163, 184, 0.15)",
                "zeroline": False
            },
            "hovermode": "closest"
        }

        config = {
            "responsive": True,
            "displayModeBar": True,
            "displaylogo": False,
            "toImageButtonOptions": {
                "format": "png",
                "filename": "insight_chart",
                "height": 500,
                "width": 800,
                "scale": 2
            }
        }

        return {
            "chart_type": chart_type,
            "title": title,
            "x_axis": x_col,
            "y_axis": y_col,
            "plotly_spec": {
                "data": plotly_data,
                "layout": layout,
                "config": config
            },
            "recharts_data": rows
        }
