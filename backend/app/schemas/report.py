from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ReportGenerateRequest(BaseModel):
    dataset_id: int
    title: Optional[str] = None

class ReportResponse(BaseModel):
    id: int
    dataset_id: int
    title: str
    summary: Optional[str] = None
    content_markdown: str
    html_url: Optional[str] = None
    pdf_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
