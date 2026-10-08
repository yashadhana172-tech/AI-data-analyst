import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, BigInteger
from sqlalchemy.orm import relationship
from app.database.session import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_format = Column(String(20), nullable=False)  # csv, xlsx, json, parquet
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    file_size_bytes = Column(BigInteger, default=0)
    profile_json = Column(Text, nullable=True)  # Full profiling summary JSON
    is_favorite = Column(Boolean, default=False)
    is_cleaned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="datasets")
    columns = relationship("DatasetColumn", back_populates="dataset", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="dataset", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="dataset", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="dataset", cascade="all, delete-orphan")
    visualizations = relationship("Visualization", back_populates="dataset", cascade="all, delete-orphan")

class DatasetColumn(Base):
    __tablename__ = "dataset_columns"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    data_type = Column(String(50), nullable=False)
    python_type = Column(String(50), nullable=False)
    null_count = Column(Integer, default=0)
    unique_count = Column(Integer, default=0)
    sample_values = Column(Text, nullable=True)  # JSON string of sample values

    dataset = relationship("Dataset", back_populates="columns")
