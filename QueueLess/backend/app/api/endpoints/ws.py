from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Optional
from jose import jwt, JWTError
from app.websocket.manager import manager
from app.core.config import settings

router = APIRouter()

@router.websocket("/{office_id}/{service_id}")
async def websocket_queue_endpoint(
    websocket: WebSocket, 
    office_id: int, 
    service_id: int, 
    token_id: Optional[int] = None,
    auth_token: Optional[str] = None
):
    """
    WebSocket endpoint securely decoding JWT natively preventing unauthorized blasts.
    """
    if not auth_token:
         await websocket.close(code=1008)
         return
    
    try:
         payload = jwt.decode(auth_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
         # Success, JWT is cryptographically valid
    except JWTError:
         await websocket.close(code=1008)
         return
         
    await manager.connect(websocket, office_id, service_id, token_id)
    
    # Broadcast immediate state cleanly upon native connection!
    await manager.broadcast_queue_state(office_id, service_id)
    
    try:
        while True:
            # Keeps connection alive securely waiting for pings
            _ = await websocket.receive_text()
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, office_id, service_id)
