"use client";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedFieldProps<T extends string> = {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  ariaLabel?: string;
};

export default function SegmentedField<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: SegmentedFieldProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex w-full items-center rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/70 p-0.5"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={
              "h-7 flex-1 rounded-md px-2 text-[12px] transition " +
              (isActive
                ? " bg-[var(--ui-panel)] text-[var(--ui-text)]"
                : " text-[var(--ui-muted)] hover:text-[var(--ui-text)]")
            }
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
