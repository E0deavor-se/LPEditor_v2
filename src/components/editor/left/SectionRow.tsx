"use client";

import { forwardRef, memo, useEffect, useRef, type ButtonHTMLAttributes } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Image,
  LayoutGrid,
  Lock,
  Store,
  Type,
  Unlock,
} from "lucide-react";
import type { SectionBase } from "@/src/types/project";
import SectionRowMenu from "@/src/components/editor/left/SectionRowMenu";

const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onPointerDown, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`ui-button ui-button-ghost h-7 w-7 px-0 text-[10px] disabled:cursor-not-allowed disabled:opacity-40 ${
      className ?? ""
    }`}
    onPointerDown={(event) => {
      event.stopPropagation();
      onPointerDown?.(event);
    }}
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
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disableDrag: boolean;
  onSelect: () => void;
  onRename: () => void;
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
  depth = 0,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  canMoveUp,
  canMoveDown,
  disableDrag,
  onSelect,
  onRename,
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
    transform,
    transition,
    isDragging,
    isOver,
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
    "absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 pointer-events-none transition-opacity duration-150 ease-out group-hover:opacity-100 group-hover:pointer-events-auto";

  const indentStyle = { marginLeft: depth * 16 };
  const showDropIndicator = isOver && !isDragging;
  const activeStyle = isSelected
    ? {
        backgroundColor:
          "color-mix(in srgb, var(--ui-accent) 6%, transparent)",
      }
    : undefined;

  const iconClass = "text-[var(--ui-muted)]";
  const renderTypeIcon = () => {
    switch (section.type) {
      case "heroImage":
      case "imageOnly":
        return <Image size={14} className={iconClass} />;
      case "targetStores":
        return <Store size={14} className={iconClass} />;
      case "legalNotes":
      case "tabbedNotes":
        return <Type size={14} className={iconClass} />;
      default:
        return <LayoutGrid size={14} className={iconClass} />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...dragStyle, ...activeStyle }}
      className={
        "group relative flex h-8 items-center gap-2 border-b border-[var(--ui-border)]/40 px-0 text-[12px] transition-colors duration-150 ease-out hover:bg-[var(--surface-2)]/70 last:border-b-0 cursor-pointer " +
        (!section.visible ? " opacity-60" : "") +
        (isDragging ? " opacity-50" : "")
      }
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      {isSelected ? (
        <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-[var(--ui-accent)]" />
      ) : null}
      {showDropIndicator ? (
        <span className="absolute left-0 right-0 bottom-0 h-px bg-[var(--ui-accent)]/70" />
      ) : null}
      <div className="flex min-w-0 flex-1 items-center gap-2 pr-20" style={indentStyle}>
        <button
          type="button"
          className={
            "flex h-5 w-5 items-center justify-center text-[var(--ui-muted)] " +
            (hasChildren
              ? "hover:text-[var(--ui-text)]"
              : "cursor-default opacity-30")
          }
          onClick={(event) => {
            event.stopPropagation();
            if (hasChildren) {
              onToggleExpand?.();
            }
          }}
          aria-label="展開"
          disabled={!hasChildren}
        >
          <ChevronRight
            size={14}
            className={isExpanded ? "rotate-90 transition" : "transition"}
          />
        </button>
        <span className="flex h-4 w-4 items-center justify-center">
          {renderTypeIcon()}
        </span>
        {isEditing ? (
          <input
            ref={inputRef}
            className="ui-input h-7 w-full min-w-0 text-[12px]"
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
          <span className="truncate text-[12px] text-[var(--ui-text)]" title={label}>
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
        <SectionRowMenu
          onRename={onRename}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          disableRename={section.locked}
          disableDuplicate={section.locked}
          disableDelete={section.locked}
          disableMoveUp={!canMoveUp}
          disableMoveDown={!canMoveDown}
        />
      </div>
    </div>
  );
}

export default memo(SectionRow);
