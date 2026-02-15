export type DiffToken = {
  type: "equal" | "insert" | "delete";
  text: string;
};

const tokenize = (text: string) =>
  text.match(/(\s+|[^\s]+)/g) ?? [];

const mergeTokens = (tokens: DiffToken[]) => {
  const merged: DiffToken[] = [];
  tokens.forEach((token) => {
    const last = merged[merged.length - 1];
    if (last && last.type === token.type) {
      last.text += token.text;
    } else {
      merged.push({ ...token });
    }
  });
  return merged;
};

export const diffWords = (beforeText: string, afterText: string) => {
  const before = tokenize(beforeText);
  const after = tokenize(afterText);
  const rows = before.length + 1;
  const cols = after.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );

  for (let i = rows - 2; i >= 0; i -= 1) {
    for (let j = cols - 2; j >= 0; j -= 1) {
      if (before[i] === after[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      result.push({ type: "equal", text: before[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "delete", text: before[i] });
      i += 1;
    } else {
      result.push({ type: "insert", text: after[j] });
      j += 1;
    }
  }

  while (i < before.length) {
    result.push({ type: "delete", text: before[i] });
    i += 1;
  }

  while (j < after.length) {
    result.push({ type: "insert", text: after[j] });
    j += 1;
  }

  return mergeTokens(result);
};
