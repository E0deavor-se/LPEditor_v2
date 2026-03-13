import type { ReactNode } from "react";

type InspectorFieldProps = {
  label: string;
  children: ReactNode;
  helper?: string;
};

export default function InspectorField({ label, children, helper }: InspectorFieldProps) {
  return (
    <label className="flex items-center gap-1.5 text-[11px]">
      <span className="w-12 flex-shrink-0 text-[var(--ui-muted)]">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {helper ? <span className="text-[10px] text-[var(--ui-muted)]">{helper}</span> : null}
    </label>
  );
}
