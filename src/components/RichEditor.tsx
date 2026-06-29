"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Highlighter,
  Undo,
  Redo,
  Minus,
  BookOpen,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

// Custom FontSize extension built on top of TextStyle
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
            renderHTML: (attrs) =>
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});

const FONT_SIZES = [
  { label: "소 (12px)", value: "12px" },
  { label: "보통 (14px)", value: "14px" },
  { label: "대 (18px)", value: "18px" },
  { label: "특대 (24px)", value: "24px" },
];

interface TocItem {
  level: number;
  text: string;
}

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

interface JsonNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  text?: string;
}

function extractToc(json: { content?: JsonNode[] }): TocItem[] {
  return (json.content ?? [])
    .filter((n) => n.type === "heading")
    .map((n) => ({
      level: (n.attrs?.level as number) ?? 1,
      text: n.content?.map((c) => c.text ?? "").join("") ?? "",
    }));
}

export default function RichEditor({ content, onChange, placeholder }: RichEditorProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  // 마지막으로 onChange에 전달한 HTML을 기억해서 불필요한 setContent 호출을 막음
  const lastEmittedHtml = useRef<string>("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: placeholder ?? "노드 내용을 입력하세요...",
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedHtml.current = html;
      onChange(html);
      setToc(extractToc(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[200px] prose prose-sm max-w-none",
      },
    },
  });

  useEffect(() => {
    // 자신이 내보낸 HTML이 다시 content로 들어올 때는 setContent를 호출하지 않음 (커서 리셋 방지)
    if (editor && content !== lastEmittedHtml.current && content !== editor.getHTML()) {
      lastEmittedHtml.current = content ?? "";
      editor.commands.setContent(content ?? "");
      setToc(extractToc(editor.getJSON()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return null;

  const currentFontSize = editor.getAttributes("textStyle").fontSize ?? "";

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
        {/* Font size */}
        <select
          value={currentFontSize}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (e.target.value) {
              editor.chain().focus().setFontSize(e.target.value).run();
            } else {
              editor.chain().focus().unsetFontSize().run();
            }
          }}
          className="text-xs text-gray-600 bg-white border border-gray-200 rounded-md px-1.5 py-1 focus:outline-none hover:border-gray-300 cursor-pointer h-[26px]"
        >
          <option value="">크기</option>
          {FONT_SIZES.map((fs) => (
            <option key={fs.value} value={fs.value}>
              {fs.label}
            </option>
          ))}
        </select>

        <Divider />

        <ToolGroup>
          <ToolBtn
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="굵게"
          >
            <Bold size={13} />
          </ToolBtn>
          <ToolBtn
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="기울임"
          >
            <Italic size={13} />
          </ToolBtn>
          <ToolBtn
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="밑줄"
          >
            <UnderlineIcon size={13} />
          </ToolBtn>
          <ToolBtn
            active={editor.isActive("highlight")}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            title="형광펜"
          >
            <Highlighter size={13} />
          </ToolBtn>
        </ToolGroup>

        <Divider />

        <ToolGroup>
          <ToolBtn
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="제목 (목차)"
          >
            <Heading1 size={13} />
          </ToolBtn>
        </ToolGroup>

        <Divider />

        <ToolGroup>
          <ToolBtn
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="목록"
          >
            <List size={13} />
          </ToolBtn>
          <ToolBtn
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="번호 목록"
          >
            <ListOrdered size={13} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="구분선"
          >
            <Minus size={13} />
          </ToolBtn>
        </ToolGroup>

        <Divider />

        <ToolGroup>
          <ToolBtn
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            title="왼쪽 정렬"
          >
            <AlignLeft size={13} />
          </ToolBtn>
          <ToolBtn
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            title="가운데 정렬"
          >
            <AlignCenter size={13} />
          </ToolBtn>
          <ToolBtn
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            title="오른쪽 정렬"
          >
            <AlignRight size={13} />
          </ToolBtn>
        </ToolGroup>

        <Divider />

        <ToolGroup>
          <ToolBtn
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="실행 취소"
          >
            <Undo size={13} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="다시 실행"
          >
            <Redo size={13} />
          </ToolBtn>
        </ToolGroup>

        <Divider />

        {/* TOC toggle — floating popover */}
        <div className="relative">
          <ToolBtn
            active={showToc}
            onClick={() => setShowToc((v) => !v)}
            title="목차 보기"
          >
            <BookOpen size={13} />
          </ToolBtn>

          {showToc && (
            <div className="absolute top-full right-0 mt-1.5 z-50 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  문서 목차
                </span>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowToc(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
              <div className="px-3 py-2.5 max-h-64 overflow-y-auto">
                {toc.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-1">
                    H1 / H2 / H3으로 소제목을 추가하면 여기에 표시됩니다.
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    {toc.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 py-0.5 text-xs text-gray-700 truncate rounded hover:bg-gray-50 px-1"
                        style={{ paddingLeft: `${4 + (item.level - 1) * 12}px` }}
                      >
                        <span className="shrink-0 text-[9px] font-bold text-gray-300 w-5">
                          H{item.level}
                        </span>
                        <span className="truncate">
                          {item.text || <em className="text-gray-300 not-italic">빈 제목</em>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center">{children}</div>;
}

function Divider() {
  return <div className="w-px h-4 bg-gray-200 mx-1" />;
}

function ToolBtn({
  children,
  onClick,
  active,
  disabled,
  title,
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
        active
          ? "bg-blue-100 text-blue-700"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800",
        disabled && "opacity-30 pointer-events-none"
      )}
    >
      {children}
    </button>
  );
}
