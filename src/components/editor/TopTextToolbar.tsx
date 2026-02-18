"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorStore } from "@/src/store/editorStore";

const RB_START = "[[rb]]";
const RB_END = "[[/rb]]";

type ActiveTarget =
  | {
      kind: "line";
      sectionId: string;
      itemId: string;
      lineId: string;
      element: HTMLInputElement | HTMLTextAreaElement;
    }
  | {
      kind: "title";
      sectionId: string;
      itemId: string;
      element: HTMLInputElement | HTMLTextAreaElement;
    };

const resolveActiveTarget = (): ActiveTarget | null => {
  if (typeof document === "undefined") {
    return null;
  }
  const element = document.activeElement;
  if (!element) {
    return null;
  }
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    return null;
  }
  const { kind, sectionId, itemId, lineId } = element.dataset;
  if (!kind || !sectionId || !itemId) {
    return null;
  }
  if (kind === "line" && !lineId) {
    return null;
  }
  if (kind === "line") {
    return { kind: "line", sectionId, itemId, lineId, element };
  }
  if (kind === "title") {
    return { kind: "title", sectionId, itemId, element };
  }
  return null;
};

export default function TopTextToolbar() {
  const updateTextLineText = useEditorStore((state) => state.updateTextLineText);
  const updateTitleItemText = useEditorStore((state) => state.updateTitleItemText);
  const updateTextLineMarks = useEditorStore((state) => state.updateTextLineMarks);
  const updateTitleItemMarks = useEditorStore((state) => state.updateTitleItemMarks);
  const [toolbarColor, setToolbarColor] = useState("#e11d48");
  const [toolbarSize, setToolbarSize] = useState(16);
  const [toolbarLetterSpacing, setToolbarLetterSpacing] = useState(0);
  const [toolbarLineHeight, setToolbarLineHeight] = useState(1.6);
  const [canApply, setCanApply] = useState(false);
  const lastTargetRef = useRef<ActiveTarget | null>(null);
  const lastSelectionRef = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    const updateFromElement = (target: ActiveTarget | null) => {
      if (!target) {
        return;
      }
      lastTargetRef.current = target;
      const start = target.element.selectionStart ?? 0;
      const end = target.element.selectionEnd ?? 0;
      lastSelectionRef.current = { start, end };
    };
    const update = () => {
      const target = resolveActiveTarget();
      updateFromElement(target);
      const selection = lastSelectionRef.current;
      setCanApply(Boolean(target || lastTargetRef.current) && Boolean(selection) && selection!.end > selection!.start);
    };
    update();
    document.addEventListener("selectionchange", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);

  const applyInlineTag = useCallback(
    (tag: string, value?: string) => {
      const target = resolveActiveTarget() ?? lastTargetRef.current;
      if (!target) {
        return;
      }
      const { element } = target;
      const selection = lastSelectionRef.current;
      const start = selection?.start ?? element.selectionStart ?? 0;
      const end = selection?.end ?? element.selectionEnd ?? 0;
      if (start === end) {
        return;
      }
      const currentValue = element.value ?? "";
      const open = value ? `[[${tag}:${value}]]` : `[[${tag}]]`;
      const close = `[[/${tag}]]`;
      const before = currentValue.slice(0, start);
      const selected = currentValue.slice(start, end);
      const after = currentValue.slice(end);
      const nextValue = `${before}${open}${selected}${close}${after}`;

      if (target.kind === "line") {
        updateTextLineText(
          target.sectionId,
          target.itemId,
          target.lineId,
          nextValue
        );
      } else {
        updateTitleItemText(target.sectionId, target.itemId, nextValue);
      }

      requestAnimationFrame(() => {
        element.focus();
        const caret = before.length + open.length + selected.length + close.length;
        element.setSelectionRange(caret, caret);
        lastSelectionRef.current = { start: caret, end: caret };
      });
    },
    [updateTextLineText, updateTitleItemText]
  );

  const applyRedBold = useCallback(() => {
    const target = resolveActiveTarget() ?? lastTargetRef.current;
    if (!target) {
      return;
    }
    const element = target.element;
    const selection = lastSelectionRef.current;
    const start = selection?.start ?? element.selectionStart ?? 0;
    const end = selection?.end ?? element.selectionEnd ?? 0;
    if (start === end) {
      return;
    }
    const currentValue = element.value ?? "";
    const before = currentValue.slice(0, start);
    const selected = currentValue.slice(start, end);
    const after = currentValue.slice(end);
    const nextValue = `${before}${RB_START}${selected}${RB_END}${after}`;

    if (target.kind === "line") {
      updateTextLineText(
        target.sectionId,
        target.itemId,
        target.lineId,
        nextValue
      );
    } else {
      updateTitleItemText(target.sectionId, target.itemId, nextValue);
    }

    requestAnimationFrame(() => {
      element.focus();
      const caret = before.length + RB_START.length + selected.length + RB_END.length;
      element.setSelectionRange(caret, caret);
      lastSelectionRef.current = { start: caret, end: caret };
    });
  }, [updateTextLineText, updateTitleItemText]);

  const applyAlign = useCallback(
    (align: "left" | "center" | "right") => {
      const target = resolveActiveTarget() ?? lastTargetRef.current;
      if (!target) {
        return;
      }
      if (target.kind === "line") {
        updateTextLineMarks(
          target.sectionId,
          target.itemId,
          target.lineId,
          { textAlign: align }
        );
      } else {
        updateTitleItemMarks(target.sectionId, target.itemId, { textAlign: align });
      }
    },
    [updateTextLineMarks, updateTitleItemMarks]
  );

  const disabled = !canApply;

  return (
    <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="ui-button h-7 w-7 px-0"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyInlineTag("b")}
            disabled={disabled}
            title="太字"
          >
            B
          </button>
          <button
            type="button"
            className="ui-button h-7 w-7 px-0"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyInlineTag("i")}
            disabled={disabled}
            title="斜体"
          >
            I
          </button>
          <button
            type="button"
            className="ui-button h-7 w-7 px-0"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyInlineTag("u")}
            disabled={disabled}
            title="下線"
          >
            U
          </button>
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onMouseDown={(event) => event.preventDefault()}
            onClick={applyRedBold}
            disabled={disabled}
          >
            赤太
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-7 w-7 cursor-pointer rounded border border-[var(--ui-border)] bg-transparent"
            value={toolbarColor}
            onChange={(event) => {
              const next = event.target.value;
              setToolbarColor(next);
              applyInlineTag("color", next);
            }}
            disabled={disabled}
            title="文字色"
          />
          <input
            type="number"
            className="ui-input h-7 w-16 text-[11px]"
            value={toolbarSize}
            min={8}
            max={72}
            onChange={(event) => setToolbarSize(Number(event.target.value))}
            disabled={disabled}
            title="文字サイズ"
          />
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyInlineTag("size", String(toolbarSize))}
            disabled={disabled}
          >
            サイズ
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="ui-input h-7 w-16 text-[11px]"
            value={toolbarLineHeight}
            min={0.8}
            max={3}
            step={0.1}
            onChange={(event) => setToolbarLineHeight(Number(event.target.value))}
            disabled={disabled}
            title="行間"
          />
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyInlineTag("lh", String(toolbarLineHeight))}
            disabled={disabled}
          >
            行間
          </button>
          <input
            type="number"
            className="ui-input h-7 w-16 text-[11px]"
            value={toolbarLetterSpacing}
            min={-2}
            max={10}
            step={0.1}
            onChange={(event) => setToolbarLetterSpacing(Number(event.target.value))}
            disabled={disabled}
            title="字間"
          />
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyInlineTag("ls", String(toolbarLetterSpacing))}
            disabled={disabled}
          >
            字間
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="ui-button h-7 w-7 px-0"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyAlign("left")}
            disabled={disabled}
            title="左揃え"
          >
            L
          </button>
          <button
            type="button"
            className="ui-button h-7 w-7 px-0"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyAlign("center")}
            disabled={disabled}
            title="中央揃え"
          >
            C
          </button>
          <button
            type="button"
            className="ui-button h-7 w-7 px-0"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyAlign("right")}
            disabled={disabled}
            title="右揃え"
          >
            R
          </button>
        </div>
      </div>
    </div>
  );
}
