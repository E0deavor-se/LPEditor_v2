import type { AiProvider, AiRewriteRequest, AiRewriteResponse } from "./aiProvider";

export class ApiProvider implements AiProvider {
  async rewrite(request: AiRewriteRequest): Promise<AiRewriteResponse> {
    const response = await fetch("/api/ai/rewrite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let message = "AI提案に失敗しました。";
      try {
        const data = (await response.json()) as { error?: string };
        if (data?.error) {
          message = data.error;
        }
      } catch {
        // Ignore JSON parse errors.
      }
      throw new Error(message);
    }

    const payload = (await response.json()) as AiRewriteResponse;
    if (!payload?.text) {
      throw new Error("AI提案の結果が不正です。");
    }
    return payload;
  }
}
