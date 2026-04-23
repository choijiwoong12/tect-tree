from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import PasswordChangeRequest, UserUpdate


def get_me(db: Session, user: User) -> User:
    raise NotImplementedError


def update_me(db: Session, user: User, payload: UserUpdate) -> User:
    raise NotImplementedError


def change_password(db: Session, user: User, payload: PasswordChangeRequest) -> None:
    raise NotImplementedError
