import "server-only";
import { fal } from "@fal-ai/client";

export type FalAiErrorCode =
  | "missing_key"
  | "auth_or_permission"
  | "invalid_response"
  | "unknown";

type FalErrorInfo = {
  code: FalAiErrorCode;
  message: string;
};

const DEFAULT_MODEL = process.env.FAL_NANO_BANANA_MODEL ?? "fal-ai/nano-banana-2";
const FALLBACK_MODELS = (process.env.FAL_NANO_BANANA_FALLBACK_MODELS ?? "fal-ai/flux/schnell")
  .split(",")
  .map((entry) => entry.trim())
  .filter((entry) => entry.length > 0 && entry !== DEFAULT_MODEL);

const AUTH_TOKENS = [
  "forbidden",
  "unauthorized",
  "status code 401",
  "status code 403",
  "invalid api key",
  "invalid key",
  "permission",
] as const;

const toNormalizedErrorText = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.toLowerCase();
};

export class FalAiProviderError extends Error {
  code: FalAiErrorCode;

  constructor(code: FalAiErrorCode, message: string) {
    super(message);
    this.name = "FalAiProviderError";
    this.code = code;
  }
}

export const getFalModelCandidates = () => ({
  defaultModel: DEFAULT_MODEL,
  fallbackModels: FALLBACK_MODELS,
});

export const hasFalKey = (): boolean =>
  typeof process.env.FAL_KEY === "string" && process.env.FAL_KEY.trim().length > 0;

export const ensureFalKey = (): string => {
  if (!hasFalKey()) {
    throw new FalAiProviderError(
      "missing_key",
      "fal.ai の認証キーが設定されていません。サーバー環境変数 FAL_KEY を設定してください。",
    );
  }
  return process.env.FAL_KEY!.trim();
};

export const configureFalClient = () => {
  const key = ensureFalKey();
  fal.config({ credentials: key });
};

export const classifyFalError = (error: unknown): FalErrorInfo => {
  const raw = error instanceof Error ? error.message : String(error);
  const normalized = toNormalizedErrorText(error);

  if (AUTH_TOKENS.some((token) => normalized.includes(token))) {
    return {
      code: "auth_or_permission",
      message:
        "fal.ai の認証またはモデル利用権限でエラーが発生しました。FAL_KEY とモデル権限を確認してください。",
    };
  }

  return {
    code: "unknown",
    message: raw,
  };
};
