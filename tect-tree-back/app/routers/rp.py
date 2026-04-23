from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.schemas.rp import RpBalanceOut, RpChargeOrderOut, RpChargeRequest, RpHistoryOut
from app.services import rp_service

router = APIRouter()


@router.get("/balance", response_model=RpBalanceOut)
def get_balance(user=Depends(get_current_user), db: Session = Depends(get_db)) -> RpBalanceOut:
    return RpBalanceOut(balance=rp_service.get_balance(db, user))


@router.get("/history", response_model=RpHistoryOut)
def get_history(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RpHistoryOut:
    return rp_service.get_history(db, user, page, size)


@router.post("/charge", response_model=RpChargeOrderOut)
def create_charge(
    payload: RpChargeRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RpChargeOrderOut:
    return rp_service.create_charge_order(db, user, payload)
