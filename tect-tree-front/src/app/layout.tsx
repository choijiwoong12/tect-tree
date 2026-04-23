import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATHENA DOCTRINE TECH TREE",
  description: "문서 노드 기반 테크트리 열람 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
