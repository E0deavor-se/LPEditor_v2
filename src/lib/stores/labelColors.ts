const DEFAULT_LABEL_COLORS = [
  "#DBEAFE",
  "#FEE2E2",
  "#DCFCE7",
  "#FEF3C7",
  "#E0F2FE",
  "#F3E8FF",
];

const RANDOM_LABEL_PALETTE = [
  "#F2B183",
  "#F0C27B",
  "#E9A8A0",
  "#D9A0E8",
  "#9FB7E9",
  "#89C6E5",
  "#7DCBB0",
  "#A5D66F",
  "#E6D26A",
  "#F0A3B0",
  "#CFA6EA",
  "#9BCED9",
];

const normalizeKey = (value: string) =>
  value.normalize("NFKC").trim().toLowerCase();

const hashKey = (value: string) => {
  const normalized = normalizeKey(value);
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash);
};

export const getStableLabelColor = (key: string) => {
  if (!key) {
    return DEFAULT_LABEL_COLORS[0];
  }
  const hash = hashKey(key);
  return DEFAULT_LABEL_COLORS[hash % DEFAULT_LABEL_COLORS.length];
};

export const getUniqueLabelColorMap = (keys: string[]) => {
  const paletteSize = RANDOM_LABEL_PALETTE.length;
  const usedIndices = new Set<number>();
  const result: Record<string, string> = {};
  keys.forEach((key) => {
    let index = hashKey(key || "default") % paletteSize;
    let attempts = 0;
    while (usedIndices.has(index) && attempts < paletteSize) {
      index = (index + 1) % paletteSize;
      attempts += 1;
    }
    const color = usedIndices.has(index)
      ? getStableLabelColor(key)
      : RANDOM_LABEL_PALETTE[index];
    result[key] = color;
    usedIndices.add(index);
  });
  return result;
};

export { DEFAULT_LABEL_COLORS, RANDOM_LABEL_PALETTE };
