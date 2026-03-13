/* ───────────────────────────────────────────────
   SharedSidebarListRow – 左パネルの一覧行
   Canvas LayerRow / Layout SectionRow 共通の器
   ─────────────────────────────────────────────── */

"use client";

import type { ReactNode, MouseEvent } from "react";
import { SHARED_TOKENS } from "@/src/components/shared/sharedTokens";

type SharedSidebarListRowProps = {
  isSelected?: boolean;
  onClick?: (e: MouseEvent) => void;
  onDoubleClick?: () => void;
  icon?: ReactNode;
  label: ReactNode;
  actions?: ReactNode;
  indent?: number;
  className?: string;
  /** ドラッグ中のドロップインジケーター表示 */
  showDropIndicator?: boolean;
  /** 左端の選択バー色 */
  accentBar?: boolean;
};

export default function SharedSidebarListRow({
  isSelected = false,
  onClick,
  onDoubleClick,
  icon,
  label,
  actions,
  indent = 0,
  className = "",
  showDropIndicator = false,
  accentBar = true,
}: SharedSidebarListRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={
        "group relative flex items-center gap-1.5 border-b border-[var(--ui-border)] px-2 text-[11px] cursor-pointer select-none transition-colors " +
        (isSelected
          ? "bg-[color-mix(in_srgb,var(--ui-accent)_10%,transparent)]"
          : "hover:bg-[color-mix(in_srgb,var(--ui-text)_4%,transparent)]") +
        " " + className
      }
      style={{ height: SHARED_TOKENS.listRowHeight, paddingLeft: 8 + indent * 16 }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.(e as unknown as MouseEvent);
      }}
    >
      {/* Selection accent bar */}
      {accentBar && isSelected && (
        <span className="absolute left-0 top-0 h-full w-[2px] bg-[var(--ui-accent)]" />
      )}

      {/* Drop indicator */}
      {showDropIndicator && (
        <span className="absolute bottom-0 left-2 right-2 h-px bg-[var(--ui-accent)]/70" />
      )}

      {/* Type icon */}
      {icon && (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--ui-muted)]">
          {icon}
        </span>
      )}

      {/* Label */}
      <span className="min-w-0 flex-1 truncate">{label}</span>

      {/* Hover actions */}
      {actions && (
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      )}
    </div>
  );
}
