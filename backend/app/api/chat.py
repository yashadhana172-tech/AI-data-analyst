import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.models.conversation import Conversation, Message
from app.models.analysis import Analysis
from app.schemas.chat import (
    ChatRequest, ConversationResponse, MessageResponse, ConversationUpdate
)
from app.agents.pipeline import AgentPipeline
from app.api.deps import get_current_user

router = APIRouter(prefix="", tags=["AI Data Analyst Chat"])

@router.post("/chat")
def chat_with_analyst(
    chat_in: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == chat_in.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Selected dataset not found.")

    # Get or create conversation
    conv = None
    if chat_in.conversation_id:
        conv = db.query(Conversation).filter(
            Conversation.id == chat_in.conversation_id,
            Conversation.user_id == current_user.id
        ).first()

    if not conv:
        short_title = chat_in.message[:40] + ("..." if len(chat_in.message) > 40 else "")
        conv = Conversation(
            user_id=current_user.id,
            dataset_id=dataset.id,
            title=short_title
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Load recent conversation history for multi-turn context
    history_messages = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.asc()).all()
    context_msgs = []
    for m in history_messages[-6:]:
        context_msgs.append({"role": m.role, "content": m.content})

    # Prepare columns metadata
    cols_meta = [
        {
            "name": c.name,
            "data_type": c.data_type,
            "python_type": c.python_type,
            "sample_values_json": c.sample_values
        }
        for c in dataset.columns
    ]

    # Save user message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=chat_in.message
    )
    db.add(user_msg)
    db.commit()

    # Run AI Agent Pipeline
    pipeline = AgentPipeline(file_path=dataset.file_path, columns_info=cols_meta)
    agent_res = pipeline.process_query(chat_in.message, conversation_history=context_msgs)

    if not agent_res["success"]:
        # Handle graceful error message
        assistant_content = f"I couldn't complete that analysis on this dataset: {agent_res.get('error', 'Query error')}."
        assistant_msg = Message(
            conversation_id=conv.id,
            role="assistant",
            content=assistant_content,
            sql_query=agent_res.get("sql_query"),
            execution_time_ms=agent_res.get("execution_time_ms", 0.0)
        )
        db.add(assistant_msg)
        db.commit()
        db.refresh(assistant_msg)

        return {
            "conversation_id": conv.id,
            "message_id": assistant_msg.id,
            "role": "assistant",
            "content": assistant_content,
            "sql_query": agent_res.get("sql_query"),
            "success": False,
            "error": agent_res.get("error")
        }

    insights = agent_res.get("insights", {})
    assistant_content = insights.get("answer", "Here are the analytical results based on your dataset.")
    viz = agent_res.get("visualization", {})

    assistant_msg = Message(
        conversation_id=conv.id,
        role="assistant",
        content=assistant_content,
        sql_query=agent_res.get("sql_query"),
        execution_result_json=json.dumps({
            "columns": agent_res.get("columns", []),
            "rows": agent_res.get("rows", [])
        }),
        chart_config_json=json.dumps(viz),
        findings_json=json.dumps(insights),
        execution_time_ms=agent_res.get("execution_time_ms")
    )
    db.add(assistant_msg)

    # Log into Analysis history
    analysis_record = Analysis(
        user_id=current_user.id,
        dataset_id=dataset.id,
        query_text=chat_in.message,
        sql_query=agent_res.get("sql_query"),
        result_summary=assistant_content,
        chart_type=viz.get("chart_type"),
        execution_time_ms=agent_res.get("execution_time_ms")
    )
    db.add(analysis_record)
    db.commit()
    db.refresh(assistant_msg)

    return {
        "conversation_id": conv.id,
        "message_id": assistant_msg.id,
        "role": "assistant",
        "answer": assistant_content,
        "sql_query": agent_res.get("sql_query"),
        "key_findings": insights.get("key_findings", []),
        "business_insights": insights.get("business_insights", ""),
        "recommendations": insights.get("recommendations", []),
        "limitations": insights.get("limitations", ""),
        "follow_up_questions": insights.get("follow_up_questions", []),
        "visualization": viz,
        "table_data": {
            "columns": agent_res.get("columns", []),
            "rows": agent_res.get("rows", []),
            "total_rows": agent_res.get("row_count", 0)
        },
        "execution_time_ms": agent_res.get("execution_time_ms"),
        "created_at": assistant_msg.created_at
    }

@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(
    dataset_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Conversation).filter(Conversation.user_id == current_user.id)
    if dataset_id:
        query = query.filter(Conversation.dataset_id == dataset_id)
    return query.order_by(Conversation.updated_at.desc()).all()

@router.get("/conversations/{id}", response_model=ConversationResponse)
def get_conversation(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(
        Conversation.id == id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@router.put("/conversations/{id}")
def update_conversation(
    id: int,
    update_in: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(
        Conversation.id == id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.title = update_in.title
    db.commit()
    return {"id": conv.id, "title": conv.title}

@router.delete("/conversations/{id}")
def delete_conversation(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(
        Conversation.id == id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"message": "Conversation successfully deleted"}
