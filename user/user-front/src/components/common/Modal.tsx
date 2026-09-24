"use client";

import type { ReactNode } from "react";

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1b1c22", padding: 24, maxWidth: 480, margin: "10vh auto" }}>
        {children}
      </div>
    </div>
  );
}
