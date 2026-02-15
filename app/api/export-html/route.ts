import { NextResponse } from "next/server";
import PreviewSsr from "@/src/preview/PreviewSsr";
import { buildIndexHtml } from "@/src/lib/exportZip";
import type { ProjectState } from "@/src/types/project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportHtmlPayload = {
  project?: ProjectState;
  ui?: {
    previewMode?: string;
    previewAspect?: string;
    isPreviewBusy?: boolean;
    previewBusyReason?: string;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportHtmlPayload;
    if (!body?.project) {
      return NextResponse.json(
        { error: "project is required" },
        { status: 400 }
      );
    }

    const sectionCount = body.project.sections?.length ?? 0;
    console.log("[export-html] sections:", sectionCount);

    const { renderToStaticMarkup } = await import("react-dom/server");
    const bodyHtml = renderToStaticMarkup(
      PreviewSsr({ project: body.project, ui: body.ui ?? null })
    );
    console.log("[export-html] bodyHtml length:", bodyHtml.length);
    const html = buildIndexHtml({
      bodyHtml,
      inlineCss: true,
      project: body.project,
    });
    console.log("[export-html] final html length:", html.length);

    if (!html || html.trim().length < 50) {
      return NextResponse.json(
        {
          error: "empty html",
          debug: {
            bodyLen: bodyHtml.length,
            htmlLen: html.length,
            sections: sectionCount,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json(
      {
        error: String((error as Error | undefined)?.message ?? error),
        stack: String((error as Error | undefined)?.stack ?? ""),
      },
      { status: 500 }
    );
  }
}
