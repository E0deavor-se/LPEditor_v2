"use client";

import CreativeEditorShell from "@/src/features/creative/components/editor/CreativeEditorShell";

type Props = {
  onBack: () => void;
  onNext: () => void;
  fullHeight?: boolean;
};

export default function CreativeEditPage({ onBack, onNext, fullHeight = false }: Props) {
  return <CreativeEditorShell onBack={onBack} onNext={onNext} fullHeight={fullHeight} />;
}
