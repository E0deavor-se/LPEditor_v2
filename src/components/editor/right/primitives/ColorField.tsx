"use client";

type ColorFieldProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
};

export default function ColorField({ value, onChange, ariaLabel }: ColorFieldProps) {
  const safeValue = value && value.startsWith("#") ? value : "#000000";
  return (
    <div className="flex w-full items-center gap-2">
      <input
        type="color"
        className="h-7 w-7 cursor-pointer rounded border border-[var(--ui-border)] bg-transparent"
        value={safeValue}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        type="text"
        className="ui-input h-7 flex-1 text-[12px]"
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
