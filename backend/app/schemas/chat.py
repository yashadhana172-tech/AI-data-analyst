from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ChatRequest(BaseModel):
    conversation_id: Optional[int] = None
    dataset_id: int
    message: str

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    sql_query: Optional[str] = None
    execution_result_json: Optional[str] = None
    chart_config_json: Optional[str] = None
    findings_json: Optional[str] = None
    execution_time_ms: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConversationResponse(BaseModel):
    id: int
    dataset_id: Optional[int] = None
    title: str
    created_at: datetime
    messages: Optional[List[MessageResponse]] = None

    model_config = ConfigDict(from_attributes=True)

class ConversationUpdate(BaseModel):
    title: str
