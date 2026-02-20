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
        "ui-toggle relative h-6 w-10 rounded-full transition " +
        (value ? " is-on" : "") +
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
