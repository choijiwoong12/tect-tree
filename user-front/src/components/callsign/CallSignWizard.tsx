"use client";

import { useState } from "react";
import {
  ALPHABET,
  JOB_GROUPS,
  EXPERIENCE_LEVELS,
  ACHIEVEMENT_LEVELS,
  CALLSIGN_STEPS,
  buildCallSign,
} from "@/lib/callsign/data";

interface CallSignWizardProps {
  onComplete: (callSign: string) => void;
  onBack?: () => void;
  initialCallsign?: string; // 재설정 시 기존 콜사인 → 각 단계 선택값 미리 채움(빨강)
}

// 콜사인 문자열(알파벳1 + 직업코드2 + 수준1 + 성취도1, 예 "ZER99") → 단계별 선택값으로 역파싱.
function parseCallsign(cs?: string) {
  if (!cs || cs.length < 5) return null;
  const alphabet = cs[0];
  const jobCode = cs.slice(1, 3);
  const level = Number(cs[3]);
  const achievement = Number(cs[4]);
  const jobIndex = JOB_GROUPS.findIndex((g) => g.code === jobCode);
  if (!ALPHABET.includes(alphabet) || jobIndex < 0 || !level || !achievement) return null;
  return { alphabet, jobIndex, level, achievement };
}

// 프레임: 콜사인 부여(CALL SIGN ASSIGNMENT) — 1920 절대좌표(DesignFrame이 화면에 맞춰 축소).
// 4단계: 0 알파벳 · 1 직업군 · 2 수준 · 3 성취도
export function CallSignWizard({ onComplete, onBack, initialCallsign }: CallSignWizardProps) {
  const initial = parseCallsign(initialCallsign);
  const [stage, setStage] = useState(0);
  const [alphabet, setAlphabet] = useState<string | null>(initial?.alphabet ?? null);
  const [jobIndex, setJobIndex] = useState<number | null>(initial?.jobIndex ?? null);
  const [level, setLevel] = useState<number | null>(initial?.level ?? null);
  const [achievement, setAchievement] = useState<number | null>(initial?.achievement ?? null);

  const selectedThisStage =
    (stage === 0 && alphabet !== null) ||
    (stage === 1 && jobIndex !== null) ||
    (stage === 2 && level !== null) ||
    (stage === 3 && achievement !== null);

  function handlePrev() {
    if (stage > 0) setStage(stage - 1);
    else onBack?.();
  }

  function handleNext() {
    if (!selectedThisStage) return;
    if (stage < 3) {
      setStage(stage + 1);
      return;
    }
    const job = JOB_GROUPS[jobIndex as number];
    onComplete(buildCallSign(alphabet as string, job.code, level as number, achievement as number));
  }

  // 우측 설명 (직업군/수준/성취도 선택 시)
  let descTitle: string | null = null;
  let descBody: string | null = null;
  if (stage === 1 && jobIndex !== null) {
    const g = JOB_GROUPS[jobIndex];
    descTitle = `[ ${g.ko.replace("/", " / ")} ${g.en} ]`;
    descBody = g.desc;
  } else if (stage === 2 && level !== null) {
    const l = EXPERIENCE_LEVELS[level - 1];
    descTitle = `[ ${l.level}단계 — ${l.label} ]`;
    descBody = l.desc;
  } else if (stage === 3 && achievement !== null) {
    const a = ACHIEVEMENT_LEVELS[achievement - 1];
    descTitle = `[ ${a.level}단계 — ${a.label} ]`;
    descBody = a.desc;
  }

  // 선택지 스타일: 선택 시 빨강, 그 외 흰색
  const optClass = (active: boolean) =>
    `cursor-pointer select-none transition-colors ${active ? "text-[#FE0000]" : "text-white hover:text-white/60"}`;

  return (
    <div className="relative w-full min-h-[1080px] text-white select-none">
      {/* 타이틀 */}
      <h1 className="absolute left-[132px] top-[158px] font-pixel text-[64px] leading-none whitespace-nowrap">
        CALL SIGN
        <br />
        ASSIGNMENT
      </h1>

      {/* 브레드크럼 — X132 Y428, NanumMyeongjo 20, 현재 단계 빨강 */}
      <div className="absolute left-[132px] top-[428px] font-myeongjo text-[20px] whitespace-nowrap">
        [{" "}
        {CALLSIGN_STEPS.map((label, i) => (
          <span key={i}>
            <span className={i === stage ? "text-[#FE0000]" : "text-white"}>{label}</span>
            {i < CALLSIGN_STEPS.length - 1 ? " / " : ""}
          </span>
        ))}{" "}
        ]
      </div>

      {/* 알파벳 — X148 Y547 W700, Sam3KRFont 55, 2행(13열) 양끝정렬 */}
      {stage === 0 && (
        <div className="absolute left-[148px] top-[547px] w-[700px] font-pixel text-[55px] leading-none">
          <div className="flex justify-between">
            {ALPHABET.slice(0, 13).map((letter) => (
              <span key={letter} onClick={() => setAlphabet(letter)} className={optClass(alphabet === letter)}>
                {letter}
              </span>
            ))}
          </div>
          <div className="flex justify-between mt-[37px]">
            {ALPHABET.slice(13).map((letter) => (
              <span key={letter} onClick={() => setAlphabet(letter)} className={optClass(alphabet === letter)}>
                {letter}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 직업군 — 알파벳과 동일 규격(X148 Y547 W700, Sam3KRFont 55), 7열×3행 양끝정렬 */}
      {stage === 1 && (
        <div className="absolute left-[148px] top-[547px] w-[700px] font-pixel text-[55px] leading-none">
          {[0, 7, 14].map((start) => (
            <div key={start} className={`flex justify-between ${start > 0 ? "mt-[37px]" : ""}`}>
              {JOB_GROUPS.slice(start, start + 7).map((g, i) => {
                const idx = start + i;
                return (
                  <span key={idx} onClick={() => setJobIndex(idx)} className={optClass(jobIndex === idx)}>
                    {g.code}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* 수준/성취도 선택지 — TODO: 다음 배치에서 피그마 값으로 위치/폰트 픽셀 매칭(임시 배치) */}
      {(stage === 2 || stage === 3) && (
        <div className="absolute left-[148px] top-[547px] w-[700px]">
          <div className="flex flex-wrap gap-x-7 gap-y-6 font-pixel text-[40px] leading-none">
            {stage === 2 &&
              EXPERIENCE_LEVELS.map((l) => (
                <span key={l.level} onClick={() => setLevel(l.level)} className={optClass(level === l.level)}>
                  {l.level}
                </span>
              ))}
            {stage === 3 &&
              ACHIEVEMENT_LEVELS.map((a) => (
                <span key={a.level} onClick={() => setAchievement(a.level)} className={optClass(achievement === a.level)}>
                  {a.level}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* 우측 설명 제목 — 브레드크럼과 같은 줄(Y428), 우측 정렬 */}
      {descTitle && (
        <div className="absolute left-[971px] top-[428px] w-[841px] text-right font-myeongjo text-[20px] text-white">
          {descTitle}
        </div>
      )}

      {/* 우측 설명 본문 — 선택지(알파벳/직업군) 첫 줄과 같은 Y547에서 시작, 우측 정렬, 행간 넉넉히(조정 가능) */}
      {descBody && (
        <div className="absolute left-[971px] top-[547px] w-[841px] max-h-[380px] overflow-y-auto whitespace-pre-line text-right font-myeongjo text-[20px] leading-loose text-white/90">
          {descBody}
        </div>
      )}

      {/* 이전/다음 — 그룹 X1311 Y960 W519 H52, 간격 98, Sam3KRFont 44 자간 13%, 흰색 */}
      <div className="absolute left-[1311px] top-[960px] flex items-center gap-[98px] font-pixel text-[44px] tracking-[0.13em] leading-none">
        <button type="button" onClick={handlePrev} className="text-white transition-colors hover:text-white/60">
          ( 이전 )
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!selectedThisStage}
          className="text-white transition-colors hover:text-white/60 disabled:text-white/25 disabled:hover:text-white/25"
        >
          {stage < 3 ? "( 다음 )" : "( 완료 )"}
        </button>
      </div>
    </div>
  );
}
