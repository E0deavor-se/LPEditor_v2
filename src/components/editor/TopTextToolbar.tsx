"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTextSelection } from "@/src/components/editor/TextSelectionContext";

const debugLog = (message: string, payload?: Record<string, unknown>) => {
  console.debug("[toolbar-debug]", message, payload ?? {});
};

export default function TopTextToolbar() {
  const { applyCommand, hasSelection, hasActiveEditor } = useTextSelection();
  const [color, setColor] = useState("#ef4444");
  const [pendingColor, setPendingColor] = useState<string | null>(null);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [boldClickCount, setBoldClickCount] = useState(0);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const selectionExists = hasSelection();
  const activeEditorExists = hasActiveEditor();
  const disabled = useMemo(() => !selectionExists, [selectionExists]);

  useEffect(() => {
    debugLog("toolbar render", {
      activeEditorExists,
      selectionExists,
      disabled,
      isColorPickerOpen,
    });
    debugLog("active editor exists", { value: activeEditorExists });
    debugLog("selection exists", { value: selectionExists });
  }, [activeEditorExists, selectionExists, disabled, isColorPickerOpen]);

  useEffect(() => {
    debugLog("toolbar state changed", {
      boldClickCount,
      lastCommand,
      activeEditorExists,
      selectionExists,
    });
  }, [boldClickCount, lastCommand, activeEditorExists, selectionExists]);

  const commitColor = (next: string | null) => {
    if (!next || disabled) {
      return;
    }
    debugLog("applyColor called", { color: next, disabled });
    applyCommand({ type: "color", color: next });
  };

  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!isColorPickerOpen) {
        return;
      }
      const target = event.target;
      if (colorInputRef.current && target instanceof Node && !colorInputRef.current.contains(target)) {
        debugLog("outside click detected", {
          targetTag: target instanceof Element ? target.tagName : "unknown",
        });
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [isColorPickerOpen]);

  return (
    <div
      className="relative z-30 pointer-events-auto border-b border-[var(--ui-border)] bg-[var(--surface-2)] px-3 py-1.5"
      onPointerDownCapture={() => {
        debugLog("toolbar pointerdown capture", {
          activeEditorExists,
          selectionExists,
        });
      }}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="ui-button ui-button-ghost h-7 w-7 px-0"
            data-debug-bold-button="true"
            onMouseDown={() => {
              debugLog("bold button mousedown", {
                activeEditorExists,
                selectionExists,
                disabled,
              });
            }}
            onClick={() => {
              debugLog("bold button click", {
                activeEditorExists,
                selectionExists,
                disabled,
              });
              debugLog("active editor exists", { value: activeEditorExists });
              debugLog("selection exists", { value: selectionExists });
              setBoldClickCount((prev) => prev + 1);
              setLastCommand("bold");
              debugLog("command requested", { command: "bold" });
              const applied = applyCommand({ type: "bold" });
              debugLog("command result", { command: "bold", applied });
            }}
            title="太字"
            aria-pressed={lastCommand === "bold"}
          >
            B
          </button>
          <button
            type="button"
            className="ui-button ui-button-ghost h-7 w-7 px-0"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand({ type: "underline" })}
            disabled={disabled}
            title="下線"
          >
            U
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={colorInputRef}
            type="color"
            className="h-7 w-7 cursor-pointer rounded border border-[var(--ui-border)] bg-transparent"
            value={color}
            onMouseDown={(event) => {
              debugLog("color button mousedown", {
                disabled,
                openStateBefore: isColorPickerOpen,
              });
              setIsPickingColor(true);
            }}
            onClick={() => {
              debugLog("toolbar color clicked", {
                disabled,
                openStateBefore: isColorPickerOpen,
              });
              setIsColorPickerOpen(true);
              debugLog("color picker open state changed", {
                from: isColorPickerOpen,
                to: true,
              });
            }}
            onPointerUp={() => {
              debugLog("close triggered reason", { reason: "pointerup" });
              setIsPickingColor(false);
              setIsColorPickerOpen(false);
              commitColor(pendingColor ?? color);
              setPendingColor(null);
            }}
            onBlur={() => {
              debugLog("close triggered reason", { reason: "blur" });
              setIsPickingColor(false);
              setIsColorPickerOpen(false);
              commitColor(pendingColor ?? color);
              setPendingColor(null);
            }}
            onInput={(event) => {
              const next = event.currentTarget.value;
              debugLog("color picker changed", { color: next, via: "input" });
              setColor(next);
              setPendingColor(next);
            }}
            onChange={(event) => {
              const next = event.target.value;
              debugLog("color picker changed", { color: next, via: "change" });
              setColor(next);
              setPendingColor(next);
              commitColor(next);
              setPendingColor(null);
            }}
            onFocus={() => {
              debugLog("color picker rendered", { openState: true });
            }}
            disabled={disabled}
            title="文字色"
          />
          <button
            type="button"
            className="ui-button ui-button-ghost h-7 px-2 text-[10px]"
            data-debug-red-color="true"
            onMouseDown={() => {
              debugLog("toolbar color clicked", {
                color: "#ef4444",
                disabled,
              });
            }}
            onClick={() => {
              setColor("#ef4444");
              commitColor("#ef4444");
            }}
            disabled={disabled}
            title="赤を適用"
          >
            赤
          </button>
        </div>
      </div>
    </div>
  );
}
