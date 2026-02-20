"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  MoreHorizontal,
  PencilLine,
  Trash2,
} from "lucide-react";

const menuItemBase =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition";

type SectionRowMenuProps = {
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableRename?: boolean;
  disableDuplicate?: boolean;
  disableDelete?: boolean;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
};

export default function SectionRowMenu({
  onRename,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  disableRename = false,
  disableDuplicate = false,
  disableDelete = false,
  disableMoveUp = false,
  disableMoveDown = false,
}: SectionRowMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<
    { top: number; left: number } | undefined
  >(undefined);

  useEffect(() => {
    if (!open) {
      return;
    }
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const left = Math.max(12, rect.right - 160);
      const top = rect.bottom + 6;
      setMenuStyle({ left, top });
    };
    updatePosition();
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) {
        return;
      }
      if (buttonRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const handleScroll = () => updatePosition();
    window.addEventListener("resize", handleScroll);
    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleScroll);
      window.removeEventListener("scroll", handleScroll, true);
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
        ref={buttonRef}
        type="button"
        className="ui-button ui-button-ghost h-7 w-7 px-0 text-[10px]"
        aria-label="メニュー"
        title="メニュー"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[1000] w-40 rounded-md border border-[var(--ui-border)] bg-[var(--surface)]/95 p-1 text-[var(--ui-text)] shadow-[var(--ui-shadow-md)] backdrop-blur"
              style={{ left: menuStyle.left, top: menuStyle.top }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                className={`${menuItemBase} ${
                  disableRename
                    ? "cursor-not-allowed text-[var(--ui-muted)]"
                    : "hover:bg-[var(--surface-2)]"
                }`}
                onClick={() => runAction(onRename, disableRename)}
                aria-disabled={disableRename}
              >
                <PencilLine size={14} />
                名前変更
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${menuItemBase} ${
                  disableDuplicate
                    ? "cursor-not-allowed text-[var(--ui-muted)]"
                    : "hover:bg-[var(--surface-2)]"
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
                    : "hover:bg-[var(--surface-2)]"
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
                    : "hover:bg-[var(--surface-2)]"
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
                    : "hover:bg-[var(--surface-2)]"
                }`}
                onClick={() => runAction(onDelete, disableDelete)}
                aria-disabled={disableDelete}
              >
                <Trash2 size={14} />
                削除
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
