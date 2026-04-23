from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.schemas.payment import PaymentHistoryOut, PaymentOut, TossConfirmRequest
from app.services import payment_service

router = APIRouter()


@router.post("/toss/confirm", response_model=PaymentOut)
def confirm_toss(
    payload: TossConfirmRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentOut:
    payment = payment_service.confirm_toss_payment(db, user, payload)
    return PaymentOut.model_validate(payment)


@router.get("/history", response_model=PaymentHistoryOut)
def history(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentHistoryOut:
    return payment_service.get_history(db, user, page, size)
