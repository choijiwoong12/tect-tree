"use client";

import { useState } from "react";
import { PRIVACY_POLICY } from "@/content/legal";

interface SignupFormProps {
  onComplete: () => void;
  onBack?: () => void;
}

// 프레임: 회원가입 창 (1920 기준 절대좌표).
// 확정값: 타이틀 Sam3KRFont 64 @132,158 / 부제 NanumMyeongjo 25 @132,366 /
//        이름·성별·나이 행 30px @132, Y491/588/685, W551. 입력칸 테두리 없음(허공), 입력 Sam3KRFont.
// (연락처/체크박스/약관박스/다음 = 다음 배치 전까지 근사)
export function SignupForm({ onComplete }: SignupFormProps) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"남" | "여" | null>(null);
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [agreeRequired, setAgreeRequired] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const canNext =
    name.trim() !== "" && gender !== null && age.trim() !== "" && phone.trim() !== "" && agreeRequired;

  function handleNext() {
    if (!canNext) return;
    // TODO: 프로필(name/gender/age/phone, 마케팅 동의) → users 테이블 저장 (스키마 컬럼 추가 후)
    onComplete();
  }

  const inputCls =
    "flex-1 bg-transparent border-0 outline-none p-0 font-pixel text-[30px] text-white placeholder:text-white/30";

  return (
    <div className="relative w-full min-h-[1080px] text-white select-none">
      {/* 타이틀 */}
      <h1 className="absolute left-[132px] top-[158px] font-pixel text-[64px] leading-none text-white whitespace-nowrap">
        WELCOME TO THE
        <br />
        CAMPAIGN
      </h1>

      {/* 부제 */}
      <p className="absolute left-[132px] top-[366px] font-myeongjo text-[25px] text-white/90">
        첫 로그인 시 정보 입력이 필요합니다.
      </p>

      {/* 이름 */}
      <div className="absolute left-[132px] top-[491px] w-[551px] flex items-center font-pixel text-[30px] text-white">
        <span className="w-[120px] shrink-0">이름</span>
        <span className="shrink-0 mr-4">:</span>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="( 입력 )" maxLength={40} />
      </div>

      {/* 성별 — 선택 시 흰색 */}
      <div className="absolute left-[132px] top-[588px] w-[551px] flex items-center font-pixel text-[30px] text-white">
        <span className="w-[120px] shrink-0">성별</span>
        <span className="shrink-0 mr-4">:</span>
        <button type="button" onClick={() => setGender("남")} className={gender === "남" ? "text-white" : "text-white/40 hover:text-white/70"}>
          ( 남 )
        </button>
        <button type="button" onClick={() => setGender("여")} className={"ml-8 " + (gender === "여" ? "text-white" : "text-white/40 hover:text-white/70")}>
          ( 여 )
        </button>
      </div>

      {/* 나이 */}
      <div className="absolute left-[132px] top-[685px] w-[551px] flex items-center font-pixel text-[30px] text-white">
        <span className="w-[120px] shrink-0">나이</span>
        <span className="shrink-0 mr-4">:</span>
        <input
          className={inputCls}
          value={age}
          onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="( 입력 )"
          inputMode="numeric"
          maxLength={3}
        />
      </div>

      {/* 연락처 (Y782 추정 — 다음 배치에서 확정) */}
      <div className="absolute left-[132px] top-[782px] w-[551px] flex items-center font-pixel text-[30px] text-white">
        <span className="w-[120px] shrink-0">연락처</span>
        <span className="shrink-0 mr-4">:</span>
        <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="( 입력 )" inputMode="tel" maxLength={20} />
      </div>

      {/* 동의 체크 (위치 근사) */}
      <div className="absolute left-[132px] top-[900px] flex flex-col gap-3 font-myeongjo text-[16px]">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={agreeRequired} onChange={(e) => setAgreeRequired(e.target.checked)} className="w-4 h-4 accent-red-600" />
          <span>
            <span className="font-bold">개인정보처리방침</span> 및 <span className="font-bold">이용약관</span>에 동의합니다.
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={agreeMarketing} onChange={(e) => setAgreeMarketing(e.target.checked)} className="w-4 h-4 accent-red-600" />
          <span>마케팅 정보 수신에 동의합니다.</span>
        </label>
      </div>

      {/* 약관 박스 (우, 위치 근사 — 다음 배치에서 확정) */}
      <div className="absolute left-[685px] top-[280px] w-[745px] h-[455px] border border-white/25 overflow-y-auto px-6 py-4">
        <pre className="whitespace-pre-wrap break-words font-myeongjo text-[16px] leading-relaxed text-white/45">
{PRIVACY_POLICY}
        </pre>
      </div>

      {/* 다음 (위치 근사) */}
      <button
        type="button"
        onClick={handleNext}
        disabled={!canNext}
        className="absolute left-[1250px] top-[950px] font-pixel text-[30px] text-white hover:text-red-500 disabled:opacity-40 disabled:hover:text-white transition-colors"
      >
        ( 다음 )
      </button>
    </div>
  );
}
