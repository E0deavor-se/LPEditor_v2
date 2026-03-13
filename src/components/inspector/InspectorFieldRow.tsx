import type { ReactNode } from "react";

type InspectorFieldRowProps = {
  children: ReactNode;
  columns?: 2 | 3;
};

export default function InspectorFieldRow({ children, columns = 2 }: InspectorFieldRowProps) {
  const cols = columns === 3 ? "grid-cols-3" : "grid-cols-2";
  return <div className={`grid ${cols} gap-1`}>{children}</div>;
}
