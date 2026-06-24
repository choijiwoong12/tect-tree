import { redirect } from "next/navigation";

// 회원가입은 메인(/) 흐름의 전체화면 단계로 통합됨 → 레거시 라우트는 메인으로 리다이렉트.
export default function SignupPage() {
  redirect("/");
}
