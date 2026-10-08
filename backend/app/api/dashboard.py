from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.models.analysis import Analysis
from app.models.conversation import Conversation, Message
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Total datasets
    total_datasets = db.query(Dataset).filter(
        (Dataset.user_id == current_user.id) | (Dataset.original_filename == "sample_sales.csv")
    ).count()

    # Total rows analyzed
    total_rows = db.query(func.sum(Dataset.row_count)).filter(
        (Dataset.user_id == current_user.id) | (Dataset.original_filename == "sample_sales.csv")
    ).scalar() or 0

    # Total columns
    total_columns = db.query(func.sum(Dataset.column_count)).filter(
        (Dataset.user_id == current_user.id) | (Dataset.original_filename == "sample_sales.csv")
    ).scalar() or 0

    # Favorite datasets
    favorites = db.query(Dataset).filter(
        ((Dataset.user_id == current_user.id) | (Dataset.original_filename == "sample_sales.csv")),
        Dataset.is_favorite == True
    ).all()

    # Recent analyses
    recent_analyses = db.query(Analysis).filter(
        Analysis.user_id == current_user.id
    ).order_by(Analysis.created_at.desc()).limit(5).all()

    # Recent questions from conversations
    recent_messages = db.query(Message).join(Conversation).filter(
        Conversation.user_id == current_user.id,
        Message.role == "user"
    ).order_by(Message.created_at.desc()).limit(6).all()

    recent_questions = [m.content for m in recent_messages]

    return {
        "total_datasets": total_datasets,
        "total_rows_analyzed": int(total_rows),
        "total_columns": int(total_columns),
        "favorite_datasets": [
            {"id": d.id, "name": d.name, "rows": d.row_count, "format": d.file_format}
            for d in favorites
        ],
        "recent_analyses": [
            {
                "id": a.id,
                "dataset_id": a.dataset_id,
                "query": a.query_text,
                "summary": a.result_summary,
                "chart_type": a.chart_type,
                "created_at": a.created_at
            }
            for a in recent_analyses
        ],
        "recent_questions": recent_questions,
        "demo_questions": [
            "What are the top 10 products by revenue?",
            "Which region generates the highest profit?",
            "Show monthly revenue trends.",
            "What is the average order value?",
            "Which category has the highest sales?",
            "Find unusual sales transactions.",
            "Show correlation between discount and profit.",
            "Which customers have generated the most revenue?",
            "Compare revenue by region.",
            "What is the total profit by product category?"
        ]
    }
