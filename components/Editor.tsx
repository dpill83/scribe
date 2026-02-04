"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

const DEFAULT_DOC: JSONContent = { type: "doc", content: [] };

function parseContentJson(raw: string | null | undefined): JSONContent {
  if (!raw || typeof raw !== "string") return DEFAULT_DOC;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "type" in parsed && (parsed as { type: string }).type === "doc") {
      return parsed as JSONContent;
    }
  } catch {
    // ignore
  }
  return DEFAULT_DOC;
}

export interface EditorProps {
  pageId: string;
  initialTitle: string;
  initialContent: string;
  onSave: (data: { title: string; contentJson: string }) => Promise<void>;
}

export function Editor({
  pageId,
  initialTitle,
  initialContent,
  onSave,
}: EditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedAtRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (payload: { title: string; contentJson: string }) => {
      setStatus("saving");
      try {
        await onSave(payload);
        setStatus("saved");
        if (savedAtRef.current) clearTimeout(savedAtRef.current);
        savedAtRef.current = setTimeout(() => {
          setStatus("idle");
          savedAtRef.current = null;
        }, 2000);
      } catch (e) {
        console.error(e);
        setStatus("idle");
      }
    },
    [onSave]
  );

  const debouncedSave = useCallback(
    (payload: { title: string; contentJson: string }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        save(payload);
      }, 600);
    },
    [save]
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content: parseContentJson(initialContent),
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral dark:prose-invert max-w-none min-h-[200px] focus:outline-none px-4 py-2",
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      debouncedSave({ title, contentJson: JSON.stringify(json) });
    },
  });

  useEffect(() => {
    if (!editor) return;
    const doc = parseContentJson(initialContent);
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(doc)) {
      editor.commands.setContent(doc);
    }
  }, [pageId, initialContent, editor]);

  useEffect(() => {
    setTitle(initialTitle);
  }, [pageId, initialTitle]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    debouncedSave({ title: value, contentJson: editor?.getJSON() ? JSON.stringify(editor.getJSON()) : initialContent });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (editor) {
        save({
          title,
          contentJson: JSON.stringify(editor.getJSON()),
        });
      }
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (savedAtRef.current) clearTimeout(savedAtRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 px-4 py-2 shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="flex-1 text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-0"
          placeholder="Untitled"
        />
        <span className="text-sm text-neutral-500 shrink-0">
          {status === "saving" && "Saving…"}
          {status === "saved" && "Saved"}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
