from pydantic import BaseModel

class LeadCreate(BaseModel):
    company_name: str
    contact_person: str
    email: str
    phone: str
    industry: str
    company_size: str
    lead_source: str

class LeadResponse(LeadCreate):
    lead_id: int
    status: str

    class Config:
        from_attributes = True