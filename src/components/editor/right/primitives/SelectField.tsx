"use client";

import type { ReactNode } from "react";

type SelectFieldProps = {
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
  ariaLabel?: string;
};

export default function SelectField({
  value,
  onChange,
  children,
  ariaLabel,
}: SelectFieldProps) {
  return (
    <select
      className="ui-select h-7 w-full text-[12px]"
      value={String(value)}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}
