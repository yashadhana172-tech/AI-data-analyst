import os
from sqlalchemy.orm import Session
from app.database.session import Base, engine, SessionLocal
from app.models.user import User
from app.models.dataset import Dataset, DatasetColumn
from app.core.security import get_password_hash
from app.core.config import settings
from app.core.logging import logger

def init_db(db: Session = None):
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Check if demo user exists
        demo_user = db.query(User).filter(User.email == "demo@insightai.com").first()
        if not demo_user:
            demo_user = User(
                email="demo@insightai.com",
                username="demouser",
                hashed_password=get_password_hash("demo123456"),
                full_name="Alex Data Analyst",
                is_active=True,
                is_admin=True
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            logger.info("Demo user created: demo@insightai.com (password: demo123456)")
            
        # Check if sample sales dataset is loaded
        sample_path = os.path.join(settings.DATA_DIR, "sample_sales.csv")
        if os.path.exists(sample_path):
            existing_ds = db.query(Dataset).filter(Dataset.original_filename == "sample_sales.csv").first()
            if not existing_ds:
                # We can load profiling and register it
                from app.analytics.profiler import DataProfiler
                try:
                    profiler = DataProfiler(sample_path)
                    profile_res = profiler.generate_profile()
                    
                    dataset = Dataset(
                        user_id=demo_user.id,
                        name="Sample E-Commerce Sales",
                        original_filename="sample_sales.csv",
                        file_path=sample_path,
                        file_format="csv",
                        row_count=profile_res["summary"]["row_count"],
                        column_count=profile_res["summary"]["column_count"],
                        file_size_bytes=profile_res["summary"]["file_size_bytes"],
                        profile_json=profile_res["raw_json"],
                        is_favorite=True,
                        is_cleaned=False
                    )
                    db.add(dataset)
                    db.commit()
                    db.refresh(dataset)

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
                    logger.info("Auto-registered sample_sales.csv dataset for demo user")
                except Exception as e:
                    logger.error(f"Failed to auto-register sample dataset: {e}")
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    init_db()
