from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.schemas.auth import (
    AccessTokenOut,
    LoginRequest,
    RefreshRequest,
    SignupRequest,
    TokenPair,
)
from app.schemas.user import UserOut
from app.services import auth_service

router = APIRouter()


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> UserOut:
    user = auth_service.signup(db, payload)
    return UserOut.model_validate(user)


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenPair:
    return auth_service.login(db, payload)


@router.post("/refresh", response_model=AccessTokenOut)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> AccessTokenOut:
    access = auth_service.refresh_access_token(db, payload.refresh_token)
    return AccessTokenOut(access_token=access)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> None:
    auth_service.logout(db, user, payload.refresh_token)
