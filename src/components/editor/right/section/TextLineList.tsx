"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

type TextLineListProps = {
  lines: PrimaryLine[];
  selectedLineId?: string;
  onSelect: (lineId: string) => void;
  onChangeText?: (lineId: string, value: string) => void;
  onAddLine: () => void;
  onReorderLine?: (fromIndex: number, toIndex: number) => void;
  onRemoveLine: (lineId: string) => void;
  onRemoveLast?: () => void;
  onChangeMarks?: (lineId: string, patch: LineMarks) => void;
  onEnsureLineIds?: (nextLines: PrimaryLine[]) => void;
  sectionId?: string;
  itemId?: string;
  disabled?: boolean;
  showBulletToggle?: boolean;
  defaultBullet?: "disc" | "none";
};

export default function TextLineList({
  lines,
  selectedLineId,
  onSelect,
  onChangeText,
  onAddLine,
  onReorderLine,
  onRemoveLine,
  onRemoveLast,
  onChangeMarks,
  onEnsureLineIds,
  sectionId,
  itemId,
  disabled,
  showBulletToggle = false,
  defaultBullet = "disc",
}: TextLineListProps) {
  const t = useI18n();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const isDndEnabled = Boolean(onReorderLine) && !disabled;
  const resolvedDefaultBullet = defaultBullet === "none" ? "none" : "disc";
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

  const LineRow = ({ line, index }: { line: PrimaryLine; index: number }) => {
    const isSelected = line.id === selectedLineId;
    const [localText, setLocalText] = useState(line.text ?? "");
    const inputRef = useRef<HTMLInputElement | null>(null);
    const focusInput = (placeCaretAtEnd = false) => {
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) {
          return;
        }
        el.focus();
        if (placeCaretAtEnd) {
          const length = el.value.length;
          el.setSelectionRange(length, length);
        }
      });
    };
    useEffect(() => {
      setLocalText(line.text ?? "");
    }, [line.text]);
    useEffect(() => {
      if (selectedLineId === line.id) {
        focusInput(true);
      }
    }, [selectedLineId, line.id]);
    return (
      <SortableRow
        id={line.id}
        selected={isSelected}
        disabled={disabled}
        dragDisabled={!isDndEnabled}
        onSelect={() => focusInput(true)}
        leading={index + 1}
        wrap={showBulletToggle}
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
              className="ui-button ui-button-ghost h-8 w-8 shrink-0 px-0"
              onClick={() => onRemoveLine(line.id)}
              aria-label={t.inspector.section.buttons.deleteLine}
              title={t.inspector.section.buttons.deleteLine}
              disabled={disabled}
            >
              <Trash2 size={14} />
            </button>
          </>
        }
      >
          <input
            type="text"
            className="ui-input h-8 flex-1 min-w-0 w-full px-2 text-[12px]"
            value={localText}
            key={isSelected ? `${line.id}-active` : `${line.id}-idle`}
            autoFocus={isSelected}
            ref={inputRef}
            onPointerDownCapture={(event) => {
              event.stopPropagation();
            }}
            onMouseDownCapture={(event) => {
              event.stopPropagation();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onFocus={() => {
              if (selectedLineId !== line.id) {
                onSelect(line.id);
              }
            }}
            onChange={(event) => {
              const nextValue = event.target.value;
              setLocalText(nextValue);
              onChangeText?.(line.id, nextValue);
            }}
            disabled={disabled}
            data-kind="line"
            data-section-id={sectionId}
            data-item-id={itemId}
            data-line-id={line.id}
            placeholder={t.inspector.section.placeholders.emptyLine}
          />
      </SortableRow>
    );
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
          <div className="flex min-w-0 flex-col gap-1">
            {resolvedLines.map((line, index) => (
              <LineRow key={line.id} line={line} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="ui-button h-7 px-2 text-[11px]"
          onClick={onAddLine}
          disabled={disabled}
        >
          {t.inspector.section.buttons.addLine}
        </button>
        {onRemoveLast ? (
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onClick={onRemoveLast}
            disabled={disabled}
          >
            {t.inspector.section.buttons.removeLastLine}
          </button>
        ) : null}
      </div>
    </div>
  );
}
