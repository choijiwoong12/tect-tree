import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/common/Header";
import { AuthProvider } from "@/components/auth/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// 로컬 폰트(Google 로드 지양) — public/fonts
const sam3kr = localFont({
  src: "../../public/fonts/Sam3KRFont.ttf",
  variable: "--font-sam3kr",
  display: "swap",
});
const nanum = localFont({
  src: "../../public/fonts/NanumMyeongjo.ttf",
  variable: "--font-nanum",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Athena Doctrine",
  description: "Tech tree progression service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${inter.variable} ${sam3kr.variable} ${nanum.variable}`}>
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
