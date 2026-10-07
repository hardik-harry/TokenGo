from pydantic import BaseModel
from typing import Optional

class WaitTimeRequest(BaseModel):
    office_id: int
    service_id: int
    token_id: Optional[int] = None
    people_ahead: Optional[int] = None
    queue_length: Optional[int] = None
    active_counters: Optional[int] = None
    historical_avg_service_time: Optional[float] = None
    arrival_rate_15m: Optional[float] = None
    hour: Optional[int] = None
    day_of_week: Optional[int] = None
    no_show_rate: Optional[float] = None
    counter_load: Optional[float] = None

class WaitTimeResponse(BaseModel):
    predicted_wait_minutes: int
    lower_bound_minutes: int
    upper_bound_minutes: int
    recommended_arrival_time: str
    prediction_source: str = "BASELINE"
    model_version: Optional[str] = None
