import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdminDb } from '@/lib/supabase/admin-db'
import { isSubscribed } from '@/lib/subscription'

function parseIndexItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) =>
    typeof item === 'string' ? item : (item as Record<string, string>)?.title ?? String(item),
  )
}

function isRootNode(n: { node_kind: string | null; title: string }) {
  return n.node_kind === 'root' || n.title === 'Root'
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: nodes, error }, { data: nodeEdges }] = await Promise.all([
    supabaseAdminDb
      .from('document_nodes')
      .select('id, parent_id, title, node_kind, pos_x, pos_y, is_locked, price, index_items')
      .order('id'),
    supabaseAdminDb
      .from('node_edges')
      .select('id, source_id, target_id'),
  ])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: setting } = await supabaseAdminDb
    .from('settings')
    .select('value')
    .eq('key', 'graph_viewport')
    .single()

  const raw = setting?.value ?? { x: 0, y: 0, zoom: 1 }
  const viewport = { ...raw, x: raw.x + 220 }

  const unlockedSet = new Set<number>()
  const readCountByNode = new Map<number, number>()
  if (user) {
    const subscribed = await isSubscribed(supabase, user.id)
    const { data: access } = await supabaseAdminDb
      .from('user_node_access')
      .select('node_id')
      .eq('user_id', user.id)
    for (const a of access ?? []) unlockedSet.add(Number(a.node_id))
    if (subscribed) {
      for (const n of nodes ?? []) {
        if (n.is_locked) unlockedSet.add(Number(n.id))
      }
    }

    const { data: progress } = await supabaseAdminDb
      .from('reading_progress')
      .select('node_id, read_items')
      .eq('user_id', user.id)
    for (const row of progress ?? []) {
      const items = Array.isArray(row.read_items) ? row.read_items : []
      readCountByNode.set(Number(row.node_id), items.length)
    }
  }
  const unlockedIds = Array.from(unlockedSet)

  // Build adjacency map from node_edges (undirected)
  const adjacencyMap = new Map<number, number[]>()
  for (const edge of nodeEdges ?? []) {
    if (!adjacencyMap.has(edge.source_id)) adjacencyMap.set(edge.source_id, [])
    if (!adjacencyMap.has(edge.target_id)) adjacencyMap.set(edge.target_id, [])
    adjacencyMap.get(edge.source_id)!.push(edge.target_id)
    adjacencyMap.get(edge.target_id)!.push(edge.source_id)
  }

  const nodeById = new Map((nodes ?? []).map((n) => [n.id, n]))

  function isUnlockedById(id: number): boolean {
    const n = nodeById.get(id)
    if (!n) return false
    if (isRootNode(n)) return true
    return !n.is_locked || unlockedSet.has(id)
  }

  const enriched = (nodes ?? []).map((n) => {
    const items = parseIndexItems(n.index_items)
    const accessible = !n.is_locked || unlockedSet.has(Number(n.id))
    const neighbors = adjacencyMap.get(n.id) ?? []
    // Root is always unlockable; otherwise must be adjacent to an unlocked node
    const isAdjacentToUnlocked = isRootNode(n) || neighbors.some((nid) => isUnlockedById(nid))
    return {
      id: n.id,
      parent_id: n.parent_id,
      title: n.title,
      node_kind: n.node_kind,
      pos_x: n.pos_x,
      pos_y: n.pos_y,
      is_locked: n.is_locked,
      price: n.price,
      index_count: items.length,
      index_items: accessible ? items : [],
      read_count: readCountByNode.get(Number(n.id)) ?? 0,
      is_adjacent_to_unlocked: isAdjacentToUnlocked,
    }
  })

  const edges = (nodeEdges ?? []).map((e) => ({
    source: e.source_id,
    target: e.target_id,
  }))

  return NextResponse.json({ nodes: enriched, unlocked_ids: unlockedIds, viewport, edges })
}
