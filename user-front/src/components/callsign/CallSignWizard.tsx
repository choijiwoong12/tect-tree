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
}

export function CallSignWizard({ onComplete, onBack }: CallSignWizardProps) {
  const [stage, setStage] = useState(0); // 0 알파벳 · 1 직업군 · 2 수준 · 3 성취도
  const [alphabet, setAlphabet] = useState<string | null>(null);
  const [jobIndex, setJobIndex] = useState<number | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [achievement, setAchievement] = useState<number | null>(null);

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

  // 우측 설명
  let descTitle: string | null = null;
  let descBody: string | null = null;
  if (stage === 1 && jobIndex !== null) {
    const g = JOB_GROUPS[jobIndex];
    descTitle = `[ ${g.ko} / ${g.en} ]`;
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

  const optionBase =
    "cursor-pointer font-pixel transition-colors select-none hover:text-white";

  return (
    <div className="relative w-full h-full flex flex-col text-white px-10 md:px-16 py-12">
      <h1 className="font-pixel text-3xl md:text-5xl leading-tight tracking-wider">
        CALL SIGN
        <br />
        ASSIGNMENT
      </h1>

      {/* breadcrumb */}
      <div className="mt-10 font-pixel text-sm md:text-base tracking-wide text-white/70">
        [{" "}
        {CALLSIGN_STEPS.map((label, i) => (
          <span key={i}>
            <span className={i === stage ? "text-red-600" : "text-white/70"}>{label}</span>
            {i < CALLSIGN_STEPS.length - 1 ? " / " : ""}
          </span>
        ))}{" "}
        ]
      </div>

      <div className="mt-10 flex-1 grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* 좌: 선택지 */}
        <div className="font-pixel">
          {stage === 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-5 text-3xl md:text-4xl">
              {ALPHABET.map((letter) => (
                <span
                  key={letter}
                  onClick={() => setAlphabet(letter)}
                  className={`${optionBase} ${alphabet === letter ? "text-red-600" : "text-white/85"}`}
                >
                  {letter}
                </span>
              ))}
            </div>
          )}

          {stage === 1 && (
            <div className="flex flex-wrap gap-x-6 gap-y-5 text-2xl md:text-3xl">
              {JOB_GROUPS.map((g, i) => (
                <span
                  key={i}
                  onClick={() => setJobIndex(i)}
                  className={`${optionBase} ${jobIndex === i ? "text-red-600" : "text-white/85"}`}
                >
                  {g.code}
                </span>
              ))}
            </div>
          )}

          {stage === 2 && (
            <div className="flex flex-wrap gap-x-7 gap-y-5 text-3xl md:text-4xl">
              {EXPERIENCE_LEVELS.map((l) => (
                <span
                  key={l.level}
                  onClick={() => setLevel(l.level)}
                  className={`${optionBase} ${level === l.level ? "text-red-600" : "text-white/85"}`}
                >
                  {l.level}
                </span>
              ))}
            </div>
          )}

          {stage === 3 && (
            <div className="flex flex-wrap gap-x-7 gap-y-5 text-3xl md:text-4xl">
              {ACHIEVEMENT_LEVELS.map((a) => (
                <span
                  key={a.level}
                  onClick={() => setAchievement(a.level)}
                  className={`${optionBase} ${achievement === a.level ? "text-red-600" : "text-white/85"}`}
                >
                  {a.level}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 우: 설명 (고정 폰트 + 스크롤, 자동축소 없음) */}
        <div className="font-pixel text-sm md:text-base leading-relaxed text-white/80">
          {descTitle && (
            <div className="text-right text-white mb-4">{descTitle}</div>
          )}
          {descBody && (
            <div className="max-h-[40vh] overflow-y-auto whitespace-pre-line text-right pr-1">
              {descBody}
            </div>
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="mt-8 flex items-center justify-center gap-8 font-pixel text-xl md:text-2xl">
        <button
          type="button"
          onClick={handlePrev}
          className="border border-white/40 rounded px-8 py-2 tracking-widest hover:border-white transition-colors"
        >
          이전
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!selectedThisStage}
          className="border border-white/40 rounded px-8 py-2 tracking-widest hover:border-white transition-colors disabled:opacity-40 disabled:hover:border-white/40"
        >
          {stage < 3 ? "다음" : "완료"}
        </button>
      </div>
    </div>
  );
}
