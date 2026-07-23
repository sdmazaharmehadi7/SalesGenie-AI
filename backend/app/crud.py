from sqlalchemy.orm import Session
from app import models, schemas

# Create a new lead
def create_lead(db: Session, lead: schemas.LeadCreate):
    db_lead = models.Lead(**lead.model_dump())
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

# Get all leads
def get_leads(db: Session):
    return db.query(models.Lead).all()

# Get a lead by ID
def get_lead(db: Session, lead_id: int):
    return db.query(models.Lead).filter(models.Lead.lead_id == lead_id).first()

# Delete a lead
def delete_lead(db: Session, lead_id: int):
    lead = db.query(models.Lead).filter(models.Lead.lead_id == lead_id).first()
    if lead:
        db.delete(lead)
        db.commit()
    return lead