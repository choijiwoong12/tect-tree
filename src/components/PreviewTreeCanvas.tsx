"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DotNode } from "./DotNode";
import { DetailVisibleContext } from "./treeViewContext";
import type { DocumentNode, NodeEdge } from "@/lib/types";

// ─── constants ────────────────────────────────────────────────────────────────

const DETAIL_ZOOM_FACTOR = 0.55;
const EDGE_DIM    = { stroke: "#404040", strokeWidth: 1 };
const EDGE_ACTIVE = { stroke: "#ffffff", strokeWidth: 2 };

const DESIGN_W = 1920;
const DESIGN_H = 1080;
const ROOT_DESIGN_X = 627;
const ROOT_DESIGN_Y = 718;

function designScale() {
  if (typeof window === "undefined") return 1;
  return Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
}

function defaultViewport(rootAbs: { x: number; y: number }): Viewport {
  const scale = designScale();
  const W = typeof window !== "undefined" ? window.innerWidth : DESIGN_W;
  const screenX = W / 2 + (ROOT_DESIGN_X - DESIGN_W / 2) * scale;
  const screenY = ROOT_DESIGN_Y * scale;
  return { x: screenX - rootAbs.x * scale, y: screenY - rootAbs.y * scale, zoom: scale };
}

const nodeTypes = { dot: DotNode };

// ─── types ────────────────────────────────────────────────────────────────────

export type PreviewMode = "full" | "guest";

interface Props {
  nodes: DocumentNode[];
  edges: NodeEdge[];
  mode: PreviewMode;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function isRoot(n: DocumentNode) {
  return n.title === "Root" || (n.node_kind as string) === "root";
}

function nodeUnlocked(n: DocumentNode, mode: PreviewMode): boolean {
  if (isRoot(n)) return true;
  return mode === "full"; // "full" = all unlocked, "guest" = all locked
}

// ─── inner (needs useReactFlow) ───────────────────────────────────────────────

function PreviewTreeCanvasInner({ nodes, edges, mode }: Props) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { setViewport } = useReactFlow();
  const rootAbsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoomedOut, setZoomedOut] = useState(false);

  useEffect(() => {
    const root = nodes.find(isRoot);
    rootAbsRef.current = root
      ? { x: root.pos_x ?? 0, y: root.pos_y ?? 0 }
      : { x: 0, y: 0 };

    const flowNodes: Node[] = nodes.map((n): Node => {
      const nodeIsRoot = isRoot(n);
      const unlocked = nodeUnlocked(n, mode);
      return {
        id: String(n.id),
        type: "dot",
        position: { x: n.pos_x ?? 0, y: n.pos_y ?? 0 },
        draggable: false,
        data: nodeIsRoot
          ? { isRoot: true, isLoggedIn: mode === "full", label: n.title }
          : {
              label:      n.title,
              isUnlocked: unlocked,
              price:      n.price,
              indexItems: (n.index_items ?? []).map((item) =>
                typeof item === "string" ? item : (item as { title?: string }).title ?? ""
              ),
              indexCount: (n.index_items ?? []).length,
              readCount:  0,
            },
      };
    });

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const flowEdges: Edge[] = edges.map((e): Edge => {
      const src = byId.get(e.source_id);
      const tgt = byId.get(e.target_id);
      const active =
        !!src && !!tgt &&
        nodeUnlocked(src, mode) &&
        nodeUnlocked(tgt, mode);
      return {
        id:        String(e.id),
        source:    String(e.source_id),
        target:    String(e.target_id),
        type:      "straight",
        style:     active ? EDGE_ACTIVE : EDGE_DIM,
        className: active ? "rf-active-edge" : "rf-dim-edge",
      };
    });

    setRfNodes(flowNodes);
    setRfEdges(flowEdges);
  }, [nodes, edges, mode, setRfNodes, setRfEdges]);

  // Set initial viewport after nodes are set
  const initialized = useRef(false);
  useEffect(() => {
    if (rfNodes.length === 0 || initialized.current) return;
    initialized.current = true;
    setTimeout(() => {
      setViewport(defaultViewport(rootAbsRef.current), { duration: 0 });
    }, 50);
  }, [rfNodes, setViewport]);

  // Reset viewport when mode changes
  useEffect(() => {
    if (rfNodes.length === 0) return;
    setViewport(defaultViewport(rootAbsRef.current), { duration: 300 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleMove = useCallback((_: unknown, vp: Viewport) => {
    const refZoom = designScale();
    const out = vp.zoom < refZoom * DETAIL_ZOOM_FACTOR;
    setZoomedOut((prev) => (prev === out ? prev : out));
  }, []);

  return (
    <DetailVisibleContext.Provider value={!zoomedOut}>
      <div className={`relative z-10 h-full w-full ${zoomedOut ? "tree-zoomed-out" : ""}`}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onMove={handleMove}
          nodeTypes={nodeTypes}
          nodeOrigin={[0.5, 0.5]}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          zoomOnDoubleClick={false}
          minZoom={0.05}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
          style={{ background: "transparent" }}
        />
      </div>
    </DetailVisibleContext.Provider>
  );
}

// ─── exported wrapper ─────────────────────────────────────────────────────────

export default function PreviewTreeCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <PreviewTreeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
