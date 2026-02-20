"use client";

import type { ReactNode } from "react";

type FieldRowProps = {
  label: string;
  children: ReactNode;
  helper?: string;
};

export default function FieldRow({ label, children, helper }: FieldRowProps) {
  return (
    <div className="flex h-8 items-center gap-2 px-2 text-[12px]">
      <div className="w-[110px] shrink-0 truncate text-[12px] text-[var(--ui-muted)]">
        {label}
      </div>
      <div className="flex flex-1 items-center gap-2">{children}</div>
      {helper ? (
        <div className="text-xs text-[var(--ui-muted)]">{helper}</div>
      ) : null}
    </div>
  );
}

