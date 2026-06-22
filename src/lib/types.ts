export type NodeKind = "category" | "content" | "file";

export interface DocumentNode {
  id: number;
  parent_id: number | null;
  title: string;
  node_kind: NodeKind;
  body_content: string | null;
  file_name: string | null;
  file_path: string | null;
  is_locked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NodeTreeItem extends DocumentNode {
  children: NodeTreeItem[];
  depth?: number;
}
