import { NextResponse } from "next/server";
import { getJob } from "@/src/features/ai-assets/server/serverAssetGenerationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json(
      {
        jobId,
        status: "failed",
        progress: 100,
        message: "Job not found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(job);
}
