"use client";

import { GripVertical, Trash2 } from "lucide-react";
import type { PrimaryLine } from "@/src/types/project";
import { useI18n } from "@/src/i18n";

type PrimaryLineEditorProps = {
  lines: PrimaryLine[];
  selectedLineId?: string;
  onSelect: (lineId: string) => void;
  onAddLine: () => void;
  onRemoveLine: (lineId: string) => void;
  onRemoveLast: () => void;
  onUpdateText: (lineId: string, text: string) => void;
};

export default function PrimaryLineEditor({
  lines,
  selectedLineId,
  onSelect,
  onAddLine,
  onRemoveLine,
  onRemoveLast,
  onUpdateText,
}: PrimaryLineEditorProps) {
  const t = useI18n();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        {lines.map((line) => {
          const isSelected = line.id === selectedLineId;
          return (
            <div
              key={line.id}
              className={
                "group flex h-8 items-center gap-2 rounded-md border border-[var(--ui-border)]/50 bg-[var(--ui-panel)]/60 px-2 text-[12px] transition " +
                (isSelected
                  ? " ring-1 ring-[var(--ui-ring)]"
                  : " hover:bg-[var(--ui-panel)]/80")
              }
              onClick={() => onSelect(line.id)}
              role="button"
              tabIndex={0}
            >
              <span className="text-[var(--ui-muted)]">
                <GripVertical size={14} />
              </span>
              <input
                type="text"
                className="ui-input h-7 flex-1 text-[12px]"
                value={line.text}
                onChange={(event) => onUpdateText(line.id, event.target.value)}
                onFocus={() => onSelect(line.id)}
              />
              <button
                type="button"
                className="ui-button h-7 w-7 px-0 text-[10px] opacity-0 transition group-hover:opacity-100"
                aria-label={t.inspector.section.buttons.deleteLine}
                title={t.inspector.section.buttons.deleteLine}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveLine(line.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="ui-button h-7 px-2 text-[11px]"
          onClick={onAddLine}
        >
          {t.inspector.section.buttons.addLine}
        </button>
        <button
          type="button"
          className="ui-button h-7 px-2 text-[11px]"
          onClick={onRemoveLast}
        >
          {t.inspector.section.buttons.removeLastLine}
        </button>
      </div>
    </div>
  );
}