"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import NodeList from "@/components/NodeList";
import NodeDetail from "@/components/NodeDetail";
import NodePositionPicker from "@/components/NodePositionPicker";
import GraphView from "@/components/GraphView";
import Dashboard from "@/components/Dashboard";
import LoginPage from "@/components/LoginPage";
import type { DocumentNode } from "@/lib/types";
import {
  supabase,
  fetchAllNodes,
  createNode,
  updateNode,
  deleteNode,
  signOut,
} from "@/lib/supabase";
import { AlertTriangle } from "lucide-react";

type Tab = "dashboard" | "graph" | "nodes" | "search" | "settings";

export default function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (session === null) return <LoginPage />;

  return <AdminShell session={session} onSignOut={() => signOut()} />;
}

function AdminShell({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("nodes");
  const [nodes, setNodes] = useState<DocumentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedNode, setSelectedNode] = useState<DocumentNode | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingNodeData, setPendingNodeData] = useState<Partial<DocumentNode> | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const loadNodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllNodes();
      setNodes(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "노드를 불러오지 못했습니다. Supabase .env 설정을 확인하세요."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  async function handleSave(data: Partial<DocumentNode>) {
    if (isNew) {
      setPendingNodeData(data);
      return;
    }
    setSaving(true);
    try {
      if (selectedNode) {
        const updated = await updateNode(selectedNode.id, data);
        await loadNodes();
        setSelectedNode(updated);
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
          ? String((e as { message: unknown }).message)
          : JSON.stringify(e);
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handlePositionConfirm(posX: number, posY: number) {
    if (!pendingNodeData) return;
    setSaving(true);
    try {
      const created = await createNode({
        title: pendingNodeData.title ?? "새 노드",
        node_kind: pendingNodeData.node_kind ?? "content",
        body_content: pendingNodeData.body_content ?? null,
        parent_id: pendingNodeData.parent_id ?? null,
        is_locked: pendingNodeData.is_locked ?? false,
        file_name: null,
        file_path: null,
        pos_x: posX,
        pos_y: posY,
      });
      await loadNodes();
      setSelectedNode(created);
      setIsNew(false);
      setPendingNodeData(null);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
          ? String((e as { message: unknown }).message)
          : JSON.stringify(e);
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteNode(id);
      await loadNodes();
      setSelectedNode(null);
      setIsNew(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  const [newParentId, setNewParentId] = useState<number | null>(null);

  function handleAddNew(parentId?: number) {
    setIsNew(true);
    setSelectedNode(null);
    setNewParentId(parentId ?? null);
    setTab("nodes");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
      <Sidebar
        activeTab={tab}
        onTabChange={(t) => {
          setTab(t as Tab);
          if (t !== "nodes" && t !== "search") {
            setSelectedNode(null);
            setIsNew(false);
          }
        }}
        totalNodes={nodes.length}
        user={session.user}
        onSignOut={onSignOut}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 h-14 bg-white border-b border-gray-200 shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">
              {tab === "dashboard" && "대시보드"}
              {tab === "graph" && "그래프 뷰"}
              {tab === "nodes" && "노드 관리"}
              {tab === "search" && "노드 검색"}
              {tab === "settings" && "설정"}
            </h1>
            <p className="text-xs text-gray-400">
              {tab === "dashboard" && "전체 현황"}
              {tab === "graph" && `${nodes.length}개 노드 시각화`}
              {tab === "nodes" && `${nodes.length}개 노드`}
              {tab === "search" && "노드 검색"}
              {tab === "settings" && "시스템 설정"}
            </p>
          </div>

          {/* Supabase status */}
          <div className="flex items-center gap-2">
            {error ? (
              <span className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
                <AlertTriangle size={12} />
                DB 연결 오류
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Supabase 연결됨
              </span>
            )}
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 px-6 py-3 bg-red-50 border-b border-red-200">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={loadNodes}
              className="ml-auto text-xs font-medium text-red-600 hover:text-red-700 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {tab === "dashboard" && (
            <Dashboard nodes={nodes} />
          )}

          {tab === "graph" && (
            <GraphView
              nodes={nodes}
              onSelectNode={(node) => {
                setSelectedNode(node);
                setIsNew(false);
                setTab("nodes");
              }}
            />
          )}

          {(tab === "nodes" || tab === "search") && (
            <>
              {/* Node list panel */}
              <div className="w-72 min-w-72 flex flex-col border-r border-gray-200 overflow-hidden">
                <NodeList
                  nodes={nodes}
                  selectedId={selectedNode?.id ?? null}
                  onSelect={(n) => {
                    setSelectedNode(n);
                    setIsNew(false);
                  }}
                  onAdd={handleAddNew}
                  onRefresh={loadNodes}
                  loading={loading}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              </div>

              {/* Detail panel */}
              <NodeDetail
                node={selectedNode}
                allNodes={nodes}
                isNew={isNew}
                parentId={newParentId}
                onSave={handleSave}
                onDelete={handleDelete}
                onClose={() => {
                  setSelectedNode(null);
                  setIsNew(false);
                }}
                saving={saving}
              />
            </>
          )}

          {tab === "settings" && (
            <div className="flex-1 overflow-y-auto p-6 bg-[#F5F7FA]">
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Supabase 연결 정보</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      환경변수(.env.local)에서 설정됩니다.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <EnvRow
                      label="NEXT_PUBLIC_SUPABASE_URL"
                      value={process.env.NEXT_PUBLIC_SUPABASE_URL}
                    />
                    <EnvRow
                      label="NEXT_PUBLIC_SUPABASE_ANON_KEY"
                      value={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "설정됨 ✓" : undefined}
                    />
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      <code className="bg-gray-100 px-1 py-0.5 rounded">.env.local.example</code>을 복사해
                      <code className="bg-gray-100 px-1 py-0.5 rounded ml-1">.env.local</code>을 만든 뒤 값을 입력하세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {pendingNodeData && (
        <NodePositionPicker
          nodes={nodes}
          parentId={pendingNodeData.parent_id ?? null}
          newNodeTitle={pendingNodeData.title ?? "새 노드"}
          onConfirm={handlePositionConfirm}
          onBack={() => setPendingNodeData(null)}
        />
      )}
    </div>
  );
}

function EnvRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50">
      <code className="text-xs text-gray-600">{label}</code>
      <span
        className={
          value
            ? "text-xs text-emerald-600 font-medium"
            : "text-xs text-red-400"
        }
      >
        {value ?? "미설정"}
      </span>
    </div>
  );
}
