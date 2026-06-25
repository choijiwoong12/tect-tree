"use client";

import { useState, type ChangeEvent } from "react";
import { PRIVACY_POLICY } from "@/content/legal";

interface SignupFormProps {
  onComplete: () => void;
  onBack?: () => void;
}

// 입력 행: 비어있고 포커스 아닐 때만 회색 "( 입력 )". 포커스(클릭)하면 괄호·placeholder 모두 사라짐.
function Field({
  label,
  top,
  value,
  onChange,
  inputMode,
  maxLength,
}: {
  label: string;
  top: number;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  inputMode?: "numeric" | "tel" | "text";
  maxLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  const showBrackets = !focused && value === "";

  return (
    <div
      className="absolute left-[132px] w-[551px] h-[46px] flex items-center font-pixel text-[30px] text-white"
      style={{ top: `${top}px` }}
    >
      <span className="w-[120px] shrink-0">{label}</span>
      <span className="shrink-0 mr-4">:</span>
      {showBrackets && <span className="shrink-0 text-white/30">(</span>}
      <input
        className="flex-1 min-w-0 bg-transparent border-0 outline-none p-0 text-center font-pixel text-[30px] text-white placeholder:text-white/30"
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={showBrackets ? "입력" : ""}
        inputMode={inputMode}
        maxLength={maxLength}
      />
      {showBrackets && <span className="shrink-0 text-white/30">)</span>}
    </div>
  );
}

// 프레임: 회원가입 창 (1920 기준 절대좌표 — DesignFrame이 화면에 맞춰 축소).
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

      {/* 이름 / 나이 / 연락처 */}
      <Field label="이름" top={491} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      <Field
        label="나이"
        top={685}
        value={age}
        onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ""))}
        inputMode="numeric"
        maxLength={3}
      />
      <Field label="연락처" top={782} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={20} />

      {/* 성별 — 선택 시 흰색, 미선택은 회색 */}
      <div className="absolute left-[132px] top-[588px] w-[551px] h-[46px] flex items-center font-pixel text-[30px] text-white">
        <span className="w-[120px] shrink-0">성별</span>
        <span className="shrink-0 mr-4">:</span>
        <button
          type="button"
          onClick={() => setGender("남")}
          className={"flex-1 text-center " + (gender === "남" ? "text-white" : "text-white/30 hover:text-white/60")}
        >
          ( 남 )
        </button>
        <button
          type="button"
          onClick={() => setGender("여")}
          className={"flex-1 text-center " + (gender === "여" ? "text-white" : "text-white/30 hover:text-white/60")}
        >
          ( 여 )
        </button>
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
