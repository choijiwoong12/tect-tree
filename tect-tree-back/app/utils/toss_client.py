import base64
from typing import Any

import httpx

from app.config import settings


class TossClient:
    """Thin wrapper over Toss Payments server API."""

    def __init__(self, secret_key: str | None = None, base_url: str | None = None) -> None:
        self._secret_key = secret_key or settings.TOSS_SECRET_KEY
        self._base_url = (base_url or settings.TOSS_API_BASE).rstrip("/")

    def _auth_header(self) -> dict[str, str]:
        token = base64.b64encode(f"{self._secret_key}:".encode()).decode()
        return {"Authorization": f"Basic {token}"}

    async def confirm(self, payment_key: str, order_id: str, amount: int) -> dict[str, Any]:
        """POST /v1/payments/confirm — server-side Approve."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self._base_url}/v1/payments/confirm",
                headers={**self._auth_header(), "Content-Type": "application/json"},
                json={"paymentKey": payment_key, "orderId": order_id, "amount": amount},
            )
            resp.raise_for_status()
            return resp.json()


toss_client = TossClient()
