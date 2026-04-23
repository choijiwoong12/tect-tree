from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    nickname: str
    role: str
    rp_balance: int
    created_at: datetime


class AdminUserUpdate(BaseModel):
    role: str | None = None
    rp_adjust: int | None = None  # signed delta
    memo: str | None = None


class AdminPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    order_id: str
    amount: int
    rp_amount: int
    status: str
    created_at: datetime


class TreeEditEvent(BaseModel):
    """Broadcast payload for /ws/admin/tree-editor."""

    event: str  # "node.created" | "node.updated" | "node.deleted"
    node_id: int
    data: dict[str, Any] | None = None
    actor_id: int
