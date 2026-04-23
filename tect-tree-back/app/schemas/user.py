from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    nickname: str
    role: str
    rp_balance: int
    profile_image_url: str | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    nickname: str | None = Field(default=None, min_length=2, max_length=50)
    profile_image_url: str | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)
