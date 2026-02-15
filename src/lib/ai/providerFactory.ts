import type { AiProvider } from "./aiProvider";
import { ApiProvider } from "./apiProvider";
import { MockAiProvider } from "./mockProvider";

// NEXT_PUBLIC_AI_MODE=mock | api
export const getAiProvider = (): AiProvider => {
  const mode = process.env.NEXT_PUBLIC_AI_MODE ?? "mock";
  if (mode === "api") {
    return new ApiProvider();
  }
  return new MockAiProvider();
};
