/* ───────────────────────────────────────────────
   SharedSidebarHeader – 左パネルのヘッダー
   Canvas LayersPanel と Layout LeftPanel で共通
   ─────────────────────────────────────────────── */

import type { ReactNode } from "react";

type SharedSidebarHeaderProps = {
  title: string;
  actions?: ReactNode;
  className?: string;
};

export default function SharedSidebarHeader({
  title,
  actions,
  className = "",
}: SharedSidebarHeaderProps) {
  return (
    <div className={"flex items-center justify-between border-b border-[var(--ui-border)] bg-[var(--surface-2)] px-3 py-2 " + className}>
      <div className="text-[13px] font-semibold text-[var(--ui-text)]">{title}</div>
      {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
    </div>
  );
}
