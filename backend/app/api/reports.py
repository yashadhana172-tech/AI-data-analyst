import os
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, PlainTextResponse, HTMLResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.models.report import Report
from app.schemas.report import ReportGenerateRequest, ReportResponse
from app.services.report_service import ReportService
from app.api.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("/generate", response_model=ReportResponse)
def generate_report(
    req: ReportGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    profile_data = {}
    if dataset.profile_json:
        try:
            profile_data = json.loads(dataset.profile_json)
        except Exception:
            pass

    report_result = ReportService.generate_report(
        dataset_name=dataset.name,
        profile_data=profile_data
    )

    report_title = req.title or f"Executive Report: {dataset.name}"
    report = Report(
        user_id=current_user.id,
        dataset_id=dataset.id,
        title=report_title,
        summary=f"Automated analysis covering {dataset.row_count:,} rows and {dataset.column_count} dimensions.",
        content_markdown=report_result["markdown"],
        html_path=report_result.get("html_path"),
        pdf_path=report_result.get("pdf_path")
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return report

@router.get("", response_model=List[ReportResponse])
def get_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Report).filter(Report.user_id == current_user.id).order_by(Report.created_at.desc()).all()

@router.get("/{id}", response_model=ReportResponse)
def get_report(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.get("/{id}/download/pdf")
def download_report_pdf(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == id).first()
    if not report or not report.pdf_path or not os.path.exists(report.pdf_path):
        raise HTTPException(status_code=404, detail="PDF report not found or could not be generated")
    
    return FileResponse(
        path=report.pdf_path,
        filename=f"{report.title.replace(' ', '_')}.pdf",
        media_type="application/pdf"
    )

@router.get("/{id}/download/html")
def download_report_html(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == id).first()
    if not report or not report.html_path or not os.path.exists(report.html_path):
        raise HTTPException(status_code=404, detail="HTML report not found")
    
    return FileResponse(
        path=report.html_path,
        filename=f"{report.title.replace(' ', '_')}.html",
        media_type="text/html"
    )

@router.get("/{id}/download/markdown")
def download_report_markdown(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return PlainTextResponse(
        content=report.content_markdown,
        headers={"Content-Disposition": f'attachment; filename="{report.title.replace(" ", "_")}.md"'}
    )
