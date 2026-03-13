/* ───────────────────────────────────────────────
   SharedSidebarShell – 左パネル外枠
   Canvas/Layout 共通の幅・背景・ボーダー
   ─────────────────────────────────────────────── */

import type { ReactNode } from "react";
import { SHARED_TOKENS } from "@/src/components/shared/sharedTokens";

type SharedSidebarShellProps = {
  children: ReactNode;
  width?: number;
  className?: string;
};

export default function SharedSidebarShell({
  children,
  width = SHARED_TOKENS.sidebarWidth,
  className = "",
}: SharedSidebarShellProps) {
  return (
    <aside
      className={
        "flex h-full min-h-0 flex-col border-r border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-text)] " +
        className
      }
      style={{ width, minWidth: SHARED_TOKENS.sidebarMinWidth, maxWidth: SHARED_TOKENS.sidebarMaxWidth }}
    >
      {children}
    </aside>
  );
}
