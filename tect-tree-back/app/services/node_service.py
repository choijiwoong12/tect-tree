from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.node import NodeDetailOut, NodeOut, NodeUnlockOut


def list_tree(db: Session, user: User) -> list[NodeOut]:
    """Return full tree with per-node unlocked flag for this user."""
    raise NotImplementedError


def get_node(db: Session, user: User, node_id: int) -> NodeDetailOut:
    """Return node detail. content is masked if the user hasn't unlocked it."""
    raise NotImplementedError


def unlock_node(db: Session, user: User, node_id: int) -> NodeUnlockOut:
    """Deduct RP and insert NodeUnlock in a single transaction."""
    raise NotImplementedError
