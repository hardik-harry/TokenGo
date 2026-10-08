from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import math
from app.models.models import Service, Counter, Token, OfficeService, Office
from app.services.queue_manager import QueueManager
from fastapi import HTTPException
from app.schemas.prediction import WaitTimeRequest
import joblib
import pandas as pd
import os
import logging

import json

ml_pipeline = None
ml_metrics = None
try:
    model_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../ml/models/rf_wait_model.joblib"))
    metrics_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../ml/models/metrics_v1.json"))
    
    if os.path.exists(model_path):
        ml_pipeline = joblib.load(model_path)
    if os.path.exists(metrics_path):
        with open(metrics_path, 'r') as f:
            ml_metrics = json.load(f)
except Exception as e:
    logging.warning(f"ML Pipeline unavailable: {e}")

class PredictionEngine:
    @staticmethod
    def _calculate_baseline(db: Session, office_id: int, service_id: int, people_ahead: int) -> dict:
        # Fetch Service Details for baseline average times
        service = db.query(Service).filter(Service.id == service_id).first()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found.")
            
        # Check mapping to see if it's currently active here
        mapping = db.query(OfficeService).filter(
            OfficeService.office_id == office_id,
            OfficeService.service_id == service_id,
            OfficeService.status == "active"
        ).first()
        
        if not mapping:
            raise HTTPException(status_code=400, detail="Service is currently unavailable at this location.")

        # Total active counters mapped to this service at this office 
        # For baseline, we assume at least 1 counter is active for the formula safely. 
        # (We get actual counters from Counter if implemented, otherwise default to 1)
        active_counters_count = db.query(Counter).filter(
            Counter.office_id == office_id, 
            Counter.status == "active"
        ).count()
        
        if active_counters_count == 0:
             # Handle 0 active counters explicitly (assume 1 so math works, but warn/adjust bounds)
             active_counters = 1
        else:
             active_counters = active_counters_count

        avg_time = service.baseline_service_minutes or 20

        # Dynamically scale by actual queue position explicitly
        multiplier = max(1, people_ahead + 1)
        predicted_wait = (multiplier * avg_time) / active_counters

        if not math.isfinite(predicted_wait) or predicted_wait < 0:
            predicted_wait = 15.0

        predicted_wait = int(round(predicted_wait))
        lower_bound = max(1, int(math.floor(predicted_wait * 0.80)))
        upper_bound = int(math.ceil(predicted_wait * 1.20))
        
        # Align perfectly to average 
        predicted_wait = int((lower_bound + upper_bound) / 2)

        # Recommended Arrival Time scales off dynamic estimate
        arrival_datetime = datetime.now() + timedelta(minutes=predicted_wait)
        recommended_arrival_time = arrival_datetime.strftime("%H:%M")

        return {
            "predicted_wait_minutes": predicted_wait,
            "lower_bound_minutes": lower_bound,
            "upper_bound_minutes": upper_bound,
            "recommended_arrival_time": recommended_arrival_time,
            "prediction_source": "FALLBACK",
            "model_version": "v1_deterministic"
        }

    @staticmethod
    def get_wait_time(db: Session, req: WaitTimeRequest) -> dict:
        """
        Dynamically routes prediction requests. Attempts ML logic first,
        otherwise safely falls back to BASELINE math.
        """
        office_id, service_id = req.office_id, req.service_id
        
        # 1. Base Queue State Aggregation (Dynamic fillers if missing)
        people_ahead = req.people_ahead
        stats = QueueManager.get_queue_stats(db, office_id, service_id, req.token_id)
        if people_ahead is None:
            if req.token_id:
                token = db.query(Token).filter(Token.id == req.token_id).first()
                if not token:
                    raise HTTPException(status_code=404, detail="Token not found.")
                people_ahead = stats["people_ahead"] if token.status in ["WAITING", "CALLED"] else 0
            else:
                people_ahead = stats["current_queue_length"]

        # 2. Try ML Prediction Execution
        if ml_pipeline is not None:
            try:
                # Compile missing fields contextually 
                queue_length = req.queue_length if req.queue_length is not None else stats["current_queue_length"]
                active_counters_count = req.active_counters if req.active_counters is not None else max(1, db.query(Counter).filter(Counter.office_id == office_id, Counter.status == "active").count())
                
                service = db.query(Service).filter(Service.id == service_id).first()
                historical_avg = req.historical_avg_service_time if req.historical_avg_service_time is not None else (service.baseline_service_minutes or 15)
                
                # Dynamic defaults simulating current real time for variables not provided
                arrival_rate_15m = req.arrival_rate_15m if req.arrival_rate_15m is not None else 3.0
                hour = req.hour if req.hour is not None else datetime.now().hour
                day_of_week = req.day_of_week if req.day_of_week is not None else datetime.now().weekday()
                no_show_rate = req.no_show_rate if req.no_show_rate is not None else 0.05
                counter_load = req.counter_load if req.counter_load is not None else (queue_length / max(1, active_counters_count))

                # Structure exact DF expected by preprocessor securely 
                df = pd.DataFrame([{
                    "people_ahead": people_ahead,
                    "queue_length": queue_length,
                    "active_counters": active_counters_count,
                    "historical_avg_service_time": historical_avg,
                    "arrival_rate_15m": arrival_rate_15m,
                    "hour": hour,
                    "day_of_week": day_of_week,
                    "service_id": service_id,
                    "office_id": office_id,
                    "no_show_rate": no_show_rate,
                    "counter_load": counter_load
                }])

                # Evaluate execution block
                preprocessed = ml_pipeline['preprocessor'].transform(df) if 'preprocessor' in ml_pipeline else df
                
                # Retrieve pure dynamic baseline deterministic target
                avg_time = historical_avg
                deterministic_wait = (max(1, people_ahead + 1) * avg_time) / max(1, active_counters_count)

                predicted_time = float(ml_pipeline['model'].predict(preprocessed)[0])
                if not math.isfinite(predicted_time) or predicted_time < 0 or predicted_time > 300:
                    predicted_time = deterministic_wait
                
                # Blend 25% ML Prediction with 75% Pure Dynamic Formula to guarantee strict queue-state reaction
                blended_wait = (predicted_time * 0.25) + (deterministic_wait * 0.75)
                
                predicted_wait = int(round(blended_wait))
                # Simple bounds approximation clamped realistically
                lower_bound = max(1, int(math.floor(predicted_wait * 0.80)))
                upper_bound = int(math.ceil(predicted_wait * 1.20))
                
                # Align prediction perfectly with average of final bounds to satisfy UI logic
                predicted_wait = int((lower_bound + upper_bound) / 2)
                
                arrival_datetime = datetime.now() + timedelta(minutes=predicted_wait)
                
                return {
                    "predicted_wait_minutes": predicted_wait,
                    "lower_bound_minutes": lower_bound,
                    "upper_bound_minutes": upper_bound,
                    "recommended_arrival_time": arrival_datetime.strftime("%H:%M"),
                    "prediction_source": "ML_MODEL",
                    "model_version": f"RandomForest_v1.0 [R2: {ml_metrics.get('ML_R2')}]" if ml_metrics else "RandomForest_v1.0"
                }

            except Exception as e:
                logging.error(f"ML processing failed securely: {e}. Falling back to baseline computations.")
                pass 
        
        # 3. Secure Baseline Fallback
        return PredictionEngine._calculate_baseline(db, office_id, service_id, people_ahead)
