import os
import json
import uuid
import shutil
import pandas as pd
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.dataset import Dataset, DatasetColumn
from app.schemas.dataset import (
    DatasetResponse, DatasetPreviewResponse, DatasetCleanRequest
)
from app.analytics.profiler import DataProfiler
from app.analytics.cleaner import DataCleaner
from app.core.config import settings
from app.api.deps import get_current_user
from app.core.logging import logger

router = APIRouter(prefix="/datasets", tags=["Datasets"])

SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".json", ".parquet"}

@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    original_filename = file.filename or "uploaded_data.csv"
    ext = os.path.splitext(original_filename)[1].lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Please upload CSV, Excel (.xlsx, .xls), JSON, or Parquet."
        )

    # Save to disk
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    unique_filename = f"{uuid.uuid4().hex[:8]}_{original_filename}"
    saved_file_path = os.path.join(settings.DATA_DIR, unique_filename)

    try:
        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Check file size limit
    file_size_mb = os.path.getsize(saved_file_path) / (1024 * 1024)
    if file_size_mb > settings.MAX_UPLOAD_SIZE_MB:
        os.remove(saved_file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # Profile dataset
    try:
        profiler = DataProfiler(saved_file_path)
        profile_res = profiler.generate_profile()
    except Exception as e:
        if os.path.exists(saved_file_path):
            os.remove(saved_file_path)
        logger.error(f"Profiling error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The uploaded file does not contain usable tabular data. Error: {str(e)}"
        )

    dataset_name = name or os.path.splitext(original_filename)[0].replace("_", " ").title()

    dataset = Dataset(
        user_id=current_user.id,
        name=dataset_name,
        original_filename=original_filename,
        file_path=saved_file_path,
        file_format=ext.lstrip("."),
        row_count=profile_res["summary"]["row_count"],
        column_count=profile_res["summary"]["column_count"],
        file_size_bytes=profile_res["summary"]["file_size_bytes"],
        profile_json=profile_res["raw_json"],
        is_favorite=False,
        is_cleaned=False
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # Save individual columns
    for col in profile_res["columns"]:
        db_col = DatasetColumn(
            dataset_id=dataset.id,
            name=col["name"],
            data_type=col["data_type"],
            python_type=col["python_type"],
            null_count=col["null_count"],
            unique_count=col["unique_count"],
            sample_values=col.get("sample_values_json", "[]")
        )
        db.add(db_col)
    db.commit()
    db.refresh(dataset)

    return dataset

@router.get("", response_model=List[DatasetResponse])
def get_datasets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Retrieve user's datasets or shared sample datasets
    datasets = db.query(Dataset).filter(
        (Dataset.user_id == current_user.id) | (Dataset.original_filename == "sample_sales.csv")
    ).order_by(Dataset.created_at.desc()).all()
    return datasets

@router.get("/{id}", response_model=DatasetResponse)
def get_dataset(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.delete("/{id}")
def delete_dataset(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Don't delete sample dataset for demo
    if dataset.original_filename == "sample_sales.csv" and not current_user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot delete default sample sales dataset")

    # Remove file from disk if exists
    if os.path.exists(dataset.file_path) and dataset.original_filename != "sample_sales.csv":
        try:
            os.remove(dataset.file_path)
        except Exception:
            pass

    db.delete(dataset)
    db.commit()
    return {"message": "Dataset successfully deleted"}

@router.post("/{id}/favorite")
def toggle_favorite(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dataset.is_favorite = not dataset.is_favorite
    db.commit()
    return {"id": dataset.id, "is_favorite": dataset.is_favorite}

@router.get("/{id}/profile")
def get_dataset_profile(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.profile_json:
        try:
            return json.loads(dataset.profile_json)
        except Exception:
            pass

    # Generate if not cached
    if os.path.exists(dataset.file_path):
        profiler = DataProfiler(dataset.file_path)
        profile_res = profiler.generate_profile()
        dataset.profile_json = profile_res["raw_json"]
        db.commit()
        return profile_res

    raise HTTPException(status_code=404, detail="Dataset file not found on disk")

@router.get("/{id}/preview", response_model=DatasetPreviewResponse)
def get_dataset_preview(
    id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file is missing")

    ext = os.path.splitext(dataset.file_path)[1].lower()
    skip = (page - 1) * page_size

    try:
        if ext == ".csv":
            df = pd.read_csv(dataset.file_path, skiprows=range(1, skip + 1) if skip > 0 else None, nrows=page_size)
            total = dataset.row_count or len(pd.read_csv(dataset.file_path))
        else:
            profiler = DataProfiler(dataset.file_path)
            full_df = profiler.df
            total = len(full_df)
            df = full_df.iloc[skip: skip + page_size]

        sanitized_records = df.replace({float("nan"): None, float("inf"): None, float("-inf"): None}).to_dict(orient="records")

        return {
            "columns": list(df.columns),
            "rows": sanitized_records,
            "total_rows": total,
            "page": page,
            "page_size": page_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview reading failed: {str(e)}")

@router.post("/{id}/clean/preview")
def preview_clean_dataset(
    id: int,
    config: DatasetCleanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    cleaner = DataCleaner(dataset.file_path)
    preview = cleaner.preview_cleaning(config.model_dump())
    return preview

@router.post("/{id}/clean/apply")
def apply_clean_dataset(
    id: int,
    config: DatasetCleanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    cleaner = DataCleaner(dataset.file_path)
    out_filename = f"cleaned_{uuid.uuid4().hex[:6]}_{dataset.original_filename}"
    out_path = os.path.join(settings.DATA_DIR, out_filename)
    
    clean_result = cleaner.apply_and_save(config.model_dump(), out_path)

    # Save as new dataset in DB
    new_name = config.new_name or f"{dataset.name} (Cleaned)"
    profiler = DataProfiler(out_path)
    new_profile = profiler.generate_profile()

    new_dataset = Dataset(
        user_id=current_user.id,
        name=new_name,
        original_filename=out_filename,
        file_path=out_path,
        file_format="csv",
        row_count=new_profile["summary"]["row_count"],
        column_count=new_profile["summary"]["column_count"],
        file_size_bytes=new_profile["summary"]["file_size_bytes"],
        profile_json=new_profile["raw_json"],
        is_favorite=False,
        is_cleaned=True
    )
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)

    for col in new_profile["columns"]:
        db_col = DatasetColumn(
            dataset_id=new_dataset.id,
            name=col["name"],
            data_type=col["data_type"],
            python_type=col["python_type"],
            null_count=col["null_count"],
            unique_count=col["unique_count"],
            sample_values=col.get("sample_values_json", "[]")
        )
        db.add(db_col)
    db.commit()

    return {
        "message": "Dataset cleaned and registered successfully.",
        "cleaned_dataset_id": new_dataset.id,
        "clean_stats": clean_result
    }

@router.get("/{id}/download")
def download_dataset(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == id).first()
    if not dataset or not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
    
    return FileResponse(
        path=dataset.file_path,
        filename=dataset.original_filename,
        media_type="application/octet-stream"
    )
