export interface TreeNode {
  id: number;
  parent_id: number | null;
  title: string;
  summary: string | null;
  cost_rp: number;
  position_x: number;
  position_y: number;
  unlocked: boolean;
}

export interface TreeNodeDetail extends TreeNode {
  content: string | null;
}

export interface TreeEditEvent {
  event: "node.created" | "node.updated" | "node.deleted";
  node_id: number;
  data: Partial<TreeNode> | null;
  actor_id: number;
}
