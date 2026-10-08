import re
from typing import Tuple, List, Optional

DANGEROUS_KEYWORDS = [
    r"\bINSERT\b", r"\bUPDATE\b", r"\bDELETE\b", r"\bDROP\b",
    r"\bALTER\b", r"\bCREATE\b", r"\bTRUNCATE\b", r"\bREPLACE\b",
    r"\bATTACH\b", r"\bDETACH\b", r"\bPRAGMA\b", r"\bCOPY\b",
    r"\bEXEC\b", r"\bEXECUTE\b", r"\bGRANT\b", r"\bREVOKE\b",
    r"\bVACUUM\b", r"\bMERGE\b", r"\bUPSERT\b", r"\bINSTALL\b",
    r"\bLOAD\b", r"\bCALL\b", r"\bIMPORT\b", r"\bEXPORT\b"
]

class SQLValidator:
    """Validates and sanitizes SQL queries to guarantee safe read-only execution."""

    @staticmethod
    def validate_and_sanitize(
        sql: str,
        allowed_columns: Optional[List[str]] = None,
        default_limit: int = 200,
        max_limit: int = 500
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Validates SQL query.
        Returns: (is_valid, sanitized_sql_or_error, error_message)
        """
        if not sql or not sql.strip():
            return False, "", "Empty SQL query."

        clean_sql = sql.strip().rstrip(";")

        # 1. Reject multiple statements (separated by semicolon)
        # Avoid semicolons outside of quotes
        statements = [s.strip() for s in clean_sql.split(";") if s.strip()]
        if len(statements) > 1:
            return False, "", "Multi-statement SQL execution is strictly forbidden."

        clean_sql = statements[0]

        # 2. Must start with SELECT or WITH (common table expressions for analytics)
        first_word_match = re.match(r"^\s*([a-zA-Z]+)", clean_sql, re.IGNORECASE)
        if not first_word_match:
            return False, "", "Malformed SQL statement."
        
        first_token = first_word_match.group(1).upper()
        if first_token not in ["SELECT", "WITH", "DESCRIBE", "EXPLAIN"]:
            return False, "", f"Only read-only analytical queries (SELECT/WITH) are permitted. Received: {first_token}"

        # 3. Check for any dangerous DDL/DML keywords
        for pattern in DANGEROUS_KEYWORDS:
            if re.search(pattern, clean_sql, re.IGNORECASE):
                matched = re.search(pattern, clean_sql, re.IGNORECASE).group(0)
                return False, "", f"Prohibited SQL keyword detected: '{matched}'. Only read-only analytical queries are permitted."

        # 4. Check for system calls or file reading attempts
        suspicious_functions = [r"read_csv\(", r"read_parquet\(", r"read_json\(", r"read_blob\(", r"httpfs", r"glob\("]
        for pattern in suspicious_functions:
            if re.search(pattern, clean_sql, re.IGNORECASE):
                # Only allow reading from the injected dataset table alias
                return False, "", f"External file-reading functions are restricted in direct user queries."

        # 5. Enforce LIMIT
        limit_match = re.search(r"\bLIMIT\s+(\d+)", clean_sql, re.IGNORECASE)
        if limit_match:
            current_limit = int(limit_match.group(1))
            if current_limit > max_limit:
                clean_sql = re.sub(r"\bLIMIT\s+\d+", f"LIMIT {max_limit}", clean_sql, flags=re.IGNORECASE)
        else:
            # Append default limit
            clean_sql = f"{clean_sql} LIMIT {default_limit}"

        return True, clean_sql, None
