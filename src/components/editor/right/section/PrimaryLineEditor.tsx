"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { LineMarks, PrimaryLine } from "@/src/types/project";
import { useI18n } from "@/src/i18n";
import SelectField from "@/src/components/editor/right/primitives/SelectField";
import SortableRow from "@/src/components/editor/right/section/SortableRow";

type PrimaryLineEditorProps = {
  lines: PrimaryLine[];
  selectedLineId?: string;
  onSelect: (lineId: string) => void;
  onAddLine: () => void;
  onRemoveLine: (lineId: string) => void;
  onRemoveLast: () => void;
  onUpdateText: (lineId: string, text: string) => void;
  onReorderLine?: (fromIndex: number, toIndex: number) => void;
  onEnsureLineIds?: (nextLines: PrimaryLine[]) => void;
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
  onReorderLine,
  onEnsureLineIds,
  onChangeMarks,
  showBulletToggle,
  defaultBullet,
  sectionId,
  itemId,
  disabled,
}: PrimaryLineEditorProps) {
  const t = useI18n();
  const resolvedDefaultBullet = defaultBullet === "none" ? "none" : "disc";
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const isDndEnabled = Boolean(onReorderLine) && !disabled;
  const [resolvedLines, setResolvedLines] = useState(lines);

  useEffect(() => {
    const hasMissingId = lines.some((line) => !line.id);
    if (!hasMissingId) {
      setResolvedLines(lines);
      return;
    }
    const nextLines = lines.map((line) =>
      line.id
        ? line
        : {
            ...line,
            id: `line_${Date.now().toString(36)}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,
          }
    );
    setResolvedLines(nextLines);
    onEnsureLineIds?.(nextLines);
  }, [lines, onEnsureLineIds]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isDndEnabled || !onReorderLine) {
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    const fromIndex = resolvedLines.findIndex((line) => line.id === activeId);
    const toIndex = resolvedLines.findIndex((line) => line.id === overId);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }
    onReorderLine(fromIndex, toIndex);
  };

  return (
    <div className="flex flex-col gap-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={resolvedLines.map((line) => line.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1">
            {resolvedLines.map((line) => {
              const isSelected = line.id === selectedLineId;
              return (
                <SortableRow
                  key={line.id}
                  id={line.id}
                  selected={isSelected}
                  disabled={disabled}
                  dragDisabled={!isDndEnabled}
                  onSelect={() => onSelect(line.id)}
                  wrap={Boolean(showBulletToggle)}
                  trailing={
                    <>
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
                    </>
                  }
                >
                  <input
                    type="text"
                    className="ui-input h-8 flex-1 text-[12px]"
                    value={line.text}
                    onChange={(event) =>
                      onUpdateText(line.id, event.target.value)
                    }
                    onFocus={() => onSelect(line.id)}
                    disabled={disabled}
                    data-kind="line"
                    data-section-id={sectionId}
                    data-item-id={itemId}
                    data-line-id={line.id}
                  />
                </SortableRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
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