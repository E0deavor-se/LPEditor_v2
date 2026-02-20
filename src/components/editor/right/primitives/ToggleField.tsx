"use client";

type ToggleFieldProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
};

export default function ToggleField({
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: ToggleFieldProps) {
  return (
    <button
      type="button"
      aria-pressed={value}
      aria-label={ariaLabel}
      disabled={disabled}
      className={
        "relative h-6 w-10 rounded-full border border-[var(--ui-border)]/70 transition " +
        (value
          ? " bg-[var(--ui-primary-base)]/70"
          : " bg-[var(--surface-2)]") +
        (disabled ? " cursor-not-allowed opacity-50" : "")
      }
      onClick={() => onChange(!value)}
    >
      <span
        className={
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition " +
          (value ? " left-4" : " left-0.5")
        }
      />
    </button>
  );
}
