import re
from typing import Dict, Any, List, Optional

class SchemaAnalyzer:
    """Analyzes dataset schema and matches user keywords with dataset columns."""

    SYNONYM_MAP = {
        "sales": ["revenue", "sales", "total_amount", "amount", "order_amount"],
        "revenue": ["revenue", "sales", "total_sales", "amount", "income"],
        "profit": ["profit", "net_profit", "margin", "earnings"],
        "product": ["product_name", "product", "item", "item_name", "sku"],
        "customer": ["customer_name", "customer", "client", "customer_id", "user"],
        "region": ["region", "country", "territory", "city", "state", "area", "zone"],
        "category": ["category", "segment", "department", "type", "genre"],
        "date": ["order_date", "date", "created_at", "timestamp", "datetime"],
        "quantity": ["quantity", "qty", "volume", "units", "count"],
        "cost": ["cost", "expense", "cogs", "total_cost"],
        "discount": ["discount", "rebate", "discount_amount"],
        "order": ["order_id", "order_number", "id", "transaction_id"]
    }

    def __init__(self, columns_info: List[Dict[str, Any]]):
        self.columns_info = columns_info
        self.column_names = [c["name"] for c in columns_info]
        self.normalized_cols = {c["name"].lower().replace(" ", "_"): c for c in columns_info}

    def find_matching_column(self, term: str) -> Optional[str]:
        """Finds closest matching column name for a given term or synonym."""
        term_clean = term.lower().strip().replace(" ", "_")
        
        # 1. Exact match
        for col_name in self.column_names:
            if col_name.lower().replace(" ", "_") == term_clean:
                return col_name

        # 2. Substring match
        for col_name in self.column_names:
            c_clean = col_name.lower().replace(" ", "_")
            if term_clean in c_clean or c_clean in term_clean:
                return col_name

        # 3. Synonym match
        if term_clean in self.SYNONYM_MAP:
            synonyms = self.SYNONYM_MAP[term_clean]
            for syn in synonyms:
                for col_name in self.column_names:
                    if syn in col_name.lower().replace(" ", "_"):
                        return col_name

        # Reverse synonym check
        for syn_key, syn_list in self.SYNONYM_MAP.items():
            if any(s in term_clean for s in syn_list):
                for candidate in syn_list:
                    for col_name in self.column_names:
                        if candidate in col_name.lower().replace(" ", "_"):
                            return col_name

        return None

    def get_dimension_columns(self) -> List[str]:
        """Returns string/categorical/date columns."""
        dims = []
        for c in self.columns_info:
            ptype = c.get("python_type", "")
            dtype = c.get("data_type", "")
            if ptype in ["str", "object"] or "VARCHAR" in dtype or "TEXT" in dtype:
                dims.append(c["name"])
        return dims

    def get_metric_columns(self) -> List[str]:
        """Returns numeric columns."""
        metrics = []
        for c in self.columns_info:
            ptype = c.get("python_type", "")
            dtype = c.get("data_type", "")
            if ptype in ["int", "float"] or any(t in dtype for t in ["INT", "FLOAT", "DOUBLE", "DECIMAL"]):
                metrics.append(c["name"])
        return metrics

    def get_date_columns(self) -> List[str]:
        """Returns date/time columns."""
        dates = []
        for c in self.columns_info:
            ptype = c.get("python_type", "")
            dtype = c.get("data_type", "")
            name_lower = c["name"].lower()
            if ptype == "datetime" or "DATE" in dtype or "TIME" in dtype or "date" in name_lower:
                dates.append(c["name"])
        return dates
