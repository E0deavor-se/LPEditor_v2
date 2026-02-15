import type { AiProvider, AiRewriteRequest, AiRewriteResponse } from "./aiProvider";

const NUMERIC_TOKEN_REGEX = /[0-9０-９][0-9０-９,.-\/:％%]*/g;

const splitByNumericTokens = (input: string) => {
  const segments: string[] = [];
  let lastIndex = 0;
  for (const match of input.matchAll(NUMERIC_TOKEN_REGEX)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    segments.push(input.slice(lastIndex, start));
    segments.push(match[0]);
    lastIndex = end;
  }
  segments.push(input.slice(lastIndex));
  return segments;
};

const applyReplacements = (input: string, instruction: string) => {
  const result = input.trim();
  if (!result) {
    return result;
  }
  const wantsShort = /短く|簡潔|short/i.test(instruction);
  const wantsClear = /わかりやすく|易しく|やさしく|plain/i.test(instruction);
  const wantsPolite = /より丁寧に|丁寧|polite/i.test(instruction);
  const wantsAppeal = /訴求力|魅力|強調|appeal/i.test(instruction);

  const segments = splitByNumericTokens(result);
  const rewritten = segments
    .map((segment, index) => {
      if (index % 2 === 1) {
        return segment;
      }
      let updated = segment;
      if (wantsShort) {
        updated = updated
          .replace(/(ぜひ|ぜひとも|ぜひ是非)/g, "")
          .replace(/(することができます|できます)/g, "できます")
          .replace(/(ご利用いただけます|ご利用できます)/g, "ご利用できます")
          .replace(/(ですので|なので)、?/g, "です。")
          .replace(/\s+/g, " ");
      }
      if (wantsClear) {
        updated = updated
          .replace(/、/g, "、")
          .replace(/。/g, "。\n")
          .replace(/(さらに|また)/g, "また")
          .replace(/\n+/g, "\n");
      }
      if (wantsPolite) {
        updated = updated
          .replace(/です。/g, "です。よろしくお願いいたします。")
          .replace(/ます。/g, "ます。")
          .replace(/ください。/g, "ください。お願いいたします。")
          .replace(/\n\n+/g, "\n");
      }
      if (wantsAppeal) {
        updated = updated
          .replace(/おすすめです/g, "おすすめです。ぜひご覧ください")
          .replace(/魅力/g, "魅力とメリット")
          .replace(/\n+/g, "\n");
      }
      return updated.trimEnd();
    })
    .join("");

  return rewritten.trim();
};

export class MockAiProvider implements AiProvider {
  async rewrite(request: AiRewriteRequest): Promise<AiRewriteResponse> {
    const instruction = request.instruction ?? "";
    const text = applyReplacements(request.text, instruction);
    return Promise.resolve({ text });
  }
}

export const mockProvider: AiProvider = new MockAiProvider();
