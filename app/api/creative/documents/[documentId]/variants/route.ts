import { NextResponse } from "next/server";
import { getDocumentVariants } from "@/src/features/creative/ai/serverGenerationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isDebug = process.env.NODE_ENV !== "production";

const logDebug = (message: string, meta?: Record<string, unknown>) => {
  if (!isDebug) {
    return;
  }
  if (meta) {
    console.info(`[creative:variants-route] ${message}`, meta);
    return;
  }
  console.info(`[creative:variants-route] ${message}`);
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await context.params;
  logDebug("read:entered", { documentId });
  const variants = getDocumentVariants(documentId);
  if (!variants) {
    logDebug("read:empty", { documentId });
    return NextResponse.json({ variants: [] });
  }
  logDebug("read:ok", { documentId, count: variants.length });
  return NextResponse.json({ variants });
}
