from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.core.security import decode_token
from app.core.ws_manager import manager

router = APIRouter()

TREE_EDITOR_CHANNEL = "admin:tree-editor"


@router.websocket("/admin/tree-editor")
async def tree_editor(websocket: WebSocket, token: str = Query(...)) -> None:
    try:
        claims = decode_token(token)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    if claims.get("role") != "admin":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(TREE_EDITOR_CHANNEL, websocket)
    try:
        while True:
            # Server is broadcast-only for now; keep the connection alive.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(TREE_EDITOR_CHANNEL, websocket)
