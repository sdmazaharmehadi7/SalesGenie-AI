from sqlalchemy import Column, Integer, String, TIMESTAMP, text
from app.database import Base

class Lead(Base):
    __tablename__ = "leads"

    lead_id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(100), nullable=False)
    contact_person = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20))
    industry = Column(String(100))
    company_size = Column(String(50))
    lead_source = Column(String(50))
    status = Column(String(50), server_default="New")
    created_at = Column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))