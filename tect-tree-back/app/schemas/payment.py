from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TossConfirmRequest(BaseModel):
    payment_key: str
    order_id: str
    amount: int


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: str
    amount: int
    rp_amount: int
    status: str
    created_at: datetime


class PaymentHistoryOut(BaseModel):
    items: list[PaymentOut]
    total: int
    page: int
    size: int
