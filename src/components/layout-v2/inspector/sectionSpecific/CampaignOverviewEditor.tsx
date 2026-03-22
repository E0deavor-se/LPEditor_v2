"use client";

import type { SyntheticEvent } from "react";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorTextarea from "@/src/components/inspector/InspectorTextarea";
import Inspector2Block from "@/src/components/layout-v2/inspector/Inspector2Block";
import SectionCommonFields from "@/src/components/layout-v2/inspector/sectionSpecific/SectionCommonFields";
import SectionAppearanceEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionAppearanceEditor";
import SectionOptionalBlocksEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionOptionalBlocksEditor";
import { useTextSelection } from "@/src/components/editor/TextSelectionContext";
import type { ContentItem, SectionBase } from "@/src/types/project";

type CampaignOverviewEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  onPatchContent: (patch: {
    items?: ContentItem[];
    title?: string;
    buttons?: Array<{ id: string; label: string; href: string; variant?: "primary" | "secondary" }>;
    media?: Array<{ id: string; imageUrl: string; alt?: string; caption?: string; width?: number; align?: "left" | "center" | "right" }>;
  }) => void;
  onPatchStyle: (patch: {
    typography?: {
      lineHeight?: number;
      letterSpacing?: number;
    };
  }) => void;
  onRenameSection?: (name: string) => void;
  onToggleVisible?: () => void;
};

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const DEFAULT_BODY_LINES = [
  "期間中、「〇〇〇」の対象店舗で 1回〇〇〇円（税込）以上の",
  "au PAY（コード支払い）で 使える最大〇〇％割引クーポンをau PAY アプリにてプレゼント！",
];

const DEFAULT_NOTICE_LINES = [
  "〇〇店、〇〇店は対象外です。",
  "一部休業中店舗がございます。詳細はHPをご確認ください。",
];

const splitTextareaLines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.replace(/\r/g, ""));

const normalizeLinesFromData = (value: unknown, fallback: string[]): string[] => {
  if (Array.isArray(value)) {
    const next = value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") return String((entry as Record<string, unknown>).text ?? "");
        return "";
      })
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    if (next.length > 0) return next;
  }
  return [...fallback];
};

const normalizeBlocksFromData = (value: unknown, fallback: string[]): string[] => {
  if (Array.isArray(value)) {
    const next = value
      .map((entry) => String(entry ?? "").replace(/\r/g, ""))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    if (next.length > 0) return next;
  }
  return [fallback.join("\n")];
};

const splitNoticeBlocksFromLines = (lines: string[]): string[] => {
  const blocks: string[] = [];
  let current: string[] = [];
  lines.forEach((line) => {
    const raw = String(line ?? "").replace(/\r/g, "");
    if (raw.trim().length === 0) {
      if (current.length > 0) {
        blocks.push(current.join("\n").trim());
        current = [];
      }
      return;
    }
    current.push(raw);
  });
  if (current.length > 0) {
    blocks.push(current.join("\n").trim());
  }
  return blocks.filter((block) => block.length > 0);
};

export default function CampaignOverviewEditor({
  section,
  disabled,
  onPatchData,
  onPatchContent,
  onPatchStyle,
  onRenameSection,
  onToggleVisible,
}: CampaignOverviewEditorProps) {
  const { saveSelection } = useTextSelection();
  const data = section.data as Record<string, unknown>;
  const items = (section.content?.items ?? []) as ContentItem[];
  const textItems = items.filter((item) => item.type === "text");

  const noticeTextItem = textItems.find(
    (item) =>
      item.type === "text" &&
      item.lines.length > 0 &&
      item.lines.every((line) => Boolean(line.marks?.callout?.enabled))
  );
  const bodyTextItem = textItems.find((item) => item.id !== noticeTextItem?.id) ?? textItems[0];

  const heading = String((section.content as Record<string, unknown> | undefined)?.title ?? data.title ?? "");

  const bodyLines =
    bodyTextItem && bodyTextItem.type === "text" && bodyTextItem.lines.length > 0
      ? bodyTextItem.lines.map((line) => String(line.text ?? ""))
      : normalizeLinesFromData(data.bodyLines, DEFAULT_BODY_LINES);

  const noticeLines =
    noticeTextItem && noticeTextItem.type === "text" && noticeTextItem.lines.length > 0
      ? noticeTextItem.lines.map((line) => String(line.text ?? ""))
      : normalizeLinesFromData(data.noticeLines, DEFAULT_NOTICE_LINES);
  const noticeBlocks =
    Array.isArray(data.noticeBlocks) && data.noticeBlocks.length > 0
      ? normalizeBlocksFromData(data.noticeBlocks, DEFAULT_NOTICE_LINES)
      : (() => {
          const fromLines = splitNoticeBlocksFromLines(noticeLines);
          return fromLines.length > 0 ? fromLines : [DEFAULT_NOTICE_LINES.join("\n")];
        })();

  const bodyText = bodyLines.join("\n");

  const noticeEnabled = data.noticeEnabled !== false;
  const bodyWidthPct =
    typeof data.bodyWidthPct === "number" && Number.isFinite(data.bodyWidthPct)
      ? data.bodyWidthPct
      : 100;
  const bodyTextSizePx =
    typeof data.bodyTextSizePx === "number" && Number.isFinite(data.bodyTextSizePx)
      ? data.bodyTextSizePx
      : 14;
  const noticeTextSizePx =
    typeof data.noticeTextSizePx === "number" && Number.isFinite(data.noticeTextSizePx)
      ? data.noticeTextSizePx
      : 13;

  const patchAll = (next: {
    heading?: string;
    bodyText?: string;
    noticeBlocks?: string[];
    noticeEnabled?: boolean;
  }) => {
    const nextHeading = next.heading ?? heading;
    const nextBodyText = next.bodyText ?? bodyText;
    const nextBodyLines = splitTextareaLines(nextBodyText);
    const nextNoticeBlocks = (next.noticeBlocks ?? noticeBlocks)
      .map((block) => block.replace(/\r/g, ""))
      .map((block) => block.trim())
      .filter((block) => block.length > 0);
    const ensuredNoticeBlocks =
      nextNoticeBlocks.length > 0 ? nextNoticeBlocks : [DEFAULT_NOTICE_LINES.join("\n")];
    const nextNoticeLines = ensuredNoticeBlocks.flatMap((block, index) => {
      const lines = splitTextareaLines(block);
      return index === 0 ? lines : ["", ...lines];
    });
    const nextNoticeEnabled =
      typeof next.noticeEnabled === "boolean" ? next.noticeEnabled : noticeEnabled;

    const nextBodyItem = {
      id: bodyTextItem && bodyTextItem.type === "text" ? bodyTextItem.id : createId("item"),
      type: "text" as const,
      lines: nextBodyLines.map((line) => ({
        id: createId("line"),
        text: line,
        marks: {},
      })),
    };

    const nextNoticeItem = {
      id:
        noticeTextItem && noticeTextItem.type === "text"
          ? noticeTextItem.id
          : createId("item"),
      type: "text" as const,
      lines: nextNoticeLines.map((line) => ({
        id: createId("line"),
        text: line,
        marks: {
          callout: {
            enabled: true,
            variant: "note" as const,
          },
        },
      })),
    };

    const restItems = items.filter(
      (item) =>
        (item.type !== "text" || (item.id !== bodyTextItem?.id && item.id !== noticeTextItem?.id))
    );

    onPatchContent({
      title: nextHeading,
      items: [nextBodyItem, nextNoticeItem, ...restItems],
    });

    onPatchData({
      title: nextHeading,
      body: nextBodyText,
      bodyLines: nextBodyLines,
      noticeLines: nextNoticeLines,
      noticeBlocks: ensuredNoticeBlocks,
      noticeEnabled: nextNoticeEnabled,
    });
  };

  const lineHeight =
    typeof section.style?.typography?.lineHeight === "number" &&
    Number.isFinite(section.style.typography.lineHeight)
      ? section.style.typography.lineHeight
      : 1.6;
  const letterSpacing =
    typeof section.style?.typography?.letterSpacing === "number" &&
    Number.isFinite(section.style.typography.letterSpacing)
      ? section.style.typography.letterSpacing
      : 0;

  const captureSelection = (event: SyntheticEvent<HTMLDivElement>) => {
    saveSelection(section.id, event.target as EventTarget | null);
  };

  return (
    <div
      className="border-t border-[var(--ui-border)]/60"
      onMouseUpCapture={captureSelection}
      onKeyUpCapture={captureSelection}
    >
      <SectionCommonFields
        section={section}
        disabled={disabled}
        onRenameSection={onRenameSection}
        onToggleVisible={onToggleVisible}
        onPatchData={onPatchData}
      />

      <Inspector2Block block="basic">
        <InspectorField label="見出し">
          <InspectorInput
            type="text"
            value={heading}
            onChange={(event) => patchAll({ heading: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </Inspector2Block>

      <Inspector2Block block="content">
        <InspectorField label="本文">
          <InspectorTextarea
            rows={2}
            autoGrow
            className="min-h-[44px] resize-none text-[12px]"
            value={bodyText}
            onChange={(event) => patchAll({ bodyText: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] text-[var(--ui-muted)]">注意文言</span>
          <button
            type="button"
            className="ui-button h-6 px-2 text-[10px]"
            onClick={() => {
              patchAll({
                noticeBlocks: [...noticeBlocks, "新しい注意文言"],
                noticeEnabled: true,
              });
            }}
            disabled={disabled}
          >
            + 注意文言ブロック追加
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {noticeBlocks.map((block, index) => (
            <div key={`notice-block-${index}`} className="rounded border border-[var(--ui-border)]/50 p-1.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] text-[var(--ui-muted)]">ブロック {index + 1}</span>
                <button
                  type="button"
                  className="ui-button h-6 px-2 text-[10px]"
                  onClick={() => {
                    const next = noticeBlocks.filter((_, itemIndex) => itemIndex !== index);
                    patchAll({ noticeBlocks: next, noticeEnabled: true });
                  }}
                  disabled={disabled || noticeBlocks.length <= 1}
                >
                  削除
                </button>
              </div>
              <InspectorTextarea
                rows={2}
                autoGrow
                className="min-h-[44px] resize-none text-[12px]"
                value={block}
                onChange={(event) => {
                  const next = [...noticeBlocks];
                  next[index] = event.target.value;
                  patchAll({ noticeBlocks: next, noticeEnabled: true });
                }}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      </Inspector2Block>

      <Inspector2Block block="display">
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">本文幅</span>
          <select
            className="ui-input h-7 w-[120px] text-[11px]"
            value={bodyWidthPct >= 100 ? "wide" : "standard"}
            onChange={(event) =>
              onPatchData({
                bodyWidthPct: event.target.value === "wide" ? 100 : 85,
              })
            }
            disabled={disabled}
          >
            <option value="standard">標準</option>
            <option value="wide">広め</option>
          </select>
        </label>

        <label className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">注意枠表示</span>
          <select
            className="ui-input h-7 w-[120px] text-[11px]"
            value={noticeEnabled ? "on" : "off"}
            onChange={(event) => patchAll({ noticeEnabled: event.target.value === "on" })}
            disabled={disabled}
          >
            <option value="on">ON</option>
            <option value="off">OFF</option>
          </select>
        </label>
      </Inspector2Block>

      <Inspector2Block block="design">
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">本文文字色</span>
          <InspectorInput
            type="color"
            value={String(data.bodyTextColor ?? "#111827")}
            onChange={(event) => onPatchData({ bodyTextColor: event.target.value })}
            disabled={disabled}
          />
        </label>
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">注意文字色</span>
          <InspectorInput
            type="color"
            value={String(data.noticeTextColor ?? "#92400e")}
            onChange={(event) => onPatchData({ noticeTextColor: event.target.value })}
            disabled={disabled}
          />
        </label>
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">背景色</span>
          <InspectorInput
            type="color"
            value={String(data.noticeBg ?? "#fff7ed")}
            onChange={(event) => onPatchData({ noticeBg: event.target.value })}
            disabled={disabled}
          />
        </label>
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">枠線色</span>
          <InspectorInput
            type="color"
            value={String(data.noticeBorderColor ?? "#fed7aa")}
            onChange={(event) => onPatchData({ noticeBorderColor: event.target.value })}
            disabled={disabled}
          />
        </label>
      </Inspector2Block>

      <Inspector2Block block="details" summary="高度設定">
        <InspectorField label="本文文字サイズ(px)">
          <InspectorInput
            type="number"
            min={10}
            max={28}
            step={1}
            value={String(Math.max(10, Math.min(28, bodyTextSizePx)))}
            onChange={(event) => {
              const next = Number(event.target.value || 14);
              onPatchData({ bodyTextSizePx: Math.max(10, Math.min(28, next)) });
            }}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="注意文字サイズ(px)">
          <InspectorInput
            type="number"
            min={10}
            max={24}
            step={1}
            value={String(Math.max(10, Math.min(24, noticeTextSizePx)))}
            onChange={(event) => {
              const next = Number(event.target.value || 13);
              onPatchData({ noticeTextSizePx: Math.max(10, Math.min(24, next)) });
            }}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="余白(px)">
          <InspectorInput
            type="number"
            min={8}
            max={32}
            step={1}
            value={String(
              typeof data.noticePaddingPx === "number" && Number.isFinite(data.noticePaddingPx)
                ? data.noticePaddingPx
                : 14
            )}
            onChange={(event) => {
              const next = Number(event.target.value || 14);
              onPatchData({ noticePaddingPx: Math.max(8, Math.min(32, next)) });
            }}
            disabled={disabled}
          />
        </InspectorField>
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">行間</span>
          <InspectorInput
            type="number"
            min={1}
            max={2.4}
            step={0.1}
            value={String(lineHeight)}
            onChange={(event) =>
              onPatchStyle({
                typography: {
                  lineHeight: Number(event.target.value || 1.6),
                },
              })
            }
            disabled={disabled}
          />
        </label>
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">字間(px)</span>
          <InspectorInput
            type="number"
            min={-1}
            max={6}
            step={0.1}
            value={String(letterSpacing)}
            onChange={(event) =>
              onPatchStyle({
                typography: {
                  letterSpacing: Number(event.target.value || 0),
                },
              })
            }
            disabled={disabled}
          />
        </label>
      </Inspector2Block>

      <SectionOptionalBlocksEditor
        section={section}
        disabled={disabled}
        onPatchContent={onPatchContent}
      />

      <SectionAppearanceEditor
        section={section}
        disabled={disabled}
        onPatchData={onPatchData}
      />
    </div>
  );
}
