import json
import logging
from typing import Dict, List, Tuple, Any
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Format: {(office_id, service_id): [{"ws": WebSocket, "token_id": 123}, ...]}
        self.active_connections: Dict[Tuple[int, int], List[Dict[str, Any]]] = {}

    async def connect(self, ws: WebSocket, office_id: int, service_id: int, token_id: int = None):
        await ws.accept()
        key = (office_id, service_id)
        if key not in self.active_connections:
            self.active_connections[key] = []
        self.active_connections[key].append({"ws": ws, "token_id": token_id})

    def disconnect(self, ws: WebSocket, office_id: int, service_id: int):
        key = (office_id, service_id)
        if key in self.active_connections:
            # Rebuild list without this websocket securely
            self.active_connections[key] = [client for client in self.active_connections[key] if client["ws"] != ws]
            if not self.active_connections[key]:
                del self.active_connections[key]

    async def blast_admin_update(self):
        key = (0, 0)
        if key not in self.active_connections: return
        for client in self.active_connections[key]:
            try:
                await client["ws"].send_json({"type": "ADMIN_UPDATE"})
            except Exception as e:
                logging.warning(f"Failed dispatching admin update: {e}")

    async def broadcast_queue_state(self, office_id: int, service_id: int):
        """
        Dynamically rebuilds state and blasts calculations down to targeted sockets asynchronously.
        Uses inline db session generator to prevent threading corruptions.
        """
        await self.blast_admin_update()
        
        key = (office_id, service_id)
        if key not in self.active_connections:
            return  # Nobody listening

        try:
            # We import here to avoid circular imports dynamically
            from app.db.session import SessionLocal
            from app.services.queue_manager import QueueManager
            from app.services.prediction_engine import PredictionEngine
            from app.schemas.prediction import WaitTimeRequest
            from app.models.models import Token
            
            db = SessionLocal()
            try:
                # 1. Base Queue State
                stats = QueueManager.get_queue_stats(db, office_id, service_id)
                queue_length = stats["current_queue_length"]
                people_waiting = stats["current_queue_length"] # Effectively same initially
                
                # Fetch Current Serving Token (CALLED or SERVING status)
                serving_token = db.query(Token).filter(
                    Token.office_id == office_id, 
                    Token.service_id == service_id, 
                    Token.status.in_(["CALLED", "SERVING"])
                ).first()
                serving_str = serving_token.token_number if serving_token else "NONE"
                
                # 2. Iterate clients uniquely pushing their specific payload
                clients = self.active_connections[key]
                for client in clients:
                    personal_token_id = client["token_id"]
                    
                    # Generate Prediction for specific token context (or generic if None)
                    req = WaitTimeRequest(
                        office_id=office_id,
                        service_id=service_id,
                        token_id=personal_token_id,
                        people_ahead=None, # Engine fetches natively
                        queue_length=queue_length
                    )
                    
                    prediction = PredictionEngine.get_wait_time(db, req)
                    
                    user_position = 0
                    actual_people_ahead = people_waiting 
                    
                    if personal_token_id:
                         t_stats = QueueManager.get_queue_stats(db, office_id, service_id, personal_token_id)
                         user_position = t_stats["queue_position"]
                         actual_people_ahead = t_stats["people_ahead"]
                         
                         # Trigger approaching notifications
                         p_ahead = actual_people_ahead
                         if p_ahead <= 2:
                             tk_obj = db.query(Token).filter(Token.id == personal_token_id).first()
                             if tk_obj and tk_obj.user_id and tk_obj.status == "WAITING":
                                 from app.services.notification_service import NotificationService
                                 NotificationService.create(db, tk_obj.user_id, f"Token {tk_obj.token_number} is approaching! Only {p_ahead} people ahead.")

                    payload = {
                        "current_serving_token": serving_str,
                        "queue_length": queue_length,
                        "people_waiting": actual_people_ahead,
                        "user_token_position": user_position,
                        "predicted_wait_minutes": prediction["predicted_wait_minutes"],
                        "lower_bound_minutes": prediction["lower_bound_minutes"],
                        "upper_bound_minutes": prediction["upper_bound_minutes"],
                        "recommended_arrival_time": prediction["recommended_arrival_time"],
                        "prediction_source": prediction["prediction_source"]
                    }
                    
                    try:
                        await client["ws"].send_json(payload)
                    except Exception as e:
                        # Dead socket cleanup handled by explicit exceptions silently bypassing crash
                        logging.warning(f"Failed dispatching to dead socket: {e}")
            finally:
                db.close()
        except Exception as e:
            logging.error(f"WS Broadcast Engine Error: {e}")

manager = ConnectionManager()
