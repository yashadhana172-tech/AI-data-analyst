from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DatasetColumnResponse(BaseModel):
    id: int
    name: str
    data_type: str
    python_type: str
    null_count: int
    unique_count: int
    sample_values: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DatasetResponse(BaseModel):
    id: int
    name: str
    original_filename: str
    file_format: str
    row_count: int
    column_count: int
    file_size_bytes: int
    is_favorite: bool
    is_cleaned: bool
    created_at: datetime
    columns: Optional[List[DatasetColumnResponse]] = None

    model_config = ConfigDict(from_attributes=True)

class DatasetPreviewResponse(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int
    page: int
    page_size: int

class DatasetCleanRequest(BaseModel):
    remove_duplicates: bool = True
    drop_empty_columns: bool = True
    drop_columns: List[str] = []
    numerical_imputation: str = "none"  # none, mean, median, zero
    categorical_imputation: str = "none"  # none, mode, unknown
    drop_rows_with_na: bool = False
    type_conversions: Dict[str, str] = {}
    save_as_new: bool = True
    new_name: Optional[str] = None
