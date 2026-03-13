"use client";

import type { ReactNode } from "react";

type Props = {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  fullHeight?: boolean;
};

export default function CreativeEditorLayout({ left, center, right, fullHeight = false }: Props) {
  return (
    <div
      className={
        (fullHeight ? "h-full min-h-0 " : "h-[calc(100vh-170px)] ") +
        "grid grid-cols-1 gap-0 lg:grid-cols-[240px_minmax(0,1fr)_300px]"
      }
    >
      <aside className="min-h-0 overflow-auto border-r border-[var(--ui-border)] bg-[var(--ui-panel)] p-2.5">{left}</aside>
      <main className="min-h-0 min-w-0 flex-1 overflow-auto bg-[var(--ui-panel-muted)] p-3">{center}</main>
      <aside className="min-h-0 overflow-auto border-l border-[var(--ui-border)] bg-[var(--ui-panel)] p-2.5">{right}</aside>
    </div>
  );
}
