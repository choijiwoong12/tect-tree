from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RpTransaction(Base):
    __tablename__ = "rp_transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True, nullable=False)

    delta: Mapped[int] = mapped_column(Integer, nullable=False)  # + charge, - unlock
    balance_after: Mapped[int] = mapped_column(BigInteger, nullable=False)

    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    # "charge" | "unlock" | "admin_adjust" | "refund"
    reference_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    memo: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
