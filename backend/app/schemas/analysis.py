from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AnalysisQueryRequest(BaseModel):
    dataset_id: int
    query: str

class AnalysisResponse(BaseModel):
    id: int
    dataset_id: int
    query_text: str
    sql_query: Optional[str] = None
    result_summary: Optional[str] = None
    chart_type: Optional[str] = None
    execution_time_ms: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CustomVisualizationRequest(BaseModel):
    dataset_id: int
    title: str
    chart_type: str  # bar, line, scatter, pie, histogram
    x_column: str
    y_column: Optional[str] = None
    aggregation: Optional[str] = "SUM"  # SUM, AVG, COUNT, MIN, MAX, NONE
    limit: Optional[int] = 50
