from fastapi import APIRouter
from app.api.endpoints import health, auth, offices, tokens, predictions, ws, employee, admin, notifications, mock_test

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(offices.router, prefix="/offices", tags=["offices"])
api_router.include_router(tokens.router, prefix="/tokens", tags=["tokens"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
api_router.include_router(employee.router, prefix="/employee", tags=["employee"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(mock_test.router, prefix="/mock-test", tags=["mock-test"])
api_router.include_router(ws.router, prefix="/ws/queue", tags=["websocket"])

