import type { InputHTMLAttributes } from "react";

type InspectorColorInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export default function InspectorColorInput({ className = "", ...props }: InspectorColorInputProps) {
  return (
    <input
      {...props}
      type="color"
      className={
        "h-6 w-6 cursor-pointer rounded border border-[var(--ui-border)] bg-transparent " +
        className
      }
    />
  );
}
