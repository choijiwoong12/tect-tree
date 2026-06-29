export type NodeKind = "category" | "content" | "file";

export interface IndexItem {
  id: string;
  title: string;
}

export interface DocumentNode {
  id: number;
  parent_id?: number | null; // legacy — no longer used for graph structure
  title: string;
  node_kind: NodeKind;
  body_content: string | null;
  index_items: IndexItem[] | null;
  file_name: string | null;
  file_path: string | null;
  is_locked: boolean;
  price: number | null;
  pos_x: number | null; // absolute canvas position
  pos_y: number | null; // absolute canvas position
  created_at?: string;
  updated_at?: string;
}

export interface NodeEdge {
  id: number;
  source_id: number;
  target_id: number;
  created_at?: string;
}

export interface NodeTreeItem extends DocumentNode {
  children: NodeTreeItem[];
  depth?: number;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
