from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import crud, schemas

router = APIRouter(
    prefix="/leads",
    tags=["Leads"]
)

@router.post("/")
def create(lead: schemas.LeadCreate, db: Session = Depends(get_db)):
    return crud.create_lead(db, lead)

@router.get("/")
def read_all(db: Session = Depends(get_db)):
    return crud.get_leads(db)

@router.get("/{lead_id}")
def read_one(lead_id: int, db: Session = Depends(get_db)):
    return crud.get_lead(db, lead_id)

@router.delete("/{lead_id}")
def delete(lead_id: int, db: Session = Depends(get_db)):
    return crud.delete_lead(db, lead_id)