from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class ServiceResponse(BaseModel):
    id: int
    name: str # Mapping to service name
    code: str
    description: Optional[str] = None
    baseline_service_minutes: int # Mapping to baseline service time
    status: str # Maps to current availability (e.g., active, unavailable)

    model_config = ConfigDict(from_attributes=True)

class OfficeResponse(BaseModel):
    id: int
    name: str
    city: str
    address: Optional[str] = None
    opening_time: str
    closing_time: str
    status: str

    model_config = ConfigDict(from_attributes=True)

class OfficeListResponse(BaseModel):
    offices: List[OfficeResponse]
