"use client";

import InspectorInput from "@/src/components/inspector/InspectorInput";

type NumberFieldProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
};

export default function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  ariaLabel,
}: NumberFieldProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return (
    <InspectorInput
      type="number"
      className="text-[11px]"
      value={safeValue}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
