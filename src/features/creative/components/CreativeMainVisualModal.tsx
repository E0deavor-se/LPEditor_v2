"use client";

import CreativeFlowContainer from "@/src/features/creative/components/CreativeFlowContainer";

type Props = {
  open: boolean;
  sectionId: string;
  onClose: () => void;
};

export default function CreativeMainVisualModal({ open, sectionId, onClose }: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="flex h-[92vh] w-[95vw] max-w-[1700px] flex-col overflow-hidden rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] shadow-2xl">
        <CreativeFlowContainer
          embedded
          launchContext={{
            source: "mainVisual",
            sectionId,
          }}
          onRequestClose={onClose}
          onApplied={onClose}
        />
      </div>
    </div>
  );
}
