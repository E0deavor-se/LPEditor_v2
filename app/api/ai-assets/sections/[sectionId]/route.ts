import { NextResponse } from "next/server";
import { getSectionAssets } from "@/src/features/ai-assets/server/serverAssetGenerationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sectionId: string }> },
) {
  const { sectionId } = await context.params;
  const assets = getSectionAssets(sectionId);
  return NextResponse.json({ assets });
}
