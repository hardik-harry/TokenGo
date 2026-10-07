from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class TokenCreate(BaseModel):
    office_id: int
    service_id: int

class TokenQueueStats(BaseModel):
    people_ahead: int
    queue_position: int
    current_queue_length: int

class TokenResponse(BaseModel):
    id: int
    token_number: str
    office_id: int
    service_id: int
    user_id: Optional[int] = None
    status: str
    created_at: datetime
    
    # Aggregated fields dynamically appended
    people_ahead: Optional[int] = None
    queue_position: Optional[int] = None
    current_queue_length: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
