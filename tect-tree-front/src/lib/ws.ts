const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "";

export function openAdminTreeEditorSocket(accessToken: string): WebSocket {
  const url = `${WS_BASE}/ws/admin/tree-editor?token=${encodeURIComponent(accessToken)}`;
  return new WebSocket(url);
}
