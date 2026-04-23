from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """In-memory WebSocket hub. Replace with Redis pub/sub if scaling out."""

    def __init__(self) -> None:
        self._channels: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._channels[channel].add(websocket)

    def disconnect(self, channel: str, websocket: WebSocket) -> None:
        self._channels[channel].discard(websocket)

    async def broadcast(self, channel: str, message: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        for ws in self._channels.get(channel, set()):
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(channel, ws)


manager = ConnectionManager()
