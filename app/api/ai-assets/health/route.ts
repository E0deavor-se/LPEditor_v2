import { NextResponse } from "next/server";
import {
  configureFalClient,
  FalAiProviderError,
  getFalModelCandidates,
  hasFalKey,
} from "@/src/features/ai-assets/server/falProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const models = getFalModelCandidates();
  const result: {
    ok: boolean;
    route: string;
    serverOnly: boolean;
    hasFalKey: boolean;
    providerInitialized: boolean;
    code?: "missing_key" | "auth_or_permission" | "invalid_response" | "unknown";
    message?: string;
    models: {
      defaultModel: string;
      fallbackModels: string[];
    };
  } = {
    ok: false,
    route: "/api/ai-assets/health",
    serverOnly: true,
    hasFalKey: hasFalKey(),
    providerInitialized: false,
    models,
  };

  try {
    configureFalClient();
    result.ok = true;
    result.providerInitialized = true;
    return NextResponse.json(result);
  } catch (error) {
    const providerError =
      error instanceof FalAiProviderError
        ? error
        : new FalAiProviderError(
            "unknown",
            error instanceof Error ? error.message : "health check failed",
          );
    result.code = providerError.code;
    result.message = providerError.message;
    return NextResponse.json(result, { status: 500 });
  }
}
