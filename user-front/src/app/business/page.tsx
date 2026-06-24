import Link from "next/link";
import { BUSINESS_INFO } from "@/content/business";

// 로그인 후 사업자 정보 열람용 별도 페이지 (전자상거래법 표시의무).
export default function BusinessPage() {
  return (
    <main className="min-h-screen bg-black text-white font-pixel px-8 md:px-16 py-16">
      <Link href="/" className="text-white/50 hover:text-white text-sm tracking-wider">
        ← 메인으로
      </Link>

      <h1 className="text-3xl mt-10 mb-8">사업자 정보</h1>

      <div className="space-y-2 text-sm text-white/80 leading-relaxed max-w-2xl">
        <div>{BUSINESS_INFO.name}</div>
        <div>대표 {BUSINESS_INFO.ceo}</div>
        <div>사업자등록번호 {BUSINESS_INFO.bizNo}</div>
        <div>통신판매업신고 {BUSINESS_INFO.mailOrderNo}</div>
        <div>{BUSINESS_INFO.address}</div>
        <div>고객센터 {BUSINESS_INFO.email} · {BUSINESS_INFO.phone}</div>
        <div>{BUSINESS_INFO.hours}</div>
      </div>

      {/* TODO: 이용약관/개인정보처리방침 페이지 링크 연결 */}
    </main>
  );
}
