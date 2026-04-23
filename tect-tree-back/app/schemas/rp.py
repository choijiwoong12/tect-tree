from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RpBalanceOut(BaseModel):
    balance: int


class RpTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    delta: int
    balance_after: int
    kind: str
    reference_id: str | None = None
    memo: str | None = None
    created_at: datetime


class RpHistoryOut(BaseModel):
    items: list[RpTransactionOut]
    total: int
    page: int
    size: int


class RpChargeRequest(BaseModel):
    amount_krw: int = Field(gt=0)


class RpChargeOrderOut(BaseModel):
    order_id: str
    amount: int
    rp_amount: int
