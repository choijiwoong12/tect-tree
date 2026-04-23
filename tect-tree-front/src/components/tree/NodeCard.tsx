import type { TreeNode } from "@/types/tree";

export function NodeCard({ node }: { node: TreeNode }) {
  return (
    <article>
      <h3>{node.title}</h3>
      <p>{node.summary}</p>
      <small>{node.unlocked ? "열람 가능" : `잠금 — ${node.cost_rp} RP`}</small>
    </article>
  );
}
