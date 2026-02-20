"use client";

import type { ReactNode } from "react";

type FieldRowProps = {
  label: string;
  children: ReactNode;
  helper?: string;
};

export default function FieldRow({ label, children, helper }: FieldRowProps) {
  const rowClass = helper
    ? "grid min-h-8 grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-x-3 text-[11px]"
    : "grid min-h-8 grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 text-[11px]";
  return (
    <div className={rowClass}>
      <div className="truncate text-[11px] text-[var(--ui-muted)]">{label}</div>
      <div className="flex flex-1 items-center gap-2">{children}</div>
      {helper ? (
        <div className="text-[11px] text-[var(--ui-muted)]">{helper}</div>
      ) : null}
    </div>
  );
}

