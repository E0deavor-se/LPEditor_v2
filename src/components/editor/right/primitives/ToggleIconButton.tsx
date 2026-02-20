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
        "ui-button ui-button-ghost h-8 w-8 px-0 text-[10px] transition-colors duration-150 ease-out " +
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
