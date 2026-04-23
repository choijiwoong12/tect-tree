from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.schemas.node import NodeDetailOut, NodeOut, NodeUnlockOut
from app.services import node_service

router = APIRouter()


@router.get("", response_model=list[NodeOut])
def list_tree(user=Depends(get_current_user), db: Session = Depends(get_db)) -> list[NodeOut]:
    return node_service.list_tree(db, user)


@router.get("/{node_id}", response_model=NodeDetailOut)
def get_node(
    node_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NodeDetailOut:
    return node_service.get_node(db, user, node_id)


@router.post("/{node_id}/unlock", response_model=NodeUnlockOut)
def unlock_node(
    node_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NodeUnlockOut:
    return node_service.unlock_node(db, user, node_id)
