"use client";

import { useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
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

export const FontSize = Extension.create({
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

// RichEditor(좁은 패널)와 WysiwygEditor(전체화면) 둘 다의 글자 크기 드롭다운이 공유하는 옵션 목록
export const FONT_SIZES = [
  { label: "소 (12px)", value: "12px" },
  { label: "보통 (14px)", value: "14px" },
  { label: "대 (18px)", value: "18px" },
  { label: "특대 (24px)", value: "24px" },
];

export interface TocItem {
  level: number;
  text: string;
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

interface UseNodeEditorOptions {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editorClass: string;
}

/** RichEditor(좁은 패널)와 WysiwygEditor(전체화면) 둘 다에서 쓰는 공통 Tiptap 셋업 — 둘은 서로 다른
 *  useEditor 인스턴스를 각자 마운트하므로(상호 배타적 렌더) 확장 구성만 공유한다. */
export function useNodeEditor({ content, onChange, placeholder, editorClass }: UseNodeEditorOptions) {
  const [toc, setToc] = useState<TocItem[]>([]);
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
        class: editorClass,
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

  return { editor, toc };
}
