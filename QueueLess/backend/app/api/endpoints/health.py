from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api import deps
import logging

router = APIRouter()

@router.get("/health")
def health_check(db: Session = Depends(deps.get_db)):
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        logging.error(f"Database health check failed: {e}")
        db_status = "unavailable"
        
    return {
        "status": "ok",
        "service": "QueueLess API",
        "database": db_status
    }
