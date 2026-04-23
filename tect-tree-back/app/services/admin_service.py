from sqlalchemy.orm import Session

from app.models.node import Node
from app.models.user import User
from app.schemas.admin import AdminUserOut, AdminUserUpdate
from app.schemas.node import NodeCreate, NodeUpdate


async def list_users(db: Session, page: int, size: int, q: str | None) -> list[AdminUserOut]:
    raise NotImplementedError


async def update_user(db: Session, admin: User, user_id: int, payload: AdminUserUpdate) -> User:
    raise NotImplementedError


async def list_payments(db: Session, page: int, size: int) -> list:
    raise NotImplementedError


async def create_node(db: Session, admin: User, payload: NodeCreate) -> Node:
    """Create node, log admin action, broadcast 'node.created' over WS."""
    raise NotImplementedError


async def update_node(db: Session, admin: User, node_id: int, payload: NodeUpdate) -> Node:
    """Update node, log admin action, broadcast 'node.updated' over WS."""
    raise NotImplementedError


async def delete_node(db: Session, admin: User, node_id: int) -> None:
    """Delete node, log admin action, broadcast 'node.deleted' over WS."""
    raise NotImplementedError
