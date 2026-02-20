"use client";

import { GripVertical, Trash2 } from "lucide-react";
import type { LineMarks, PrimaryLine } from "@/src/types/project";
import { useI18n } from "@/src/i18n";
import SelectField from "@/src/components/editor/right/primitives/SelectField";

type PrimaryLineEditorProps = {
  lines: PrimaryLine[];
  selectedLineId?: string;
  onSelect: (lineId: string) => void;
  onAddLine: () => void;
  onRemoveLine: (lineId: string) => void;
  onRemoveLast: () => void;
  onUpdateText: (lineId: string, text: string) => void;
  onChangeMarks?: (lineId: string, patch: LineMarks) => void;
  showBulletToggle?: boolean;
  defaultBullet?: "none" | "disc";
  sectionId?: string;
  itemId?: string;
  disabled?: boolean;
};

export default function PrimaryLineEditor({
  lines,
  selectedLineId,
  onSelect,
  onAddLine,
  onRemoveLine,
  onRemoveLast,
  onUpdateText,
  onChangeMarks,
  showBulletToggle,
  defaultBullet,
  sectionId,
  itemId,
  disabled,
}: PrimaryLineEditorProps) {
  const t = useI18n();
  const resolvedDefaultBullet = defaultBullet === "none" ? "none" : "disc";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        {lines.map((line) => {
          const isSelected = line.id === selectedLineId;
          return (
            <div
              key={line.id}
              className={
                "group flex h-8 items-center gap-2 rounded-md border border-[var(--ui-border)]/50 bg-[var(--surface)] px-2 text-[12px] transition-colors duration-150 ease-out " +
                (isSelected
                  ? " ring-1 ring-[var(--ui-ring)]"
                  : " hover:bg-[var(--surface-2)]")
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
                className="ui-input h-8 flex-1 text-[12px]"
                value={line.text}
                onChange={(event) => onUpdateText(line.id, event.target.value)}
                onFocus={() => onSelect(line.id)}
                disabled={disabled}
                data-kind="line"
                data-section-id={sectionId}
                data-item-id={itemId}
                data-line-id={line.id}
              />
              {showBulletToggle && onChangeMarks ? (
                <div className="w-[72px]">
                  <SelectField
                    value={line.marks?.bullet ?? resolvedDefaultBullet}
                    ariaLabel="記号"
                    onChange={(next) =>
                      onChangeMarks(line.id, {
                        bullet: next === "none" ? "none" : "disc",
                      })
                    }
                    disabled={disabled}
                  >
                    <option value="disc">・</option>
                    <option value="none">なし</option>
                  </SelectField>
                </div>
              ) : null}
              <button
                type="button"
                className="ui-button ui-button-ghost h-8 w-8 px-0 text-[10px] opacity-0 transition group-hover:opacity-100"
                aria-label={t.inspector.section.buttons.deleteLine}
                title={t.inspector.section.buttons.deleteLine}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveLine(line.id);
                }}
                disabled={disabled}
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
          className="ui-button ui-button-secondary h-8 px-2 text-[11px]"
          onClick={onAddLine}
          disabled={disabled}
        >
          {t.inspector.section.buttons.addLine}
        </button>
        <button
          type="button"
          className="ui-button ui-button-secondary h-8 px-2 text-[11px]"
          onClick={onRemoveLast}
          disabled={disabled}
        >
          {t.inspector.section.buttons.removeLastLine}
        </button>
      </div>
    </div>
  );
}