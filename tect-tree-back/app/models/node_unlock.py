from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NodeUnlock(Base):
    __tablename__ = "node_unlocks"
    __table_args__ = (UniqueConstraint("user_id", "node_id", name="uq_user_node"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True, nullable=False)
    node_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("nodes.id"), index=True, nullable=False)

    rp_spent: Mapped[int] = mapped_column(BigInteger, nullable=False)

    unlocked_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
