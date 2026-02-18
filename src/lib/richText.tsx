import type { CSSProperties, ReactNode } from "react";

const RB_COLOR = "#e11d48";
const RB_START = "[[rb]]";
const RB_END = "[[/rb]]";

type RichSegment = {
  text: string;
  style?: CSSProperties;
};

type StyleEntry = {
  type: string;
  style: CSSProperties;
};

const parseNumber = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseColor = (value?: string) => {
  if (!value) {
    return undefined;
  }
  return value.trim().startsWith("#") ? value.trim() : undefined;
};

const buildStyleEntry = (type: string, value?: string): StyleEntry | null => {
  if (type === "b") {
    return { type, style: { fontWeight: 700 } };
  }
  if (type === "i") {
    return { type, style: { fontStyle: "italic" } };
  }
  if (type === "u") {
    return { type, style: { textDecoration: "underline" } };
  }
  if (type === "rb") {
    return { type, style: { fontWeight: 700, color: RB_COLOR } };
  }
  if (type === "color") {
    const color = parseColor(value);
    return color ? { type, style: { color } } : null;
  }
  if (type === "size") {
    const size = parseNumber(value);
    return size ? { type, style: { fontSize: `${size}px` } } : null;
  }
  if (type === "ls") {
    const spacing = parseNumber(value);
    return spacing != null ? { type, style: { letterSpacing: `${spacing}px` } } : null;
  }
  if (type === "lh") {
    const height = parseNumber(value);
    return height != null ? { type, style: { lineHeight: String(height) } } : null;
  }
  return null;
};

const mergeStyles = (stack: StyleEntry[]): CSSProperties | undefined => {
  if (stack.length === 0) {
    return undefined;
  }
  const result: CSSProperties = {};
  stack.forEach((entry) => {
    Object.assign(result, entry.style);
  });
  return result;
};

export const parseRichTextSegments = (text: string): RichSegment[] => {
  const segments: RichSegment[] = [];
  const stack: StyleEntry[] = [];
  const tagRegex = /\[\[(\/)?([a-z]+)(?::([^\]]+))?\]\]/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = tagRegex.exec(text)) !== null) {
    const [rawTag, isClosing, tagName, tagValue] = match;
    const index = match.index;
    if (index > lastIndex) {
      const chunk = text.slice(lastIndex, index);
      segments.push({ text: chunk, style: mergeStyles(stack) });
    }

    const normalizedTag = tagName.toLowerCase();
    if (isClosing) {
      const foundIndex = stack
        .map((entry) => entry.type)
        .lastIndexOf(normalizedTag);
      if (foundIndex >= 0) {
        stack.splice(foundIndex, 1);
      } else {
        segments.push({ text: rawTag, style: mergeStyles(stack) });
      }
    } else {
      const entry = buildStyleEntry(normalizedTag, tagValue);
      if (entry) {
        stack.push(entry);
      } else {
        segments.push({ text: rawTag, style: mergeStyles(stack) });
      }
    }
    lastIndex = index + rawTag.length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), style: mergeStyles(stack) });
  }

  return segments;
};

export const renderRichText = (text: string): ReactNode =>
  parseRichTextSegments(text).map((segment, index) => (
    <span key={`${index}-${segment.text}`} style={segment.style}>
      {segment.text}
    </span>
  ));

export const richTextMarkers = {
  RB_START,
  RB_END,
};
