from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.rp import RpChargeOrderOut, RpChargeRequest, RpHistoryOut


def get_balance(db: Session, user: User) -> int:
    raise NotImplementedError


def get_history(db: Session, user: User, page: int, size: int) -> RpHistoryOut:
    raise NotImplementedError


def create_charge_order(db: Session, user: User, payload: RpChargeRequest) -> RpChargeOrderOut:
    """Create a pending Payment row and return order_id for Toss checkout."""
    raise NotImplementedError


def apply_rp_delta(
    db: Session,
    user: User,
    delta: int,
    kind: str,
    reference_id: str | None = None,
    memo: str | None = None,
) -> int:
    """Atomic RP balance change + ledger entry. Returns new balance."""
    raise NotImplementedError
