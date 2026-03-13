import { NextResponse } from "next/server";
import {
  appendBindHistory,
  findAsset,
} from "@/src/features/ai-assets/server/serverAssetGenerationStore";
import type { AiAssetBindPayload } from "@/src/features/ai-assets/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<AiAssetBindPayload>;

    if (!body.sectionId || !body.assetId || !body.role) {
      return NextResponse.json({ error: "Invalid bind payload." }, { status: 400 });
    }

    const exists = findAsset(body.sectionId, body.assetId);
    if (!exists) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    const next = appendBindHistory(body.sectionId, body.assetId, body.role);
    if (!next) {
      return NextResponse.json({ error: "Failed to bind asset." }, { status: 500 });
    }

    return NextResponse.json({ asset: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to bind asset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
