"use client";

import {
  GitBranch,
  Search,
  Settings,
  LayoutDashboard,
  FileText,
  FolderTree,
  Lock,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  tab: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: <LayoutDashboard size={16} />, label: "대시보드", tab: "dashboard" },
  { icon: <FolderTree size={16} />, label: "노드 관리", tab: "nodes" },
  { icon: <Search size={16} />, label: "노드 검색", tab: "search" },
];

const BOTTOM_ITEMS: NavItem[] = [
  { icon: <Settings size={16} />, label: "설정", tab: "settings" },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  totalNodes: number;
}

export default function Sidebar({ activeTab, onTabChange, totalNodes }: SidebarProps) {
  return (
    <aside className="flex flex-col w-[220px] min-w-[220px] h-screen bg-[#1B2537] select-none">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-[#2A3A52]">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-500">
          <GitBranch size={14} className="text-white" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-none">Node Admin</p>
          <p className="text-[#4A6080] text-[10px] mt-0.5">관리자 패널</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-2 mb-2 text-[10px] font-semibold tracking-widest uppercase text-[#4A6080]">
          메인
        </p>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.tab}
            item={item}
            active={activeTab === item.tab}
            onClick={() => onTabChange(item.tab)}
          />
        ))}

        <div className="my-4 border-t border-[#2A3A52]" />

        <p className="px-2 mb-2 text-[10px] font-semibold tracking-widest uppercase text-[#4A6080]">
          통계
        </p>
        <div className="mx-2 rounded-lg bg-[#243045] border border-[#2A3A52] p-3 space-y-2">
          <StatRow label="전체 노드" value={totalNodes} />
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-[#2A3A52] space-y-0.5">
        {BOTTOM_ITEMS.map((item) => (
          <NavButton
            key={item.tab}
            item={item}
            active={activeTab === item.tab}
            onClick={() => onTabChange(item.tab)}
          />
        ))}
      </div>

      {/* User */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-t border-[#2A3A52]">
        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
          A
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-medium truncate">Admin</p>
          <p className="text-[#4A6080] text-[10px] truncate">관리자 계정</p>
        </div>
        <Lock size={12} className="ml-auto text-[#4A6080] shrink-0" />
      </div>
    </aside>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors text-left group",
        active
          ? "bg-[#2D3D56] text-white"
          : "text-[#8FA3BF] hover:bg-[#243045] hover:text-white"
      )}
    >
      <span className={clsx(active ? "text-blue-400" : "text-[#8FA3BF] group-hover:text-blue-400")}>
        {item.icon}
      </span>
      <span className="flex-1 font-medium">{item.label}</span>
      {active && <ChevronRight size={12} className="text-blue-400 shrink-0" />}
    </button>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#8FA3BF] text-xs">{label}</span>
      <span className="text-white text-xs font-semibold">{value.toLocaleString()}</span>
    </div>
  );
}
