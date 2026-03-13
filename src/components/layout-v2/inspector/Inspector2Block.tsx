"use client";

import type { ReactNode } from "react";
import InspectorSection from "@/src/components/inspector/InspectorSection";

export type Inspector2BlockKey = "basic" | "content" | "display" | "design" | "details";

const TITLE_MAP: Record<Inspector2BlockKey, string> = {
  basic: "基本",
  content: "コンテンツ",
  display: "表示",
  design: "デザイン",
  details: "詳細",
};

type Inspector2BlockProps = {
  block: Inspector2BlockKey;
  children: ReactNode;
  summary?: ReactNode;
};

export default function Inspector2Block({ block, children, summary }: Inspector2BlockProps) {
  return (
    <InspectorSection
      title={TITLE_MAP[block]}
      defaultOpen={block !== "details"}
      summary={summary}
      className="border-[var(--ui-border)]/55"
    >
      <div className="space-y-2">{children}</div>
    </InspectorSection>
  );
}
