const NUMERIC_TOKEN_REGEX = /[0-9０-９][0-9０-９,.\-\/:％%]*/g;
const DATE_PATTERNS: RegExp[] = [
  /[0-9]{4}[/-][0-9]{1,2}[/-][0-9]{1,2}/g,
  /[0-9]{1,2}[/-][0-9]{1,2}/g,
  /[0-9]{4}年[0-9]{1,2}月[0-9]{1,2}日/g,
  /[0-9]{1,2}月[0-9]{1,2}日/g,
  /[０-９]{4}[/-][０-９]{1,2}[/-][０-９]{1,2}/g,
  /[０-９]{1,2}[/-][０-９]{1,2}/g,
  /[０-９]{4}年[０-９]{1,2}月[０-９]{1,2}日/g,
  /[０-９]{1,2}月[０-９]{1,2}日/g,
];

const TERMS_DENYLIST = [
  "規約",
  "注意事項",
  "免責",
  "禁止",
  "還元",
  "上限",
  "抽選",
  "先着",
  "期間",
  "対象外",
  "条件",
];

const ERROR_MESSAGE =
  "数値・日付・規約に関わる文言は変更できません。条件を変えて再提案してください。";

export const extractProtectedTokens = (original: string) => {
  const tokens: string[] = [];
  const numeric = original.match(NUMERIC_TOKEN_REGEX);
  if (numeric) {
    tokens.push(...numeric);
  }
  DATE_PATTERNS.forEach((pattern) => {
    const matches = original.match(pattern);
    if (matches) {
      tokens.push(...matches);
    }
  });
  return tokens;
};

const buildCounts = (tokens: string[]) => {
  const counts = new Map<string, number>();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });
  return counts;
};

type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export const validateProposal = (
  original: string,
  proposed: string
): ValidationResult => {
  const originalTokens = extractProtectedTokens(original);
  const proposedTokens = extractProtectedTokens(proposed);
  const originalCounts = buildCounts(originalTokens);
  const proposedCounts = buildCounts(proposedTokens);

  for (const [token, count] of originalCounts.entries()) {
    if (proposedCounts.get(token) !== count) {
      return { ok: false, reason: ERROR_MESSAGE };
    }
  }

  for (const [token, count] of proposedCounts.entries()) {
    if (originalCounts.get(token) !== count) {
      return { ok: false, reason: ERROR_MESSAGE };
    }
  }

  for (const term of TERMS_DENYLIST) {
    if (original.includes(term) && !proposed.includes(term)) {
      return { ok: false, reason: ERROR_MESSAGE };
    }
  }

  return { ok: true };
};

type GuardResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export const guardAiRewrite = (
  original: string,
  proposed: string
): GuardResult => {
  const trimmed = proposed.trim();
  if (!trimmed) {
    return { ok: false, error: "提案テキストが空です。" };
  }
  const validation = validateProposal(original, trimmed);
  if (!validation.ok) {
    return { ok: false, error: validation.reason };
  }
  return { ok: true, text: trimmed };
};
