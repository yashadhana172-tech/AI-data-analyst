import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class Visualization(Base):
    __tablename__ = "visualizations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    chart_type = Column(String(50), nullable=False)  # bar, line, scatter, pie, heatmap, histogram, etc.
    config_json = Column(Text, nullable=False)  # chart options, x, y, series, plotly spec
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="visualizations")
    dataset = relationship("Dataset", back_populates="visualizations")
