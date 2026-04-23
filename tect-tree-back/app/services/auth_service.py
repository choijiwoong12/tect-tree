from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenPair


def signup(db: Session, payload: SignupRequest) -> User:
    raise NotImplementedError


def login(db: Session, payload: LoginRequest) -> TokenPair:
    raise NotImplementedError


def refresh_access_token(refresh_token: str) -> str:
    raise NotImplementedError


def logout(db: Session, user: User, refresh_token: str) -> None:
    raise NotImplementedError
