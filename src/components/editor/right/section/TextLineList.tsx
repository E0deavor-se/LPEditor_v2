"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PrimaryLine } from "@/src/types/project";
import { useI18n } from "@/src/i18n";

type TextLineListProps = {
  lines: PrimaryLine[];
  selectedLineId?: string;
  onSelect: (lineId: string) => void;
  onChangeText?: (lineId: string, value: string) => void;
  onAddLine: () => void;
  onReorderLine?: (fromIndex: number, toIndex: number) => void;
  onRemoveLine: (lineId: string) => void;
  onRemoveLast?: () => void;
  disabled?: boolean;
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
  disabled,
}: TextLineListProps) {
  const t = useI18n();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const isDndEnabled = Boolean(onReorderLine) && !disabled;

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
    const fromIndex = lines.findIndex((line) => line.id === activeId);
    const toIndex = lines.findIndex((line) => line.id === overId);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }
    onReorderLine(fromIndex, toIndex);
  };

  const LineRow = ({ line, index }: { line: PrimaryLine; index: number }) => {
    const isSelected = line.id === selectedLineId;
    const [localText, setLocalText] = useState(line.text ?? "");
    const inputRef = useRef<HTMLInputElement | null>(null);
    const {
      attributes,
      listeners,
      setNodeRef,
      setActivatorNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: line.id, disabled: !isDndEnabled });
    useEffect(() => {
      setLocalText(line.text ?? "");
    }, [line.text]);
    const style: CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={
          "group flex items-center gap-2 min-w-0 h-8 rounded-md border px-2 text-left text-[12px] transition " +
          (isSelected
            ? "border-[var(--ui-ring)] bg-[var(--ui-panel)]/80"
            : "border-[var(--ui-border)]/50 bg-[var(--ui-panel)]/60 hover:bg-[var(--ui-panel)]/80")
        }
      >
        <button
          type="button"
          className="ui-button h-7 w-7 shrink-0 px-0"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={!isDndEnabled}
          aria-label="並び替え"
          title="並び替え"
        >
          <GripVertical size={14} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <span className="text-[11px] text-[var(--ui-muted)]">
            {index + 1}
          </span>
          <input
            type="text"
            className="ui-input h-7 flex-1 min-w-0 w-full px-2 text-[12px]"
            value={localText}
            ref={inputRef}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              event.currentTarget.focus();
            }}
            onFocus={() => onSelect(line.id)}
            onChange={(event) => {
              const nextValue = event.target.value;
              setLocalText(nextValue);
              onChangeText?.(line.id, nextValue);
            }}
            disabled={disabled}
            placeholder={t.inspector.section.placeholders.emptyLine}
          />
        </div>
        <button
          type="button"
          className="ui-button h-7 w-7 shrink-0 px-0"
          onClick={() => onRemoveLine(line.id)}
          aria-label={t.inspector.section.buttons.deleteLine}
          title={t.inspector.section.buttons.deleteLine}
          disabled={disabled}
        >
          <Trash2 size={14} />
        </button>
      </div>
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
          items={lines.map((line) => line.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex min-w-0 flex-col gap-1">
            {lines.map((line, index) => (
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
