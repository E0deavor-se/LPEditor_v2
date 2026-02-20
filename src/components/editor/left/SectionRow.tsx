"use client";

import { forwardRef, memo, useEffect, useRef, type ButtonHTMLAttributes } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Lock, Trash2, Unlock } from "lucide-react";
import type { SectionBase } from "@/src/types/project";

const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`ui-button h-8 w-8 px-2 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-40 ${
      className ?? ""
    }`}
    {...props}
  />
));

IconButton.displayName = "IconButton";

export type SectionRowProps = {
  section: SectionBase;
  label: string;
  isSelected: boolean;
  isEditing: boolean;
  draftName: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disableDrag: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onChangeName: (value: string) => void;
  onCommitName: () => void;
  onCancelName: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function SectionRow({
  section,
  label,
  isSelected,
  isEditing,
  draftName,
  canMoveUp,
  canMoveDown,
  disableDrag,
  onSelect,
  onStartRename,
  onChangeName,
  onCommitName,
  onCancelName,
  onToggleVisibility,
  onToggleLock,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SectionRowProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: disableDrag });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const controlsClass =
    "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)]/85 px-1 py-0.5 opacity-0 pointer-events-none transition-opacity duration-150 ease-out group-hover:opacity-100 group-hover:pointer-events-auto" +
    (isSelected ? " opacity-60 pointer-events-auto" : "");

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={
        "group relative flex h-9 items-center gap-2 rounded-md border border-[var(--ui-border)] bg-[var(--surface)] px-2.5 transition-colors duration-150 ease-out " +
        (isSelected
          ? " border-transparent bg-[var(--ui-primary-soft)] text-[var(--ui-text)] shadow-sm"
          : " hover:bg-[var(--surface-2)]") +
        (!section.visible ? " opacity-60" : "") +
        (isDragging ? " ring-1 ring-[var(--ui-primary-base)]/50" : "")
      }
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (!section.locked) {
          onStartRename();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !isEditing && !section.locked) {
          event.preventDefault();
          onStartRename();
        }
      }}
    >
      {isSelected ? (
        <span className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-[var(--ui-primary-base)]" />
      ) : null}
      <div
        className={
          "flex min-w-0 flex-1 items-center gap-2 pr-24"
        }
      >
        <span className="h-2.5 w-2.5 rounded-sm bg-[var(--ui-border)]/80" />
        {isEditing ? (
          <input
            ref={inputRef}
            className="ui-input h-7 w-full min-w-0 text-[13px]"
            value={draftName}
            onChange={(event) => onChangeName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCommitName();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onCancelName();
              }
            }}
            onBlur={onCommitName}
          />
        ) : (
          <span
            className="truncate text-[13px] font-medium text-[var(--ui-text)]"
            title={label}
          >
            {label}
          </span>
        )}
      </div>
      <div className={controlsClass}>
        <IconButton
          aria-label={section.visible ? "セクションを非表示" : "セクションを表示"}
          title={section.visible ? "セクションを非表示" : "セクションを表示"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleVisibility();
          }}
        >
          {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </IconButton>
        <IconButton
          aria-label={section.locked ? "ロックを解除" : "ロックする"}
          title={section.locked ? "ロックを解除" : "ロックする"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleLock();
          }}
        >
          {section.locked ? <Lock size={14} /> : <Unlock size={14} />}
        </IconButton>
        <IconButton
          aria-label="セクションを削除"
          title="セクションを削除"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          disabled={section.locked}
        >
          <Trash2 size={14} />
        </IconButton>
        {!section.locked ? (
          <IconButton
            aria-label="ドラッグして並び替え"
            title="ドラッグして並び替え"
            className="cursor-grab"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}

export default memo(SectionRow);
