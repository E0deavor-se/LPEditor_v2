"use client";

import type { ReactNode } from "react";

type ToggleIconButtonProps = {
  active: boolean;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  onClick: () => void;
  children: ReactNode;
};

export default function ToggleIconButton({
  active,
  disabled = false,
  ariaLabel,
  title,
  onClick,
  children,
}: ToggleIconButtonProps) {
  return (
    <button
      type="button"
      className={
        "ui-button h-7 w-7 px-0 text-[10px] transition " +
        (active ? " text-[var(--ui-text)]" : " text-[var(--ui-muted)]") +
        (disabled ? " cursor-not-allowed opacity-50" : "")
      }
      aria-pressed={active}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
