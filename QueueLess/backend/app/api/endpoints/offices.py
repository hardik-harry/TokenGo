from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.models import Office, Service, OfficeService
from app.schemas.office import OfficeResponse, ServiceResponse, OfficeListResponse

router = APIRouter()

@router.get("", response_model=List[OfficeResponse])
def get_offices(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Retrieve all available offices.
    """
    offices = db.query(Office).offset(skip).limit(limit).all()
    return offices

@router.get("/{office_id}", response_model=OfficeResponse)
def get_office_by_id(
    office_id: int,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Retrieve a specific office by ID.
    """
    office = db.query(Office).filter(Office.id == office_id).first()
    if not office:
        raise HTTPException(status_code=404, detail="Office not found")
    return office

@router.get("/{office_id}/services", response_model=List[ServiceResponse])
def get_office_services(
    office_id: int,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Retrieve all services associated with a particular office.
    """
    # Verify office exists
    office = db.query(Office).filter(Office.id == office_id).first()
    if not office:
        raise HTTPException(status_code=404, detail="Office not found")
        
    # Join queries mapping active services provided by the spec's OfficeService model
    office_services = (
        db.query(Service)
        .join(OfficeService, OfficeService.service_id == Service.id)
        .filter(OfficeService.office_id == office_id)
        .filter(Service.status == "active")
        .all()
    )
    
    return office_services
