"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type AccordionProps = {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

export default function Accordion({
  title,
  icon,
  defaultOpen = false,
  children,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)]/60">
      <button
        type="button"
        className="flex h-8 w-full items-center justify-between border-b border-[var(--ui-border)]/60 px-2 text-[11px] font-semibold tracking-wider text-[var(--ui-muted)] transition-colors duration-150 ease-out hover:bg-[var(--surface-2)]"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex items-center gap-2">
          {icon ? <span className="text-[var(--ui-muted)]">{icon}</span> : null}
          {title}
        </span>
        <ChevronDown
          size={14}
          className={open ? "rotate-180 transition" : "transition"}
        />
      </button>
      <div
        className={
          "grid transition-[grid-template-rows,opacity] duration-150 ease-out " +
          (open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
        }
      >
        <div className="overflow-hidden">
          <div className="py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
