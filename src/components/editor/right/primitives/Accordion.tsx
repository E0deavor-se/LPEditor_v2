"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type AccordionProps = {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  summary?: ReactNode;
  children: ReactNode;
};

export default function Accordion({
  title,
  icon,
  defaultOpen = false,
  summary,
  children,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="lp-inspector-accordion w-full border-b border-[var(--ui-border)]/50">
      <button
        type="button"
        className={
          "flex h-8 w-full items-center justify-between border-l-2 pl-3 pr-4 text-[11px] font-semibold tracking-wide transition-colors duration-150 ease-out " +
          (open
            ? "border-[var(--ui-accent)] text-[var(--ui-text)]"
            : "border-transparent text-[var(--ui-muted)]")
        }
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon ? <span className="text-[var(--ui-muted)]">{icon}</span> : null}
          <span className="truncate">{title}</span>
        </span>
        <span className="flex items-center gap-2 text-[10px] text-[var(--ui-muted)]">
          {!open && summary ? <span className="truncate">{summary}</span> : null}
          <ChevronDown
            size={14}
            className={open ? "rotate-180 transition" : "transition"}
          />
        </span>
      </button>
      <div
        className={
          "grid transition-[grid-template-rows,opacity] duration-150 ease-out " +
          (open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
        }
      >
        <div className="overflow-hidden">
          <div
            className={
              "pb-3 pl-3 pr-4 pt-2.5 space-y-2.5 transition-transform duration-150 ease-out " +
              (open ? "translate-y-0" : "translate-y-1")
            }
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
