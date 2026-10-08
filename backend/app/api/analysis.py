from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.models.analysis import Analysis
from app.schemas.analysis import (
    AnalysisQueryRequest, AnalysisResponse, CustomVisualizationRequest
)
from app.agents.pipeline import AgentPipeline
from app.agents.sql_validator import SQLValidator
from app.agents.execution_engine import ExecutionEngine
from app.agents.visualization_agent import VisualizationAgent
from app.agents.result_validator import ResultValidator
from app.api.deps import get_current_user

router = APIRouter(prefix="/analysis", tags=["Analysis & Visualizations"])

@router.post("/query")
def run_analysis_query(
    req: AnalysisQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    cols_meta = [
        {"name": c.name, "data_type": c.data_type, "python_type": c.python_type, "sample_values_json": c.sample_values}
        for c in dataset.columns
    ]
    pipeline = AgentPipeline(file_path=dataset.file_path, columns_info=cols_meta)
    res = pipeline.process_query(req.query)

    if res["success"]:
        analysis = Analysis(
            user_id=current_user.id,
            dataset_id=dataset.id,
            query_text=req.query,
            sql_query=res.get("sql_query"),
            result_summary=res.get("insights", {}).get("answer"),
            chart_type=res.get("visualization", {}).get("chart_type"),
            execution_time_ms=res.get("execution_time_ms")
        )
        db.add(analysis)
        db.commit()

    return res

@router.get("/history", response_model=List[AnalysisResponse])
def get_analysis_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analyses = db.query(Analysis).filter(
        Analysis.user_id == current_user.id
    ).order_by(Analysis.created_at.desc()).limit(limit).all()
    return analyses

@router.post("/visualize")
def create_custom_visualization(
    req: CustomVisualizationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Build SQL based on custom builder parameters
    x_col = req.x_column
    y_col = req.y_column
    agg = req.aggregation or "SUM"
    limit = req.limit or 50

    if y_col and agg != "NONE":
        sql = f'SELECT "{x_col}", ROUND({agg}("{y_col}"), 2) AS "{y_col}", COUNT(*) AS count FROM dataset WHERE "{x_col}" IS NOT NULL GROUP BY "{x_col}" ORDER BY "{y_col}" DESC LIMIT {limit};'
    elif y_col:
        sql = f'SELECT "{x_col}", "{y_col}" FROM dataset WHERE "{x_col}" IS NOT NULL AND "{y_col}" IS NOT NULL LIMIT {limit};'
    else:
        sql = f'SELECT "{x_col}", COUNT(*) AS count FROM dataset WHERE "{x_col}" IS NOT NULL GROUP BY "{x_col}" ORDER BY count DESC LIMIT {limit};'

    is_valid, clean_sql, err = SQLValidator.validate_and_sanitize(sql)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid visualization parameters: {err}")

    engine = ExecutionEngine(dataset.file_path)
    exec_res = engine.execute_query(clean_sql)
    if not exec_res["success"]:
        raise HTTPException(status_code=400, detail=f"Query failed: {exec_res['error']}")

    validation_info = ResultValidator.validate(exec_res)
    viz = VisualizationAgent.create_visualization(
        question=req.title,
        columns=exec_res["columns"],
        rows=exec_res["rows"],
        validation_info=validation_info
    )
    # Override user-requested chart type if applicable
    if req.chart_type:
        viz["chart_type"] = req.chart_type

    return {
        "title": req.title,
        "sql_query": clean_sql,
        "visualization": viz,
        "data": exec_res["rows"],
        "columns": exec_res["columns"],
        "execution_time_ms": exec_res["execution_time_ms"]
    }
