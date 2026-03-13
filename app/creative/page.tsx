"use client";

import CreativeFlowContainer from "@/src/features/creative/components/CreativeFlowContainer";

export default function CreativeGenerationPage() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  return (
    <CreativeFlowContainer
      launchContext={{
        source: params?.get("source") ?? undefined,
        sectionId: params?.get("sectionId") ?? undefined,
        returnTo: params?.get("returnTo") ?? undefined,
      }}
    />
  );
}
