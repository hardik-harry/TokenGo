import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.api.endpoints.admin import get_admin_analytics
from app.models.models import User

db = SessionLocal()
admin_user = db.query(User).filter(User.role == 'admin').first()
if not admin_user:
    admin_user = User(role='admin', name='Test', email='test@test.com', password_hash='')
try:
    print('Testing analytics...')
    res = get_admin_analytics(db=db, current_user=admin_user)
    print('Success:', dict(res))
except Exception as e:
    import traceback
    traceback.print_exc()
