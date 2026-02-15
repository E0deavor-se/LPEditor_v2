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
    <div className="rounded-md border border-[var(--ui-border)]/50 bg-[var(--ui-panel)]/60">
      <button
        type="button"
        className="flex h-8 w-full items-center justify-between px-2 text-[12px] text-[var(--ui-text)]"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex items-center gap-2 font-medium">
          {icon ? <span className="text-[var(--ui-muted)]">{icon}</span> : null}
          {title}
        </span>
        <ChevronDown
          size={14}
          className={open ? "rotate-180 transition" : "transition"}
        />
      </button>
      {open ? <div className="pb-2">{children}</div> : null}
    </div>
  );
}
