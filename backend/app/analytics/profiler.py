import os
import json
import math
import numpy as np
import pandas as pd
import duckdb
from typing import Dict, Any, List, Optional

class DataProfiler:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.df: Optional[pd.DataFrame] = None
        self._load_data()

    def _load_data(self):
        ext = os.path.splitext(self.file_path)[1].lower()
        if ext == ".csv":
            self.df = pd.read_csv(self.file_path)
        elif ext in [".xlsx", ".xls"]:
            self.df = pd.read_excel(self.file_path)
        elif ext == ".json":
            self.df = pd.read_json(self.file_path)
        elif ext == ".parquet":
            self.df = pd.read_parquet(self.file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def generate_profile(self) -> Dict[str, Any]:
        if self.df is None:
            raise ValueError("No dataset loaded")

        df = self.df
        total_rows = int(len(df))
        total_cols = int(len(df.columns))
        file_size_bytes = os.path.getsize(self.file_path) if os.path.exists(self.file_path) else 0
        memory_usage_bytes = int(df.memory_usage(deep=True).sum())

        # Duplicate Rows
        duplicate_count = int(df.duplicated().sum())
        duplicate_percentage = round((duplicate_count / total_rows * 100), 2) if total_rows > 0 else 0.0

        # Classification of columns
        numeric_cols = []
        categorical_cols = []
        date_cols = []
        boolean_cols = []

        columns_meta = []
        column_summaries = {}
        missing_report = {}
        outlier_report = {}

        total_cells = total_rows * total_cols
        total_missing_cells = 0

        for col in df.columns:
            s = df[col]
            null_count = int(s.isna().sum())
            total_missing_cells += null_count
            null_pct = round((null_count / total_rows * 100), 2) if total_rows > 0 else 0.0
            unique_count = int(s.nunique(dropna=True))

            # Sample values for schema inspection
            sample_vals = [str(v) for v in s.dropna().head(5).tolist()]

            col_info = {
                "name": str(col),
                "null_count": null_count,
                "null_percentage": null_pct,
                "unique_count": unique_count,
                "sample_values_json": json.dumps(sample_vals)
            }

            # Check if datetime
            is_date = False
            if pd.api.types.is_datetime64_any_dtype(s):
                is_date = True
            elif s.dtype == object and total_rows > 0:
                # heuristic date check on non-null samples
                non_nulls = s.dropna().astype(str).head(15)
                if len(non_nulls) > 0 and ("date" in str(col).lower() or "time" in str(col).lower()):
                    try:
                        pd.to_datetime(non_nulls)
                        is_date = True
                    except Exception:
                        pass

            if is_date:
                date_cols.append(col)
                col_info["data_type"] = "DATETIME"
                col_info["python_type"] = "datetime"
                try:
                    dt_series = pd.to_datetime(s.dropna())
                    min_dt = str(dt_series.min()) if not dt_series.empty else None
                    max_dt = str(dt_series.max()) if not dt_series.empty else None
                    span_days = int((dt_series.max() - dt_series.min()).days) if not dt_series.empty else 0
                except Exception:
                    min_dt, max_dt, span_days = None, None, 0

                column_summaries[col] = {
                    "type": "date",
                    "min": min_dt,
                    "max": max_dt,
                    "span_days": span_days,
                    "unique_dates": unique_count
                }

            elif pd.api.types.is_bool_dtype(s):
                boolean_cols.append(col)
                col_info["data_type"] = "BOOLEAN"
                col_info["python_type"] = "bool"
                val_counts = s.value_counts(dropna=False).to_dict()
                column_summaries[col] = {
                    "type": "boolean",
                    "true_count": int(val_counts.get(True, 0)),
                    "false_count": int(val_counts.get(False, 0))
                }

            elif pd.api.types.is_numeric_dtype(s):
                numeric_cols.append(col)
                col_info["data_type"] = "INTEGER" if pd.api.types.is_integer_dtype(s) else "FLOAT"
                col_info["python_type"] = "int" if pd.api.types.is_integer_dtype(s) else "float"

                valid_s = s.dropna()
                if len(valid_s) > 0:
                    q1 = float(valid_s.quantile(0.25))
                    median_val = float(valid_s.median())
                    q3 = float(valid_s.quantile(0.75))
                    iqr = q3 - q1
                    lower_bound = q1 - 1.5 * iqr
                    upper_bound = q3 + 1.5 * iqr
                    outliers_mask = (valid_s < lower_bound) | (valid_s > upper_bound)
                    num_outliers = int(outliers_mask.sum())
                    
                    mean_val = float(valid_s.mean())
                    std_val = float(valid_s.std()) if len(valid_s) > 1 else 0.0

                    column_summaries[col] = {
                        "type": "numeric",
                        "count": int(valid_s.count()),
                        "mean": round(mean_val, 4) if not math.isnan(mean_val) else 0.0,
                        "std": round(std_val, 4) if not math.isnan(std_val) else 0.0,
                        "min": float(valid_s.min()),
                        "q25": round(q1, 4),
                        "median": round(median_val, 4),
                        "q75": round(q3, 4),
                        "max": float(valid_s.max()),
                        "outlier_count": num_outliers,
                        "skewness": round(float(valid_s.skew()), 4) if len(valid_s) > 2 else 0.0
                    }

                    if num_outliers > 0:
                        outlier_report[col] = {
                            "outlier_count": num_outliers,
                            "percentage": round(num_outliers / len(valid_s) * 100, 2),
                            "lower_bound": round(lower_bound, 2),
                            "upper_bound": round(upper_bound, 2)
                        }
                else:
                    column_summaries[col] = {
                        "type": "numeric",
                        "count": 0, "mean": 0, "std": 0, "min": 0, "q25": 0,
                        "median": 0, "q75": 0, "max": 0, "outlier_count": 0, "skewness": 0
                    }

            else:
                categorical_cols.append(col)
                col_info["data_type"] = "VARCHAR"
                col_info["python_type"] = "str"

                # top 5 frequent
                vc = s.value_counts(dropna=True).head(5)
                top_values = []
                for val, count in vc.items():
                    top_values.append({
                        "value": str(val),
                        "count": int(count),
                        "percentage": round(int(count) / total_rows * 100, 2) if total_rows > 0 else 0.0
                    })

                column_summaries[col] = {
                    "type": "categorical",
                    "unique_count": unique_count,
                    "top_value": str(vc.index[0]) if len(vc) > 0 else None,
                    "top_frequency": int(vc.iloc[0]) if len(vc) > 0 else 0,
                    "top_distribution": top_values
                }

            if null_count > 0:
                missing_report[col] = {
                    "null_count": null_count,
                    "null_percentage": null_pct
                }

            columns_meta.append(col_info)

        # Correlation Matrix for Numeric Columns
        correlation_matrix = {}
        if len(numeric_cols) >= 2:
            try:
                corr_df = df[numeric_cols].corr().fillna(0)
                for col_a in corr_df.columns:
                    correlation_matrix[col_a] = {}
                    for col_b in corr_df.columns:
                        val = corr_df.loc[col_a, col_b]
                        correlation_matrix[col_a][col_b] = round(float(val), 4) if not math.isnan(val) else 0.0
            except Exception:
                correlation_matrix = {}

        # Data Quality Score (0 to 100)
        overall_missing_pct = round((total_missing_cells / total_cells * 100), 2) if total_cells > 0 else 0.0
        missing_penalty = min(overall_missing_pct * 1.5, 40.0)
        duplicate_penalty = min(duplicate_percentage * 2.0, 30.0)
        outlier_penalty = min(len(outlier_report) * 2.0, 15.0)
        quality_score = max(0, round(100.0 - missing_penalty - duplicate_penalty - outlier_penalty, 1))

        profile_summary = {
            "row_count": total_rows,
            "column_count": total_cols,
            "file_size_bytes": file_size_bytes,
            "memory_usage_bytes": memory_usage_bytes,
            "duplicate_count": duplicate_count,
            "duplicate_percentage": duplicate_percentage,
            "missing_cells_total": total_missing_cells,
            "missing_cells_percentage": overall_missing_pct,
            "quality_score": quality_score,
            "column_types": {
                "numeric": numeric_cols,
                "categorical": categorical_cols,
                "datetime": date_cols,
                "boolean": boolean_cols
            }
        }

        full_profile = {
            "summary": profile_summary,
            "columns": columns_meta,
            "column_summaries": column_summaries,
            "missing_report": missing_report,
            "outlier_report": outlier_report,
            "correlation_matrix": correlation_matrix
        }

        full_profile["raw_json"] = json.dumps(full_profile)
        return full_profile
