import type { DocumentNode, NodeTreeItem } from "./types";

export function buildTree(nodes: DocumentNode[]): NodeTreeItem[] {
  const map = new Map<number, NodeTreeItem>();
  const roots: NodeTreeItem[] = [];

  for (const n of nodes) {
    map.set(n.id, { ...n, children: [] });
  }

  for (const node of map.values()) {
    if (node.parent_id === null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parent_id);
      if (parent) parent.children.push(node);
    }
  }

  return roots;
}

export function flattenTree(
  nodes: NodeTreeItem[],
  depth = 0
): (NodeTreeItem & { depth: number })[] {
  const result: (NodeTreeItem & { depth: number })[] = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    result.push(...flattenTree(node.children, depth + 1));
  }
  return result;
}

export function nodeKindLabel(kind: string) {
  switch (kind) {
    case "category": return "카테고리";
    case "content": return "문서";
    case "file": return "파일";
    default: return kind;
  }
}

export function nodeKindColor(kind: string) {
  switch (kind) {
    case "category": return "bg-violet-100 text-violet-700";
    case "content": return "bg-blue-100 text-blue-700";
    case "file": return "bg-emerald-100 text-emerald-700";
    default: return "bg-gray-100 text-gray-600";
  }
}
