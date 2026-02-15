import type { BackgroundSpec } from "@/src/types/project";

export type BackgroundPreset = {
  id: string;
  label: string;
  spec: BackgroundSpec;
};

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "sunset",
    label: "Sunset",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#ff9a8b", pos: 0 },
        { color: "#ff6a88", pos: 50 },
        { color: "#ff99ac", pos: 100 },
      ],
    },
  },
  {
    id: "sky",
    label: "Sky",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#89f7fe", pos: 0 },
        { color: "#66a6ff", pos: 100 },
      ],
    },
  },
  {
    id: "mint",
    label: "Mint",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#d4fc79", pos: 0 },
        { color: "#96e6a1", pos: 100 },
      ],
    },
  },
  {
    id: "sand",
    label: "Sand",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#fdfcfb", pos: 0 },
        { color: "#e2d1c3", pos: 100 },
      ],
    },
  },
  {
    id: "night",
    label: "Night",
    spec: {
      type: "gradient",
      angle: 180,
      stops: [
        { color: "#0f2027", pos: 0 },
        { color: "#203a43", pos: 50 },
        { color: "#2c5364", pos: 100 },
      ],
    },
  },
  {
    id: "dawn",
    label: "Dawn",
    spec: {
      type: "gradient",
      angle: 150,
      stops: [
        { color: "#fbc2eb", pos: 0 },
        { color: "#a6c1ee", pos: 100 },
      ],
    },
  },
  {
    id: "aurora",
    label: "Aurora",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#00f5a0", pos: 0 },
        { color: "#00d9f5", pos: 100 },
      ],
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    spec: {
      type: "gradient",
      angle: 140,
      stops: [
        { color: "#2193b0", pos: 0 },
        { color: "#6dd5ed", pos: 100 },
      ],
    },
  },
  {
    id: "coral",
    label: "Coral",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#ff9966", pos: 0 },
        { color: "#ff5e62", pos: 100 },
      ],
    },
  },
  {
    id: "peach",
    label: "Peach",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#ffecd2", pos: 0 },
        { color: "#fcb69f", pos: 100 },
      ],
    },
  },
  {
    id: "citrus",
    label: "Citrus",
    spec: {
      type: "gradient",
      angle: 120,
      stops: [
        { color: "#f9d423", pos: 0 },
        { color: "#ff4e50", pos: 100 },
      ],
    },
  },
  {
    id: "forest",
    label: "Forest",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#5a3f37", pos: 0 },
        { color: "#2c7744", pos: 100 },
      ],
    },
  },
  {
    id: "moss",
    label: "Moss",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#134e5e", pos: 0 },
        { color: "#71b280", pos: 100 },
      ],
    },
  },
  {
    id: "lavender",
    label: "Lavender",
    spec: {
      type: "gradient",
      angle: 150,
      stops: [
        { color: "#cfd9df", pos: 0 },
        { color: "#e2ebf0", pos: 100 },
      ],
    },
  },
  {
    id: "glacier",
    label: "Glacier",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#c2e9fb", pos: 0 },
        { color: "#a1c4fd", pos: 100 },
      ],
    },
  },
  {
    id: "slate",
    label: "Slate",
    spec: {
      type: "gradient",
      angle: 160,
      stops: [
        { color: "#bdc3c7", pos: 0 },
        { color: "#2c3e50", pos: 100 },
      ],
    },
  },
  {
    id: "graphite",
    label: "Graphite",
    spec: {
      type: "gradient",
      angle: 160,
      stops: [
        { color: "#232526", pos: 0 },
        { color: "#414345", pos: 100 },
      ],
    },
  },
  {
    id: "blush",
    label: "Blush",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#fbd3e9", pos: 0 },
        { color: "#bb377d", pos: 100 },
      ],
    },
  },
  {
    id: "rosewood",
    label: "Rosewood",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#3f0d12", pos: 0 },
        { color: "#a71d31", pos: 100 },
      ],
    },
  },
  {
    id: "canyon",
    label: "Canyon",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#f46b45", pos: 0 },
        { color: "#eea849", pos: 100 },
      ],
    },
  },
  {
    id: "neon",
    label: "Neon",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#12c2e9", pos: 0 },
        { color: "#c471ed", pos: 50 },
        { color: "#f64f59", pos: 100 },
      ],
    },
  },
  {
    id: "pastel",
    label: "Pastel",
    spec: {
      type: "gradient",
      angle: 135,
      stops: [
        { color: "#a1ffce", pos: 0 },
        { color: "#faffd1", pos: 100 },
      ],
    },
  },
  {
    id: "layer-balloons",
    label: "Layered Balloons",
    spec: {
      type: "layers",
      backgroundColor: "#fff7fb",
      layers: [
        {
          type: "pattern",
          patternId: "balloons",
          foreground: "#f472b6",
          background: "transparent",
          size: 28,
          opacity: 0.2,
        },
        {
          type: "gradient",
          angle: 140,
          stops: [
            { color: "#fde68a", pos: 0 },
            { color: "#fbcfe8", pos: 100 },
          ],
        },
      ],
    },
  },
  {
    id: "layer-flowers",
    label: "Layered Flowers",
    spec: {
      type: "layers",
      backgroundColor: "#fff7ed",
      layers: [
        {
          type: "pattern",
          patternId: "flowers",
          foreground: "#fb7185",
          background: "transparent",
          size: 24,
          opacity: 0.18,
        },
        {
          type: "gradient",
          angle: 160,
          stops: [
            { color: "#ffedd5", pos: 0 },
            { color: "#fee2e2", pos: 100 },
          ],
        },
      ],
    },
  },
  {
    id: "layer-bow",
    label: "Layered Bow",
    spec: {
      type: "layers",
      backgroundColor: "#fdf2f8",
      layers: [
        {
          type: "pattern",
          patternId: "bow",
          foreground: "#f472b6",
          background: "transparent",
          size: 22,
          opacity: 0.22,
        },
        {
          type: "gradient",
          angle: 135,
          stops: [
            { color: "#fae8ff", pos: 0 },
            { color: "#ffe4e6", pos: 100 },
          ],
        },
      ],
    },
  },
  {
    id: "layer-yume",
    label: "Layered Yume",
    spec: {
      type: "layers",
      backgroundColor: "#f8fafc",
      layers: [
        {
          type: "pattern",
          patternId: "yume",
          foreground: "#a5b4fc",
          background: "transparent",
          size: 30,
          opacity: 0.16,
        },
        {
          type: "gradient",
          angle: 135,
          stops: [
            { color: "#e0f2fe", pos: 0 },
            { color: "#fce7f3", pos: 100 },
          ],
        },
      ],
    },
  },
  {
    id: "paper",
    label: "Paper",
    spec: { type: "solid", color: "#f8fafc" },
  },
  {
    id: "warmwhite",
    label: "Warm White",
    spec: { type: "solid", color: "#fff7ed" },
  },
  {
    id: "charcoal",
    label: "Charcoal",
    spec: { type: "solid", color: "#0f172a" },
  },
];

export const BACKGROUND_PRESET_OPTIONS = BACKGROUND_PRESETS.map((preset) => ({
  id: preset.id,
  label: preset.label,
}));

const PRESET_BY_ID = new Map(
  BACKGROUND_PRESETS.map((preset) => [preset.id, preset.spec])
);

export const resolveBackgroundPreset = (presetId: string) =>
  PRESET_BY_ID.get(presetId);
