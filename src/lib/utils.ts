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

// ─── Levels (타원 바운더리 기반 자동 분류) ──────────────────────────────────────

export function findRootNode(nodes: DocumentNode[]): DocumentNode | undefined {
  return nodes.find((n) => n.title === "Root" || (n.node_kind as string) === "root");
}

/** 타원 중심 기준 정규화 거리. 1 이하면 타원 내부, 작을수록 중심에 더 가깝다. */
function ellipseScore(node: DocumentNode, level: TreeLevel): number {
  const dx = (node.pos_x ?? 0) - level.center_x;
  const dy = (node.pos_y ?? 0) - level.center_y;
  return (dx / level.radius_x) ** 2 + (dy / level.radius_y) ** 2;
}

/**
 * 노드가 속한 레벨을 실시간 계산한다 (노드 레코드에는 저장하지 않음).
 * 레벨 타원은 보통 서로 겹치며 중첩되므로(작은 레벨이 큰 레벨 안에 포함), 노드를
 * 포함하는 타원 중 가장 작은(가장 안쪽) 타원에 배정한다 — 이렇게 해야 레벨 1에
 * 속한 노드가 레벨 2에도 같이 집계되는 일이 없다. 어떤 타원에도 속하지 않으면
 * 정규화 거리가 가장 작은 타원으로 fallback 한다.
 */
export function resolveNodeLevel(node: DocumentNode, levels: TreeLevel[]): TreeLevel | null {
  if (levels.length === 0) return null;

  const containing = levels.filter((lvl) => ellipseScore(node, lvl) <= 1);
  if (containing.length > 0) {
    return containing.reduce((smallest, lvl) =>
      lvl.radius_x * lvl.radius_y < smallest.radius_x * smallest.radius_y ? lvl : smallest
    );
  }

  return levels.reduce((best, lvl) =>
    ellipseScore(node, lvl) < ellipseScore(node, best) ? lvl : best
  );
}
