import type { ReactNode, SelectHTMLAttributes } from "react";

type InspectorSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
};

export default function InspectorSelect({ className = "", children, ...props }: InspectorSelectProps) {
  return (
    <select
      {...props}
      className={
        "ui-select h-7 w-full rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px] " +
        className
      }
    >
      {children}
    </select>
  );
}
