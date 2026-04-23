"use client";

import { useEffect, useRef, useState } from "react";

import { getAccessToken } from "@/lib/auth";
import { openAdminTreeEditorSocket } from "@/lib/ws";
import type { TreeEditEvent } from "@/types/tree";

export function useTreeSocket() {
  const [events, setEvents] = useState<TreeEditEvent[]>([]);
  const ref = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const ws = openAdminTreeEditorSocket(token);
    ref.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as TreeEditEvent;
        setEvents((prev) => [...prev, data]);
      } catch {}
    };

    return () => ws.close();
  }, []);

  return { events, socket: ref.current };
}
