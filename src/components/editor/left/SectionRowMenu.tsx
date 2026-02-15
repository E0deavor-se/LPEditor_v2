"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

const menuItemBase =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition";

type SectionRowMenuProps = {
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableDuplicate?: boolean;
  disableDelete?: boolean;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
};

export default function SectionRowMenu({
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  disableDuplicate = false,
  disableDelete = false,
  disableMoveUp = false,
  disableMoveDown = false,
}: SectionRowMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const runAction = (action: () => void, disabled?: boolean) => {
    if (disabled) {
      return;
    }
    action();
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className="ui-button h-7 w-7 px-0 text-[10px]"
        aria-label="メニュー"
        title="メニュー"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-[var(--ui-border)]/80 bg-[var(--ui-panel)]/95 p-1 text-[var(--ui-text)] shadow-[var(--ui-shadow-md)] backdrop-blur"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className={`${menuItemBase} ${
              disableDuplicate
                ? "cursor-not-allowed text-[var(--ui-muted)]"
                : "hover:bg-[var(--ui-panel-muted)]"
            }`}
            onClick={() => runAction(onDuplicate, disableDuplicate)}
            aria-disabled={disableDuplicate}
          >
            <Copy size={14} />
            複製
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${menuItemBase} ${
              disableMoveUp
                ? "cursor-not-allowed text-[var(--ui-muted)]"
                : "hover:bg-[var(--ui-panel-muted)]"
            }`}
            onClick={() => runAction(onMoveUp, disableMoveUp)}
            aria-disabled={disableMoveUp}
          >
            <ArrowUp size={14} />
            上へ移動
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${menuItemBase} ${
              disableMoveDown
                ? "cursor-not-allowed text-[var(--ui-muted)]"
                : "hover:bg-[var(--ui-panel-muted)]"
            }`}
            onClick={() => runAction(onMoveDown, disableMoveDown)}
            aria-disabled={disableMoveDown}
          >
            <ArrowDown size={14} />
            下へ移動
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${menuItemBase} ${
              disableDelete
                ? "cursor-not-allowed text-[var(--ui-muted)]"
                : "hover:bg-[var(--ui-panel-muted)]"
            }`}
            onClick={() => runAction(onDelete, disableDelete)}
            aria-disabled={disableDelete}
          >
            <Trash2 size={14} />
            削除
          </button>
        </div>
      ) : null}
    </div>
  );
}
