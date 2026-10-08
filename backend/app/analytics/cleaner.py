import os
import json
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional

class DataCleaner:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.df = self._load()

    def _load(self) -> pd.DataFrame:
        ext = os.path.splitext(self.file_path)[1].lower()
        if ext == ".csv":
            return pd.read_csv(self.file_path)
        elif ext in [".xlsx", ".xls"]:
            return pd.read_excel(self.file_path)
        elif ext == ".json":
            return pd.read_json(self.file_path)
        elif ext == ".parquet":
            return pd.read_parquet(self.file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def preview_cleaning(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Preview operations on a copy of data without persisting."""
        df_clean = self.df.copy()
        before_rows = len(df_clean)
        before_cols = len(df_clean.columns)
        changes_applied = []

        # 1. Remove duplicates
        if config.get("remove_duplicates", False):
            dups = df_clean.duplicated().sum()
            if dups > 0:
                df_clean = df_clean.drop_duplicates()
                changes_applied.append(f"Removed {dups} duplicate rows.")

        # 2. Drop empty / all-null columns
        if config.get("drop_empty_columns", False):
            empty_cols = [c for c in df_clean.columns if df_clean[c].isna().all()]
            if empty_cols:
                df_clean = df_clean.drop(columns=empty_cols)
                changes_applied.append(f"Dropped {len(empty_cols)} completely empty columns: {', '.join(empty_cols)}")

        # 3. Drop specific columns
        cols_to_drop = config.get("drop_columns", [])
        valid_drops = [c for c in cols_to_drop if c in df_clean.columns]
        if valid_drops:
            df_clean = df_clean.drop(columns=valid_drops)
            changes_applied.append(f"Dropped columns: {', '.join(valid_drops)}")

        # 4. Handle missing numerical values
        num_strategy = config.get("numerical_imputation", "none")  # none, mean, median, zero
        if num_strategy != "none":
            for col in df_clean.select_dtypes(include=[np.number]).columns:
                null_c = df_clean[col].isna().sum()
                if null_c > 0:
                    if num_strategy == "mean":
                        val = df_clean[col].mean()
                        df_clean[col] = df_clean[col].fillna(val)
                        changes_applied.append(f"Filled {null_c} missing values in '{col}' with mean ({round(val, 2)})")
                    elif num_strategy == "median":
                        val = df_clean[col].median()
                        df_clean[col] = df_clean[col].fillna(val)
                        changes_applied.append(f"Filled {null_c} missing values in '{col}' with median ({round(val, 2)})")
                    elif num_strategy == "zero":
                        df_clean[col] = df_clean[col].fillna(0)
                        changes_applied.append(f"Filled {null_c} missing values in '{col}' with 0")

        # 5. Handle missing categorical values
        cat_strategy = config.get("categorical_imputation", "none")  # none, mode, unknown
        if cat_strategy != "none":
            for col in df_clean.select_dtypes(include=["object", "category"]).columns:
                null_c = df_clean[col].isna().sum()
                if null_c > 0:
                    if cat_strategy == "mode":
                        mode_s = df_clean[col].mode()
                        if not mode_s.empty:
                            val = mode_s[0]
                            df_clean[col] = df_clean[col].fillna(val)
                            changes_applied.append(f"Filled {null_c} missing values in '{col}' with mode ('{val}')")
                    elif cat_strategy == "unknown":
                        df_clean[col] = df_clean[col].fillna("Unknown")
                        changes_applied.append(f"Filled {null_c} missing values in '{col}' with 'Unknown'")

        # 6. Drop remaining rows with any missing values if requested
        if config.get("drop_rows_with_na", False):
            na_rows = df_clean.isna().any(axis=1).sum()
            if na_rows > 0:
                df_clean = df_clean.dropna()
                changes_applied.append(f"Dropped {na_rows} rows containing missing values.")

        # 7. Convert types
        type_conversions = config.get("type_conversions", {})
        for col, target_type in type_conversions.items():
            if col in df_clean.columns:
                try:
                    if target_type == "numeric":
                        df_clean[col] = pd.to_numeric(df_clean[col], errors="coerce")
                        changes_applied.append(f"Converted '{col}' to numeric")
                    elif target_type == "datetime":
                        df_clean[col] = pd.to_datetime(df_clean[col], errors="coerce")
                        changes_applied.append(f"Converted '{col}' to datetime")
                    elif target_type == "string":
                        df_clean[col] = df_clean[col].astype(str)
                        changes_applied.append(f"Converted '{col}' to string")
                except Exception as e:
                    changes_applied.append(f"Could not convert '{col}' to {target_type}: {str(e)}")

        after_rows = len(df_clean)
        after_cols = len(df_clean.columns)

        preview_records = df_clean.head(10).replace({np.nan: None}).to_dict(orient="records")

        return {
            "before_rows": before_rows,
            "before_columns": before_cols,
            "after_rows": after_rows,
            "after_columns": after_cols,
            "rows_removed": before_rows - after_rows,
            "columns_removed": before_cols - after_cols,
            "changes_applied": changes_applied if changes_applied else ["No transformations specified or needed."],
            "preview_data": preview_records
        }

    def apply_and_save(self, config: Dict[str, Any], output_path: str) -> Dict[str, Any]:
        """Apply transformations and save to a new file."""
        preview_res = self.preview_cleaning(config)
        df_clean = self.df.copy()

        if config.get("remove_duplicates", False):
            df_clean = df_clean.drop_duplicates()

        if config.get("drop_empty_columns", False):
            empty_cols = [c for c in df_clean.columns if df_clean[c].isna().all()]
            if empty_cols:
                df_clean = df_clean.drop(columns=empty_cols)

        cols_to_drop = config.get("drop_columns", [])
        valid_drops = [c for c in cols_to_drop if c in df_clean.columns]
        if valid_drops:
            df_clean = df_clean.drop(columns=valid_drops)

        num_strategy = config.get("numerical_imputation", "none")
        if num_strategy != "none":
            for col in df_clean.select_dtypes(include=[np.number]).columns:
                if df_clean[col].isna().sum() > 0:
                    if num_strategy == "mean":
                        df_clean[col] = df_clean[col].fillna(df_clean[col].mean())
                    elif num_strategy == "median":
                        df_clean[col] = df_clean[col].fillna(df_clean[col].median())
                    elif num_strategy == "zero":
                        df_clean[col] = df_clean[col].fillna(0)

        cat_strategy = config.get("categorical_imputation", "none")
        if cat_strategy != "none":
            for col in df_clean.select_dtypes(include=["object", "category"]).columns:
                if df_clean[col].isna().sum() > 0:
                    if cat_strategy == "mode":
                        mode_s = df_clean[col].mode()
                        if not mode_s.empty:
                            df_clean[col] = df_clean[col].fillna(mode_s[0])
                    elif cat_strategy == "unknown":
                        df_clean[col] = df_clean[col].fillna("Unknown")

        if config.get("drop_rows_with_na", False):
            df_clean = df_clean.dropna()

        for col, target_type in config.get("type_conversions", {}).items():
            if col in df_clean.columns:
                try:
                    if target_type == "numeric":
                        df_clean[col] = pd.to_numeric(df_clean[col], errors="coerce")
                    elif target_type == "datetime":
                        df_clean[col] = pd.to_datetime(df_clean[col], errors="coerce")
                    elif target_type == "string":
                        df_clean[col] = df_clean[col].astype(str)
                except Exception:
                    pass

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df_clean.to_csv(output_path, index=False)

        preview_res["output_path"] = output_path
        return preview_res
