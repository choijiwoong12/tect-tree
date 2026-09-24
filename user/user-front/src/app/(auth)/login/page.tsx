import { redirect } from "next/navigation";

// 로그인 전용 페이지 폐지 — 로그인은 메인(/)의 LOG IN 노드 → 구글 OAuth로 통합.
export default function LoginPage() {
  redirect("/");
}
