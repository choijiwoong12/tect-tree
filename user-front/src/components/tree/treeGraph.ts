// Tech-tree graph definition + automatic radial layout.
//
// Node POSITIONS are not hard-coded. They are derived from the parent/child
// links by `computeRadialLayout`, so the tree stays aligned and is easy to
// extend: to add a node you only add a NodeSpec and a Link to its parent —
// the layout then branches the new node out from its parent in a
// deterministic, pseudo-random direction.

export type NodeStatus = 'unlocked' | 'unlockable' | 'locked'

export interface NodeSpec {
  id: string
  label: string
  status: NodeStatus
  cost?: number
}

export interface Link {
  source: string // parent id
  target: string // child id
}

export interface XY {
  x: number
  y: number
}

// ---------------------------------------------------------------------------
// Graph data — edit THIS to grow the tree. Positions are computed, not stored.
// ---------------------------------------------------------------------------

export const ROOT_ID = '1'

export const nodeSpecs: NodeSpec[] = [
  { id: '1', label: 'Godot', status: 'unlocked' },
  { id: '2', label: '사이코\n패러다임\n개론', status: 'unlocked' },
  { id: '3', label: '페미니즘의\n다차원적 분석', status: 'unlocked' },
  { id: '4', label: 'NATO 1', status: 'unlocked' },
  { id: '5', label: '패션은 어째서\n퇴화하는가', status: 'unlocked' },
  { id: '6', label: '소련의\n여성정책', status: 'unlockable', cost: 180 },
  { id: '7', label: '잘씻는 법:\n귀 뒤를 닦아라', status: 'unlocked' },
  { id: '8', label: '???', status: 'locked' },
  { id: '9', label: '???', status: 'locked' },
  { id: '10', label: '???', status: 'locked' },
]

export const links: Link[] = [
  { source: '1', target: '2' },
  { source: '1', target: '3' },
  { source: '1', target: '4' },
  { source: '1', target: '5' },
  { source: '3', target: '6' },
  { source: '1', target: '7' },
  { source: '2', target: '8' },
  { source: '4', target: '9' },
  { source: '7', target: '10' },
]

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

// Deterministic hash of a string → [0, 1). Used so each node's branch
// direction/length is "random"-looking yet stable across renders.
function rand01(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1_000_000) / 1_000_000
}

/**
 * Radial / organic tree layout.
 *
 * - Root sits at the origin.
 * - The root's children are spread evenly around the full circle.
 * - Every deeper node fans its children out inside a forward arc centred on
 *   the outward direction (away from its own parent), so branches keep
 *   growing outward instead of folding back on themselves.
 * - A deterministic per-node jitter is added to both the angle and the
 *   radius, giving each new node a pseudo-random branch from its parent.
 *
 * The result is keyed by node id and is fully deterministic, so adding a node
 * never reshuffles the existing ones.
 */
export function computeRadialLayout(
  ids: string[],
  graphLinks: Link[],
  rootId: string,
  opts: { radius?: number } = {},
): Map<string, XY> {
  const radius = opts.radius ?? 200

  // Undirected adjacency so the whole connected component is laid out.
  const adj = new Map<string, string[]>()
  for (const id of ids) adj.set(id, [])
  for (const { source, target } of graphLinks) {
    adj.get(source)?.push(target)
    adj.get(target)?.push(source)
  }

  const pos = new Map<string, XY>()
  const outAngle = new Map<string, number>() // direction this node grew toward
  const depth = new Map<string, number>()

  pos.set(rootId, { x: 0, y: 0 })
  outAngle.set(rootId, 0)
  depth.set(rootId, 0)

  const visited = new Set<string>([rootId])
  const queue: string[] = [rootId]

  while (queue.length) {
    const cur = queue.shift() as string
    const cp = pos.get(cur) as XY
    const cAngle = outAngle.get(cur) as number
    const cDepth = depth.get(cur) as number

    const children = (adj.get(cur) ?? []).filter((c) => !visited.has(c))
    const n = children.length
    if (n === 0) continue

    children.forEach((child, i) => {
      visited.add(child)

      let angle: number
      if (cDepth === 0) {
        // Root: even spokes around the full circle, with a touch of jitter.
        angle = (2 * Math.PI * i) / n + (rand01(child) - 0.5) * 0.5
      } else {
        // Deeper: fan within a forward arc centred on the outward direction.
        const spread = Math.PI * 0.85
        const t = n === 1 ? 0.5 : i / (n - 1)
        angle = cAngle - spread / 2 + spread * t + (rand01(child + ':j') - 0.5) * 0.45
      }

      // Vary the branch length a little so siblings aren't perfectly equidistant.
      const r = radius * (0.82 + rand01(child + ':r') * 0.5)

      pos.set(child, {
        x: cp.x + Math.cos(angle) * r,
        y: cp.y + Math.sin(angle) * r,
      })
      outAngle.set(child, angle)
      depth.set(child, cDepth + 1)
      queue.push(child)
    })
  }

  // Fallback for any node not reachable from the root.
  for (const id of ids) {
    if (!pos.has(id)) {
      pos.set(id, {
        x: (rand01(id + ':x') - 0.5) * radius * 4,
        y: (rand01(id + ':y') - 0.5) * radius * 4,
      })
    }
  }

  return pos
}
