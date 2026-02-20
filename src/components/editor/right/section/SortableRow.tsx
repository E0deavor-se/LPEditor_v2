"use client";

import type { CSSProperties, ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableRowProps = {
  id: string;
  selected?: boolean;
  disabled?: boolean;
  dragDisabled?: boolean;
  onSelect?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  wrap?: boolean;
};

export default function SortableRow({
  id,
  selected = false,
  disabled = false,
  dragDisabled = false,
  onSelect,
  leading,
  trailing,
  children,
  wrap = false,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: dragDisabled });

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
        "group relative flex min-w-0 items-center gap-2 rounded-md border px-2 text-left text-[12px] transition-colors duration-150 ease-out " +
        (wrap ? "h-auto flex-wrap py-1" : "h-8") +
        (selected
          ? " border-[var(--ui-ring)] bg-[var(--surface)]"
          : " border-[var(--ui-border)]/50 bg-[var(--surface)] hover:bg-[var(--surface-2)]") +
        (disabled ? " opacity-60" : "")
      }
      onClick={() => onSelect?.()}
      role="button"
      tabIndex={0}
    >
      {selected ? (
        <span className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-[var(--ui-ring)]" />
      ) : null}
      <button
        type="button"
        className="ui-button ui-button-ghost h-8 w-8 shrink-0 px-0"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={dragDisabled}
        aria-label="並び替え"
        title="並び替え"
      >
        <GripVertical size={14} />
      </button>
      {leading ? <div className="text-xs text-[var(--ui-muted)]">{leading}</div> : null}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {children}
      </div>
      {trailing}
    </div>
  );
}