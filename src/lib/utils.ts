import type { DocumentNode, NodeTreeItem, TreeLevel } from "./types";

export function buildTree(nodes: DocumentNode[]): NodeTreeItem[] {
  const map = new Map<number, NodeTreeItem>();
  const roots: NodeTreeItem[] = [];

  for (const n of nodes) {
    map.set(n.id, { ...n, children: [] });
  }

  for (const node of map.values()) {
    if (node.parent_id == null) {
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

// ─── Levels (ROOT 거리 기반 자동 분류) ──────────────────────────────────────────

export function findRootNode(nodes: DocumentNode[]): DocumentNode | undefined {
  return nodes.find((n) => n.title === "Root" || (n.node_kind as string) === "root");
}

export function distanceFromRoot(
  node: DocumentNode,
  root: DocumentNode | undefined
): number | null {
  if (!root) return null;
  const dx = (node.pos_x ?? 0) - (root.pos_x ?? 0);
  const dy = (node.pos_y ?? 0) - (root.pos_y ?? 0);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 노드가 속한 레벨을 거리 기준으로 실시간 계산한다 (노드 레코드에는 저장하지 않음).
 * 모든 레벨의 반경보다 멀리 떨어진 노드는 가장 바깥(최대 radius) 레벨로 편입된다.
 */
export function resolveNodeLevel(
  node: DocumentNode,
  root: DocumentNode | undefined,
  levels: TreeLevel[]
): TreeLevel | null {
  if (levels.length === 0) return null;
  const distance = distanceFromRoot(node, root);
  if (distance === null) return null;

  const sorted = [...levels].sort((a, b) => a.radius - b.radius);
  return sorted.find((lvl) => distance <= lvl.radius) ?? sorted[sorted.length - 1];
}
