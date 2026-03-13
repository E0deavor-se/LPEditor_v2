"use client";

import type { ReactNode } from "react";
import InspectorSelect from "@/src/components/inspector/InspectorSelect";

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
    <InspectorSelect
      className="text-[11px]"
      value={String(value)}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      {children}
    </InspectorSelect>
  );
}
