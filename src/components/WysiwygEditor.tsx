"use client";

import { EditorContent } from "@tiptap/react";
import { Bold, Italic, Underline as UnderlineIcon, Heading1, Minus, Undo, Redo, Save, X, Minimize2 } from "lucide-react";
import clsx from "clsx";
import { useNodeEditor } from "./useNodeEditor";

// 유저 화면 DocumentViewer의 .document-body와 동일한 타이포그래피 — 실제로 읽힐 모습 그대로 편집한다.
const DOCUMENT_BODY_CLASS =
  "focus:outline-none font-myeongjo text-[20px] md:text-[22px] leading-loose break-keep min-h-[40vh] " +
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 " +
  "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 " +
  "[&_p]:mb-4 [&_strong]:font-bold " +
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 " +
  "[&_hr]:border-neutral-600 [&_hr]:my-6";

interface WysiwygEditorProps {
  title: string;
  setTitle: (v: string) => void;
  bodyContent: string;
  setBodyContent: (html: string) => void;
  saving: boolean;
  onSave: () => void;
  onExit: () => void;
  onClose: () => void;
  className: string;
}

export default function WysiwygEditor({
  title, setTitle, bodyContent, setBodyContent, saving, onSave, onExit, onClose, className,
}: WysiwygEditorProps) {
  const { editor, toc } = useNodeEditor({
    content: bodyContent,
    onChange: setBodyContent,
    placeholder: "내용을 입력하세요...",
    editorClass: DOCUMENT_BODY_CLASS,
  });

  if (!editor) return null;

  return (
    <div className={clsx(className, "wysiwyg-editor z-50 bg-[#0a0a0a] text-neutral-100 flex flex-col")}>
      {/* 헤더 — 유저 화면 헤더(ATHENA DOCTRINE 로고 + 빨간 줄)와 동일한 구성 */}
      <div className="relative h-[64px] shrink-0 border-b border-white/10">
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-[#FE0000]" />
        <span className="absolute left-7 top-1/2 -translate-y-1/2 font-pixel text-xl tracking-wide">
          ATHENA DOCTRINE
        </span>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <button
            onClick={onExit}
            title="좁은 패널로 돌아가기"
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Minimize2 size={15} />
          </button>
          <button
            onClick={onClose}
            title="닫기"
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 서식 툴바 */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-white/10 bg-white/[0.03] shrink-0">
        <DarkToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게">
          <Bold size={13} />
        </DarkToolBtn>
        <DarkToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임">
          <Italic size={13} />
        </DarkToolBtn>
        <DarkToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="밑줄">
          <UnderlineIcon size={13} />
        </DarkToolBtn>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <DarkToolBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="제목 (목차)">
          <Heading1 size={13} />
        </DarkToolBtn>
        <DarkToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선">
          <Minus size={13} />
        </DarkToolBtn>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <DarkToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="실행 취소">
          <Undo size={13} />
        </DarkToolBtn>
        <DarkToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="다시 실행">
          <Redo size={13} />
        </DarkToolBtn>
        <div className="flex-1" />
        <button
          onClick={onSave}
          disabled={saving || !title.trim()}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            saving || !title.trim()
              ? "bg-white/5 text-neutral-600 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-500 text-white"
          )}
        >
          <Save size={12} />
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* 본문 + 우측 목차 레일 — 유저가 보는 DocumentViewer와 동일한 레이아웃 */}
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto scrollbar-hide">
          <div className="mx-auto w-full max-w-[1100px] py-10 pl-10 pr-24">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full bg-transparent font-pixel text-4xl text-red-600 tracking-wider mb-12 outline-none placeholder:text-red-900/60 break-keep"
            />
            <EditorContent editor={editor} />
            <div className="h-[30vh]" aria-hidden />
          </div>
        </div>

        {toc.length > 0 && (
          <div className="pointer-events-none absolute right-[21px] top-0 bottom-0 flex w-[42px] flex-col items-center py-12">
            <div className="absolute left-1/2 top-12 bottom-12 w-px -translate-x-1/2 bg-neutral-700" />
            <div className="relative flex h-full flex-col justify-between">
              {toc.map((item, i) => (
                <span
                  key={i}
                  title={item.text || `제목 ${i + 1}`}
                  className="h-[14px] w-[14px] rounded-full border border-white bg-white"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DarkToolBtn({
  children, onClick, active, disabled, title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={clsx(
        "p-1.5 rounded-md transition-colors",
        active ? "bg-white/15 text-white" : "text-neutral-400 hover:bg-white/10 hover:text-white",
        disabled && "opacity-30 pointer-events-none"
      )}
    >
      {children}
    </button>
  );
}
