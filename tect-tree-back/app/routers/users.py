from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.schemas.user import PasswordChangeRequest, UserOut, UserUpdate
from app.services import user_service

router = APIRouter()


@router.get("/me", response_model=UserOut)
def read_me(user=Depends(get_current_user), db: Session = Depends(get_db)) -> UserOut:
    return UserOut.model_validate(user_service.get_me(db, user))


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    return UserOut.model_validate(user_service.update_me(db, user, payload))


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChangeRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    user_service.change_password(db, user, payload)
