from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True, nullable=False)

    order_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    toss_payment_key: Mapped[str | None] = mapped_column(String(200), nullable=True)

    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # KRW
    rp_amount: Mapped[int] = mapped_column(Integer, nullable=False)  # granted RP
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    # "pending" | "paid" | "failed" | "cancelled"

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
