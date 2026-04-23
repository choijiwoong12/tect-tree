from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_admin
from app.schemas.admin import AdminPaymentOut, AdminUserOut, AdminUserUpdate
from app.schemas.node import NodeCreate, NodeOut, NodeUpdate
from app.services import admin_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[AdminUserOut]:
    return await admin_service.list_users(db, page, size, q)


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminUserOut:
    updated = await admin_service.update_user(db, admin, user_id, payload)
    return AdminUserOut.model_validate(updated)


@router.get("/payments", response_model=list[AdminPaymentOut])
async def list_payments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[AdminPaymentOut]:
    return await admin_service.list_payments(db, page, size)


@router.get("/nodes", response_model=list[NodeOut])
async def list_nodes(db: Session = Depends(get_db)) -> list[NodeOut]:
    raise NotImplementedError


@router.post("/nodes", response_model=NodeOut, status_code=status.HTTP_201_CREATED)
async def create_node(
    payload: NodeCreate,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> NodeOut:
    node = await admin_service.create_node(db, admin, payload)
    return NodeOut.model_validate(node)


@router.patch("/nodes/{node_id}", response_model=NodeOut)
async def update_node(
    node_id: int,
    payload: NodeUpdate,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> NodeOut:
    node = await admin_service.update_node(db, admin, node_id, payload)
    return NodeOut.model_validate(node)


@router.delete("/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(
    node_id: int,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    await admin_service.delete_node(db, admin, node_id)
