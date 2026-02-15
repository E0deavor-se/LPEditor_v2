"use client";

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
    <input
      type="number"
      className="ui-input h-7 w-full text-[12px]"
      value={safeValue}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
