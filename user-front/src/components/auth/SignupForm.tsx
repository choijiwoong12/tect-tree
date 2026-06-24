"use client";

import { useState } from "react";
import { PRIVACY_POLICY } from "@/content/legal";

interface SignupFormProps {
  onComplete: () => void;
  onBack?: () => void;
}

// 프레임: 회원가입 창 — 첫 로그인 시 프로필 입력 + 약관 동의 → 다음(콜사인 배정으로)
export function SignupForm({ onComplete, onBack }: SignupFormProps) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"남" | "여" | null>(null);
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [agreeRequired, setAgreeRequired] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const canNext =
    name.trim() !== "" &&
    gender !== null &&
    age.trim() !== "" &&
    phone.trim() !== "" &&
    agreeRequired;

  function handleNext() {
    if (!canNext) return;
    // TODO: 프로필(name/gender/age/phone, 마케팅 동의)을 users 테이블에 저장.
    //       현재 users 스키마에 name/age/sex/phone 컬럼이 없어 컬럼 추가 후 연결 필요.
    onComplete();
  }

  const inputClass =
    "w-full bg-black border border-white/40 rounded text-white px-4 py-3 font-pixel tracking-wider placeholder:text-white/30 focus:outline-none focus:border-red-600 transition-colors";

  return (
    <div className="relative w-full min-h-full text-white px-8 md:px-16 py-12 font-pixel">
      <h1 className="text-3xl md:text-5xl leading-tight tracking-wider">
        WELCOME TO THE
        <br />
        CAMPAIGN
      </h1>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
        {/* 좌: 입력 */}
        <div>
          <p className="text-white/70 text-base mb-8">첫 로그인 시 정보 입력이 필요합니다.</p>

          <div className="flex flex-col gap-6 max-w-md">
            <label className="flex items-center gap-4">
              <span className="w-16 shrink-0">이름</span>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="입력"
                maxLength={40}
              />
            </label>

            <div className="flex items-center gap-4">
              <span className="w-16 shrink-0">성별</span>
              <div className="flex gap-3">
                {(["남", "여"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`border rounded px-6 py-3 tracking-widest transition-colors ${
                      gender === g ? "border-red-600 text-red-500" : "border-white/40 text-white/80 hover:border-white"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-4">
              <span className="w-16 shrink-0">나이</span>
              <input
                className={inputClass}
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="입력"
                inputMode="numeric"
                maxLength={3}
              />
            </label>

            <label className="flex items-center gap-4">
              <span className="w-16 shrink-0">연락처</span>
              <input
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="입력"
                inputMode="tel"
                maxLength={20}
              />
            </label>
          </div>

          <div className="mt-8 flex flex-col gap-3 text-sm">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeRequired}
                onChange={(e) => setAgreeRequired(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <span>
                <span className="font-bold">개인정보처리방침</span> 및 <span className="font-bold">이용약관</span>에 동의합니다. (필수)
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeMarketing}
                onChange={(e) => setAgreeMarketing(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <span>마케팅 정보 수신에 동의합니다. (선택)</span>
            </label>
          </div>
        </div>

        {/* 우: 약관 스크롤 (고정 폰트 + 스크롤) */}
        <div className="border border-white/30 rounded p-5 max-h-[55vh] overflow-y-auto">
          <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-white/35 font-pixel">
{PRIVACY_POLICY}
          </pre>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="mt-10 flex items-center justify-end gap-6 text-xl md:text-2xl">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="border border-white/40 rounded px-8 py-2 tracking-widest hover:border-white transition-colors"
          >
            이전
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext}
          className="border border-white/40 rounded px-8 py-2 tracking-widest hover:border-white transition-colors disabled:opacity-40 disabled:hover:border-white/40"
        >
          다음
        </button>
      </div>
    </div>
  );
}
