from pydantic import BaseModel, ConfigDict


class NodeOut(BaseModel):
    """Tree-view representation. `content` is None until unlocked."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_id: int | None
    title: str
    summary: str | None
    cost_rp: int
    position_x: int
    position_y: int
    unlocked: bool = False


class NodeDetailOut(NodeOut):
    content: str | None = None


class NodeCreate(BaseModel):
    parent_id: int | None = None
    title: str
    summary: str | None = None
    content: str | None = None
    cost_rp: int = 0
    position_x: int = 0
    position_y: int = 0


class NodeUpdate(BaseModel):
    parent_id: int | None = None
    title: str | None = None
    summary: str | None = None
    content: str | None = None
    cost_rp: int | None = None
    position_x: int | None = None
    position_y: int | None = None


class NodeUnlockOut(BaseModel):
    node_id: int
    rp_spent: int
    rp_balance: int
