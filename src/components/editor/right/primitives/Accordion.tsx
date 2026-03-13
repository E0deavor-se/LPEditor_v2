"use client";

import type { ReactNode } from "react";
import InspectorSection from "@/src/components/inspector/InspectorSection";

type AccordionProps = {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  summary?: ReactNode;
  children: ReactNode;
};

export default function Accordion({
  title,
  icon,
  defaultOpen = false,
  summary,
  children,
}: AccordionProps) {
  return (
    <InspectorSection
      title={title}
      icon={icon}
      defaultOpen={defaultOpen}
      summary={summary}
      className="lp-inspector-accordion"
    >
      {children}
    </InspectorSection>
  );
}
