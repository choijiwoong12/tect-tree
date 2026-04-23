from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import PaymentHistoryOut, TossConfirmRequest


def confirm_toss_payment(db: Session, user: User, payload: TossConfirmRequest) -> Payment:
    """Verify with Toss Approve API, mark Payment as paid, grant RP via rp_service."""
    raise NotImplementedError


def get_history(db: Session, user: User, page: int, size: int) -> PaymentHistoryOut:
    raise NotImplementedError
