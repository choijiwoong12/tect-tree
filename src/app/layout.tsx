import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Node Admin",
  description: "노드 관리 어드민 패널",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
