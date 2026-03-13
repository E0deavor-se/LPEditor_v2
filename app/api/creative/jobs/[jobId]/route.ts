import { NextResponse } from "next/server";
import { getJob } from "@/src/features/creative/ai/serverGenerationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isDebug = process.env.NODE_ENV !== "production";

const logDebug = (message: string, meta?: Record<string, unknown>) => {
  if (!isDebug) {
    return;
  }
  if (meta) {
    console.info(`[creative:jobs-route] ${message}`, meta);
    return;
  }
  console.info(`[creative:jobs-route] ${message}`);
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  logDebug("read:entered", { jobId });
  const job = getJob(jobId);
  if (!job) {
    logDebug("read:not-found", { jobId });
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

  logDebug("read:ok", {
    jobId,
    status: job.status,
    progress: job.progress,
    message: job.message,
  });
  return NextResponse.json(job);
}
