"use client";

import { useCallback, useRef, useState } from "react";

const debugLog = (message: string, payload?: Record<string, unknown>) => {
  console.debug("[selection-debug]", message, payload ?? {});
};

type SupportedEditor = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

type SavedInputSelection = {
  start: number;
  end: number;
};

type SavedSelection = {
  editorId: string;
  editorEl: SupportedEditor;
  inputSelection?: SavedInputSelection;
  range?: Range;
};

export type TextSelectionCommand =
  | { type: "bold" }
  | { type: "underline" }
  | { type: "color"; color: string };

const isSupportedEditor = (value: unknown): value is SupportedEditor => {
  if (!value) return false;
  return (
    value instanceof HTMLInputElement ||
    value instanceof HTMLTextAreaElement ||
    (value instanceof HTMLElement && value.isContentEditable)
  );
};

const setInputValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const proto = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

const buildWrappedText = (selected: string, command: TextSelectionCommand) => {
  if (command.type === "bold") {
    return `<strong>${selected}</strong>`;
  }
  if (command.type === "underline") {
    return `<u>${selected}</u>`;
  }
  return `<span style=\"color:${command.color};\">${selected}</span>`;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const unwrapColorSpans = (value: string) => {
  const colorSpanRegex = /<span\s+style=("|')\s*color\s*:[^"']*;?\s*\1>([\s\S]*?)<\/span>/gi;
  let next = value;
  let prev = "";
  while (next !== prev) {
    prev = next;
    next = next.replace(colorSpanRegex, "$2");
  }
  return next;
};

const isAlreadySameColorWrapped = (selected: string, color: string) => {
  const pattern = new RegExp(
    `^<span\\s+style=("|')\\s*color\\s*:\\s*${escapeRegExp(color)}\\s*;?\\s*\\1>[\\s\\S]*<\\/span>$`,
    "i"
  );
  return pattern.test(selected.trim());
};

export function useTextSelectionManager() {
  const savedRangeRef = useRef<Range | null>(null);
  const activeEditorIdRef = useRef<string | null>(null);
  const activeEditorElRef = useRef<SupportedEditor | null>(null);
  const savedInputSelectionRef = useRef<SavedInputSelection | null>(null);
  const [hasSelectionState, setHasSelectionState] = useState(false);

  const clearSelection = useCallback(() => {
    savedRangeRef.current = null;
    activeEditorIdRef.current = null;
    activeEditorElRef.current = null;
    savedInputSelectionRef.current = null;
    setHasSelectionState(false);
  }, []);

  const saveSelection = useCallback((editorId: string, editorEl: EventTarget | null) => {
    if (!isSupportedEditor(editorEl)) {
      clearSelection();
      return;
    }

    if (editorEl instanceof HTMLInputElement || editorEl instanceof HTMLTextAreaElement) {
      const start = editorEl.selectionStart ?? 0;
      const end = editorEl.selectionEnd ?? 0;
      if (end <= start) {
        clearSelection();
        return;
      }
      activeEditorIdRef.current = editorId;
      activeEditorElRef.current = editorEl;
      savedInputSelectionRef.current = { start, end };
      savedRangeRef.current = null;
      setHasSelectionState(true);
      debugLog("selection saved", {
        editorType: editorEl.tagName.toLowerCase(),
        start,
        end,
      });
      debugLog("active editor id", { editorId });
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      clearSelection();
      return;
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed || !editorEl.contains(range.commonAncestorContainer)) {
      clearSelection();
      return;
    }
    activeEditorIdRef.current = editorId;
    activeEditorElRef.current = editorEl;
    savedRangeRef.current = range.cloneRange();
    savedInputSelectionRef.current = null;
    setHasSelectionState(true);
    debugLog("selection saved", {
      editorType: "contenteditable",
      textLength: range.toString().length,
    });
    debugLog("active editor id", { editorId });
  }, [clearSelection]);

  const restoreSelection = useCallback(() => {
    const editorEl = activeEditorElRef.current;
    if (!editorEl) {
      return null;
    }

    if (editorEl instanceof HTMLInputElement || editorEl instanceof HTMLTextAreaElement) {
      const selection = savedInputSelectionRef.current;
      if (!selection) {
        debugLog("restoreSelection result", { success: false, reason: "missing-input-selection" });
        return null;
      }
      editorEl.focus();
      editorEl.setSelectionRange(selection.start, selection.end);
      debugLog("restoreSelection result", {
        success: true,
        editorId: activeEditorIdRef.current,
        editorType: editorEl.tagName.toLowerCase(),
      });
      return {
        editorId: activeEditorIdRef.current,
        editorEl,
      } as SavedSelection;
    }

    const range = savedRangeRef.current;
    if (!range) {
      debugLog("restoreSelection result", { success: false, reason: "missing-range" });
      return null;
    }
    const selection = window.getSelection();
    if (!selection) {
      debugLog("restoreSelection result", { success: false, reason: "missing-window-selection" });
      return null;
    }
    editorEl.focus();
    selection.removeAllRanges();
    selection.addRange(range.cloneRange());
    debugLog("restoreSelection result", {
      success: true,
      editorId: activeEditorIdRef.current,
      editorType: "contenteditable",
    });
    return {
      editorId: activeEditorIdRef.current,
      editorEl,
      range: range.cloneRange(),
    } as SavedSelection;
  }, []);

  const applyCommand = useCallback((command: TextSelectionCommand) => {
    const restored = restoreSelection();
    if (!restored) {
      return false;
    }

    if (command.type === "color") {
      debugLog("applyColor called", { color: command.color });
    }

    const { editorId, editorEl } = restored;

    if (editorEl instanceof HTMLInputElement || editorEl instanceof HTMLTextAreaElement) {
      const selection = savedInputSelectionRef.current;
      if (!selection) {
        return false;
      }
      const current = editorEl.value ?? "";
      const before = current.slice(0, selection.start);
      const selected = current.slice(selection.start, selection.end);
      const after = current.slice(selection.end);
      debugLog("html before apply", {
        editorId,
        html: current,
      });
      if (command.type === "color" && isAlreadySameColorWrapped(selected, command.color)) {
        return true;
      }
      const normalizedSelected = command.type === "color" ? unwrapColorSpans(selected) : selected;
      const wrapped = buildWrappedText(normalizedSelected, command);
      const nextValue = `${before}${wrapped}${after}`;
      debugLog("html after apply", {
        editorId,
        html: nextValue,
      });
      setInputValue(editorEl, nextValue);

      requestAnimationFrame(() => {
        editorEl.focus();
        editorEl.setSelectionRange(before.length, before.length + wrapped.length);
        saveSelection(editorId ?? "", editorEl);
        debugLog("state saved after apply", {
          editorId,
          selectionStart: before.length,
          selectionEnd: before.length + wrapped.length,
        });
      });
      return true;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return false;
    }
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText) {
      return false;
    }
    const wrapped = buildWrappedText(selectedText, command);
    debugLog("html before apply", {
      editorId,
      html: editorEl.innerHTML,
    });
    const fragment = range.createContextualFragment(wrapped);
    range.deleteContents();
    range.insertNode(fragment);
    debugLog("html after apply", {
      editorId,
      html: editorEl.innerHTML,
    });
    selection.removeAllRanges();
    saveSelection(editorId ?? "", editorEl);
    debugLog("state saved after apply", {
      editorId,
      selectedLength: selectedText.length,
    });
    return true;
  }, [restoreSelection, saveSelection]);

  const hasSelection = useCallback(() => hasSelectionState, [hasSelectionState]);

  const hasActiveEditor = useCallback(() => Boolean(activeEditorElRef.current), []);

  return {
    saveSelection,
    restoreSelection,
    clearSelection,
    hasSelection,
    hasActiveEditor,
    applyCommand,
  };
}
