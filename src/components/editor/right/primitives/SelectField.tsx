"use client";

import type { ReactNode } from "react";

type SelectFieldProps = {
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
};

export default function SelectField({
  value,
  onChange,
  children,
  ariaLabel,
  disabled,
}: SelectFieldProps) {
  return (
    <select
      className="ui-select h-7 w-full text-[12px]"
      value={String(value)}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  );
}
