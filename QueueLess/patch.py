import sys

file_path = 'backend/app/api/endpoints/admin.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    tokens = db.query(Token).order_by(Token.created_at.desc()).limit(200).all()'''

replacement = '''    from app.services.queue_manager import QueueManager
    from app.schemas.prediction import WaitTimeRequest
    from app.services.prediction_engine import PredictionEngine
    
    tokens = db.query(Token).order_by(Token.created_at.desc()).limit(200).all()'''

target2 = '''        res.append({
            "id": t.id, "token_number": t.token_number, "status": t.status, "created_at": t.created_at,
            "office_name": o.name if o else "Unknown", "service_name": s.name if s else "Unknown"
        })'''

replacement2 = '''        pos = None
        est = None
        if t.status in ["WAITING", "CALLED"]:
            stats = QueueManager.get_queue_stats(db, t.office_id, t.service_id, t.id)
            pos = stats["queue_position"]
            req = WaitTimeRequest(office_id=t.office_id, service_id=t.service_id, token_id=t.id, people_ahead=stats["people_ahead"])
            pred = PredictionEngine.get_wait_time(db, req)
            est = pred["predicted_wait_minutes"]

        res.append({
            "id": t.id, "token_number": t.token_number, "status": t.status, "created_at": t.created_at,
            "office_name": o.name if o else "Unknown", "service_name": s.name if s else "Unknown",
            "position": pos,
            "estimated_wait": est
        })'''

content = content.replace(target, replacement).replace(target2, replacement2)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched exactly!')
