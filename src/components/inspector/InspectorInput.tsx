import type { InputHTMLAttributes } from "react";

type InspectorInputProps = InputHTMLAttributes<HTMLInputElement>;

export default function InspectorInput({ className = "", ...props }: InspectorInputProps) {
  return (
    <input
      {...props}
      className={
        "ui-input h-7 w-full rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px] " +
        className
      }
    />
  );
}
