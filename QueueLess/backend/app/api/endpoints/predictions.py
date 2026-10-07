from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.prediction import WaitTimeRequest, WaitTimeResponse
from app.services.prediction_engine import PredictionEngine

router = APIRouter()

@router.post("/wait-time", response_model=WaitTimeResponse)
def compute_wait_time(
    req: WaitTimeRequest,
    db: Session = Depends(deps.get_db)
):
    """
    Calculates estimated wait time based on predictive ML model.
    Falls back to Baseline automatically on failure securely.
    """
    return PredictionEngine.get_wait_time(db, req)
