"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SectionBase } from "@/src/types/project";
import type { SectionCapabilities } from "@/src/lib/sections/capabilities";
import {
  normalizeCommonStyle,
  type CommonSectionStyle,
  type DecorationItem,
} from "@/src/lib/sections/sectionStyle";
import { useEditorStore } from "@/src/store/editorStore";

const EMPTY_ASSETS: Record<
  string,
  { id: string; filename: string; data: string }
> = {};

const FONT_OPTIONS = [
  {
    label: "既定",
    value: "",
  },
  {
    label: "Noto Sans JP",
    value: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
  },
  {
    label: "Hiragino",
    value: '"Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
  },
  {
    label: "Yu Gothic",
    value: '"Yu Gothic", "Meiryo", sans-serif',
  },
  {
    label: "Meiryo",
    value: '"Meiryo", sans-serif',
  },
  {
    label: "Serif",
    value: '"Hiragino Mincho ProN", "Yu Mincho", serif',
  },
];

const WEIGHT_OPTIONS = [400, 500, 600, 700];

const ALIGN_OPTIONS = [
  { label: "左", value: "left" },
  { label: "中央", value: "center" },
  { label: "右", value: "right" },
] as const;

const ANIM_TYPES = [
  { label: "なし", value: "none" },
  { label: "フェード", value: "fade" },
  { label: "スライド", value: "slide" },
  { label: "ズーム", value: "zoom" },
  { label: "バウンス", value: "bounce" },
] as const;

const ANIM_TRIGGERS = [
  { label: "表示時", value: "onView" },
  { label: "スクロール時", value: "onScroll" },
] as const;

const EASING_OPTIONS = [
  { label: "linear", value: "linear" },
  { label: "ease", value: "ease" },
  { label: "ease-in", value: "ease-in" },
  { label: "ease-out", value: "ease-out" },
  { label: "ease-in-out", value: "ease-in-out" },
] as const;

type CommonSectionEditorProps = {
  section: SectionBase;
  capabilities: SectionCapabilities;
  disabled?: boolean;
};

type ContentMeta =
  | { type: "lines"; key: string; label: string }
  | { type: "text"; key: string; label: string }
  | null;

const toColorValue = (value: string) => {
  if (typeof value !== "string" || value.length === 0) {
    return "#000000";
  }
  if (/^#[0-9a-f]{3,8}$/i.test(value)) {
    return value;
  }
  return "#000000";
};


export default function CommonSectionEditor({
  section,
  capabilities,
  disabled = false,
}: CommonSectionEditorProps) {
  const updateSectionData = useEditorStore((state) => state.updateSectionData);
  const updateSectionStyle = useEditorStore(
    (state) => state.updateSectionStyle
  );
  const addAsset = useEditorStore((state) => state.addAsset);
  const assets = useEditorStore(
    (state) => state.project.assets ?? EMPTY_ASSETS
  );
  const normalized = useMemo(() => normalizeCommonStyle(section.style), [section.style]);
  const [activeTab, setActiveTab] = useState<string>("content");
  const [contentDraft, setContentDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const defaultLegalBullet = section.data?.bullet === "none" ? "none" : "disc";
  const normalizeLegalNoteItems = (
    items: unknown,
    defaultBullet: "none" | "disc"
  ) => {
    if (!Array.isArray(items)) {
      return [] as Array<{ text: string; bullet: "none" | "disc" }>;
    }
    return items
      .map((item) => {
        if (typeof item === "string") {
          return { text: item, bullet: defaultBullet };
        }
        if (!item || typeof item !== "object") {
          return null;
        }
        const entry = item as Record<string, unknown>;
        const text = typeof entry.text === "string" ? entry.text : "";
        const bullet =
          entry.bullet === "none" || entry.bullet === "disc"
            ? entry.bullet
            : defaultBullet;
        return { text, bullet };
      })
      .filter(
        (item): item is { text: string; bullet: "none" | "disc" } =>
          Boolean(item)
      );
  };

  const contentMeta: ContentMeta = useMemo(() => {
    if (Array.isArray(section.data.lines)) {
      return { type: "lines", key: "lines", label: "本文" };
    }
    if (section.type === "legalNotes" && Array.isArray(section.data.items)) {
      return { type: "lines", key: "items", label: "注意事項" };
    }
    if (typeof section.data.body === "string") {
      return { type: "text", key: "body", label: "本文" };
    }
    if (typeof section.data.text === "string") {
      return { type: "text", key: "text", label: "本文" };
    }
    return null;
  }, [section.data, section.type]);

  const tabs = useMemo(() => {
    const entries = [
      { key: "content", label: "内容", enabled: capabilities.text },
      {
        key: "style",
        label: "スタイル",
        enabled: capabilities.typography || capabilities.colors || capabilities.layout,
      },
      { key: "decor", label: "装飾", enabled: capabilities.decorations },
      { key: "anim", label: "アニメ", enabled: capabilities.animation },
    ];
    return entries.filter((entry) => entry.enabled);
  }, [capabilities]);

  useEffect(() => {
    if (tabs.length === 0) {
      return undefined;
    }
    if (!tabs.find((entry) => entry.key === activeTab)) {
      const nextTab = tabs[0]?.key ?? "content";
      if (nextTab !== activeTab) {
        setActiveTab(nextTab);
      }
    }
    return undefined;
  }, [activeTab, tabs]);

  useEffect(() => {
    const nextDraft = (() => {
      if (!contentMeta) {
        return "";
      }
      if (contentMeta.type === "lines") {
        const lines = Array.isArray(section.data[contentMeta.key])
          ? (section.data[contentMeta.key] as unknown[])
          : [];
        if (section.type === "legalNotes" && contentMeta.key === "items") {
          return normalizeLegalNoteItems(lines, defaultLegalBullet)
            .map((item) => item.text)
            .join("\n");
        }
        return (lines as string[]).join("\n");
      }
      const value = section.data[contentMeta.key];
      return typeof value === "string" ? value : "";
    })();
    if (nextDraft !== contentDraft) {
      setContentDraft(nextDraft);
    }
    return undefined;
  }, [section.id, contentMeta, section.data, contentDraft]);

  const commitContent = () => {
    if (!contentMeta) {
      return;
    }
    if (contentMeta.type === "lines") {
      const lines = contentDraft
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      if (section.type === "legalNotes" && contentMeta.key === "items") {
        const currentItems = normalizeLegalNoteItems(
          section.data.items,
          defaultLegalBullet
        );
        const nextItems = lines.map((text, index) => ({
          text,
          bullet: currentItems[index]?.bullet ?? defaultLegalBullet,
        }));
        updateSectionData(section.id, { [contentMeta.key]: nextItems });
        return;
      }
      updateSectionData(section.id, { [contentMeta.key]: lines });
      return;
    }
    updateSectionData(section.id, { [contentMeta.key]: contentDraft });
  };

  const handleAddLine = () => {
    const next = contentDraft ? `${contentDraft}\n` : "";
    setContentDraft(next);
    if (contentMeta?.type === "lines") {
      const lines = next
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      if (section.type === "legalNotes" && contentMeta.key === "items") {
        const currentItems = normalizeLegalNoteItems(
          section.data.items,
          defaultLegalBullet
        );
        const nextItems = lines.map((text, index) => ({
          text,
          bullet: currentItems[index]?.bullet ?? defaultLegalBullet,
        }));
        updateSectionData(section.id, { [contentMeta.key]: nextItems });
        return;
      }
      updateSectionData(section.id, { [contentMeta.key]: lines });
    }
  };

  const handleRemoveLine = () => {
    const lines = contentDraft.split("\n");
    if (lines.length === 0) {
      return;
    }
    lines.pop();
    const next = lines.join("\n");
    setContentDraft(next);
    if (contentMeta?.type === "lines") {
      const normalized = next
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      if (section.type === "legalNotes" && contentMeta.key === "items") {
        const currentItems = normalizeLegalNoteItems(
          section.data.items,
          defaultLegalBullet
        );
        const nextItems = normalized.map((text, index) => ({
          text,
          bullet: currentItems[index]?.bullet ?? defaultLegalBullet,
        }));
        updateSectionData(section.id, { [contentMeta.key]: nextItems });
        return;
      }
      updateSectionData(section.id, { [contentMeta.key]: normalized });
    }
  };

  const updateStyle = (patch: Partial<CommonSectionStyle>) => {
    updateSectionStyle(section.id, patch);
  };

  const decorations = normalized.decorations?.items ?? [];

  const handleAddDecoration = async (file: File) => {
    if (decorations.length >= 2) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === "string" ? reader.result : "";
      const assetId = addAsset({ filename: file.name, data });
      const nextItem: DecorationItem = {
        id: `deco_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        assetId,
        position: "bg",
        size: 180,
        rotate: 0,
        opacity: 0.7,
      };
      updateStyle({ decorations: { items: [...decorations, nextItem] } });
    };
    reader.readAsDataURL(file);
  };

  const handleDecorationChange = (
    id: string,
    patch: Partial<DecorationItem>
  ) => {
    const nextItems = decorations.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    updateStyle({ decorations: { items: nextItems } });
  };

  const handleDecorationRemove = (id: string) => {
    const nextItems = decorations.filter((item) => item.id !== id);
    updateStyle({ decorations: { items: nextItems } });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`ui-chip h-7 px-3 ${
              activeTab === tab.key ? "is-active" : ""
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "content" && capabilities.text ? (
        <div className="flex flex-col gap-3">
          {contentMeta ? (
            <label className="ui-field">
              <span className="ui-field-label">{contentMeta.label}</span>
              <textarea
                className="ui-textarea min-h-[140px]"
                value={contentDraft}
                onChange={(event) => setContentDraft(event.target.value)}
                onBlur={commitContent}
                disabled={disabled}
              />
              {contentMeta.type === "lines" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="ui-button h-7 px-2 text-[11px]"
                    onClick={handleAddLine}
                    disabled={disabled}
                  >
                    行追加
                  </button>
                  <button
                    type="button"
                    className="ui-button h-7 px-2 text-[11px]"
                    onClick={handleRemoveLine}
                    disabled={disabled}
                  >
                    行削除
                  </button>
                </div>
              ) : null}
            </label>
          ) : (
            <div className="text-xs text-[var(--ui-muted)]">
              このセクションの内容は個別編集で設定します。
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "style" && (capabilities.typography || capabilities.colors || capabilities.layout) ? (
        <div className="flex flex-col gap-4">
          {capabilities.typography ? (
            <div className="ui-card">
              <div className="text-sm font-semibold text-[var(--ui-text)]">
                フォント
              </div>
              <div className="mt-3 grid gap-3">
                <label className="ui-field">
                  <span className="ui-field-label">ファミリー</span>
                  <select
                    className="ui-select"
                    value={normalized.typography?.fontFamily ?? ""}
                    onChange={(event) =>
                      updateStyle({
                        typography: {
                          ...(normalized.typography ?? {}),
                          fontFamily: event.target.value,
                        },
                      })
                    }
                    disabled={disabled}
                  >
                    {FONT_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="ui-field">
                    <span className="ui-field-label">サイズ</span>
                    <input
                      className="ui-input"
                      type="number"
                      min={12}
                      max={40}
                      value={normalized.typography?.fontSize ?? 16}
                      onChange={(event) =>
                        updateStyle({
                          typography: {
                            ...(normalized.typography ?? {}),
                            fontSize: Number(event.target.value),
                          },
                        })
                      }
                      disabled={disabled}
                    />
                  </label>
                  <label className="ui-field">
                    <span className="ui-field-label">太さ</span>
                    <select
                      className="ui-select"
                      value={normalized.typography?.fontWeight ?? 500}
                      onChange={(event) =>
                        updateStyle({
                          typography: {
                            ...(normalized.typography ?? {}),
                            fontWeight: Number(event.target.value),
                          },
                        })
                      }
                      disabled={disabled}
                    >
                      {WEIGHT_OPTIONS.map((weight) => (
                        <option key={weight} value={weight}>
                          {weight}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="ui-field">
                    <span className="ui-field-label">行間</span>
                    <input
                      className="ui-input"
                      type="number"
                      step={0.05}
                      min={1.1}
                      max={2.2}
                      value={normalized.typography?.lineHeight ?? 1.6}
                      onChange={(event) =>
                        updateStyle({
                          typography: {
                            ...(normalized.typography ?? {}),
                            lineHeight: Number(event.target.value),
                          },
                        })
                      }
                      disabled={disabled}
                    />
                  </label>
                  <label className="ui-field">
                    <span className="ui-field-label">字間</span>
                    <input
                      className="ui-input"
                      type="number"
                      step={0.1}
                      min={-1}
                      max={6}
                      value={normalized.typography?.letterSpacing ?? 0}
                      onChange={(event) =>
                        updateStyle({
                          typography: {
                            ...(normalized.typography ?? {}),
                            letterSpacing: Number(event.target.value),
                          },
                        })
                      }
                      disabled={disabled}
                    />
                  </label>
                  <label className="ui-field">
                    <span className="ui-field-label">揃え</span>
                    <div className="flex gap-2">
                      {ALIGN_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`ui-chip h-7 px-3 ${
                            normalized.typography?.textAlign === option.value
                              ? "is-active"
                              : ""
                          }`}
                          onClick={() =>
                            updateStyle({
                              typography: {
                                ...(normalized.typography ?? {}),
                                textAlign: option.value,
                              },
                            })
                          }
                          disabled={disabled}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {capabilities.colors ? (
            <div className="ui-card">
              <div className="text-sm font-semibold text-[var(--ui-text)]">
                カラー
              </div>
              <div className="mt-3 grid gap-3">
                {(
                  [
                    { key: "text", label: "文字色" },
                    { key: "background", label: "背景色" },
                    { key: "border", label: "枠線色" },
                  ] as const
                ).map((entry) => (
                  <label key={entry.key} className="ui-field">
                    <span className="ui-field-label">{entry.label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={toColorValue(normalized.colors?.[entry.key] ?? "")}
                        onChange={(event) =>
                          updateStyle({
                            colors: {
                              ...(normalized.colors ?? {}),
                              [entry.key]: event.target.value,
                            },
                          })
                        }
                        disabled={disabled}
                      />
                      <input
                        className="ui-input flex-1"
                        type="text"
                        value={normalized.colors?.[entry.key] ?? ""}
                        onChange={(event) =>
                          updateStyle({
                            colors: {
                              ...(normalized.colors ?? {}),
                              [entry.key]: event.target.value,
                            },
                          })
                        }
                        placeholder="#000000"
                        disabled={disabled}
                      />
                    </div>
                  </label>
                ))}
                {capabilities.allowBackgroundGradient ? (
                  <div className="rounded-md border border-[var(--ui-border)] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--ui-text)]">
                        背景グラデ
                      </span>
                      <button
                        type="button"
                        className={`ui-chip h-7 px-3 ${
                          normalized.colors?.gradient ? "is-active" : ""
                        }`}
                        onClick={() => {
                          updateStyle({
                            colors: {
                              ...(normalized.colors ?? {}),
                              gradient: normalized.colors?.gradient
                                ? null
                                : { from: "#ffffff", to: "#f1f5f9", angle: 135 },
                            },
                          });
                        }}
                        disabled={disabled}
                      >
                        {normalized.colors?.gradient ? "ON" : "OFF"}
                      </button>
                    </div>
                    {normalized.colors?.gradient ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <label className="ui-field">
                          <span className="ui-field-label">開始色</span>
                          <input
                            type="color"
                            value={toColorValue(normalized.colors.gradient.from)}
                            onChange={(event) =>
                              updateStyle({
                                colors: {
                                  ...(normalized.colors ?? {}),
                                  gradient: {
                                    from: event.target.value,
                                    to:
                                      normalized.colors?.gradient?.to ?? "#f1f5f9",
                                    angle: normalized.colors?.gradient?.angle,
                                  },
                                },
                              })
                            }
                            disabled={disabled}
                          />
                        </label>
                        <label className="ui-field">
                          <span className="ui-field-label">終点色</span>
                          <input
                            type="color"
                            value={toColorValue(normalized.colors.gradient.to)}
                            onChange={(event) =>
                              updateStyle({
                                colors: {
                                  ...(normalized.colors ?? {}),
                                  gradient: {
                                    from:
                                      normalized.colors?.gradient?.from ?? "#ffffff",
                                    to: event.target.value,
                                    angle: normalized.colors?.gradient?.angle,
                                  },
                                },
                              })
                            }
                            disabled={disabled}
                          />
                        </label>
                        <label className="ui-field">
                          <span className="ui-field-label">角度</span>
                          <input
                            className="ui-input"
                            type="number"
                            min={0}
                            max={360}
                            value={normalized.colors.gradient.angle ?? 135}
                            onChange={(event) =>
                              updateStyle({
                                colors: {
                                  ...(normalized.colors ?? {}),
                                  gradient: {
                                    from:
                                      normalized.colors?.gradient?.from ?? "#ffffff",
                                    to:
                                      normalized.colors?.gradient?.to ?? "#f1f5f9",
                                    angle: Number(event.target.value),
                                  },
                                },
                              })
                            }
                            disabled={disabled}
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {capabilities.layout ? (
            <div className="ui-card">
              <div className="text-sm font-semibold text-[var(--ui-text)]">
                レイアウト
              </div>
              <div className="mt-3 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="ui-field">
                    <span className="ui-field-label">上下余白</span>
                    <div className="flex gap-2">
                      <input
                        className="ui-input"
                        type="number"
                        value={normalized.layout?.padding?.t ?? 0}
                        onChange={(event) =>
                          updateStyle({
                            layout: {
                              ...(normalized.layout ?? {}),
                              padding: {
                                t: Number(event.target.value),
                                r: normalized.layout?.padding?.r ?? 0,
                                b: normalized.layout?.padding?.b ?? 0,
                                l: normalized.layout?.padding?.l ?? 0,
                              },
                            },
                          })
                        }
                        disabled={disabled}
                      />
                      <input
                        className="ui-input"
                        type="number"
                        value={normalized.layout?.padding?.b ?? 0}
                        onChange={(event) =>
                          updateStyle({
                            layout: {
                              ...(normalized.layout ?? {}),
                              padding: {
                                t: normalized.layout?.padding?.t ?? 0,
                                r: normalized.layout?.padding?.r ?? 0,
                                b: Number(event.target.value),
                                l: normalized.layout?.padding?.l ?? 0,
                              },
                            },
                          })
                        }
                        disabled={disabled}
                      />
                    </div>
                  </label>
                  <label className="ui-field">
                    <span className="ui-field-label">左右余白</span>
                    <div className="flex gap-2">
                      <input
                        className="ui-input"
                        type="number"
                        value={normalized.layout?.padding?.l ?? 0}
                        onChange={(event) =>
                          updateStyle({
                            layout: {
                              ...(normalized.layout ?? {}),
                              padding: {
                                t: normalized.layout?.padding?.t ?? 0,
                                r: normalized.layout?.padding?.r ?? 0,
                                b: normalized.layout?.padding?.b ?? 0,
                                l: Number(event.target.value),
                              },
                            },
                          })
                        }
                        disabled={disabled}
                      />
                      <input
                        className="ui-input"
                        type="number"
                        value={normalized.layout?.padding?.r ?? 0}
                        onChange={(event) =>
                          updateStyle({
                            layout: {
                              ...(normalized.layout ?? {}),
                              padding: {
                                t: normalized.layout?.padding?.t ?? 0,
                                r: Number(event.target.value),
                                b: normalized.layout?.padding?.b ?? 0,
                                l: normalized.layout?.padding?.l ?? 0,
                              },
                            },
                          })
                        }
                        disabled={disabled}
                      />
                    </div>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="ui-field">
                    <span className="ui-field-label">上下マージン</span>
                    <div className="flex gap-2">
                      <input
                        className="ui-input"
                        type="number"
                        value={normalized.layout?.margin?.t ?? 0}
                        onChange={(event) =>
                          updateStyle({
                            layout: {
                              ...(normalized.layout ?? {}),
                              margin: {
                                t: Number(event.target.value),
                                b: normalized.layout?.margin?.b ?? 0,
                              },
                            },
                          })
                        }
                        disabled={disabled}
                      />
                      <input
                        className="ui-input"
                        type="number"
                        value={normalized.layout?.margin?.b ?? 0}
                        onChange={(event) =>
                          updateStyle({
                            layout: {
                              ...(normalized.layout ?? {}),
                              margin: {
                                t: normalized.layout?.margin?.t ?? 0,
                                b: Number(event.target.value),
                              },
                            },
                          })
                        }
                        disabled={disabled}
                      />
                    </div>
                  </label>
                  <label className="ui-field">
                    <span className="ui-field-label">横幅</span>
                    <select
                      className="ui-select"
                      value={normalized.layout?.widthMode ?? "contained"}
                      onChange={(event) =>
                        updateStyle({
                          layout: {
                            ...(normalized.layout ?? {}),
                            widthMode: event.target.value as "full" | "contained",
                          },
                        })
                      }
                      disabled={disabled}
                    >
                      <option value="full">全幅</option>
                      <option value="contained">コンテナ</option>
                    </select>
                  </label>
                </div>
                <label className="ui-field">
                  <span className="ui-field-label">角丸</span>
                  <input
                    className="ui-input"
                    type="number"
                    min={0}
                    max={32}
                    value={normalized.layout?.radius ?? 0}
                    onChange={(event) =>
                      updateStyle({
                        layout: {
                          ...(normalized.layout ?? {}),
                          radius: Number(event.target.value),
                        },
                      })
                    }
                    disabled={disabled}
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "decor" && capabilities.decorations ? (
        <div className="ui-card">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-[var(--ui-text)]">
              装飾画像
            </div>
            <button
              type="button"
              className="ui-button h-7 px-2 text-[11px]"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || decorations.length >= 2}
            >
              追加
            </button>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                handleAddDecoration(file);
                event.target.value = "";
              }}
            />
          </div>
          {decorations.length === 0 ? (
            <div className="mt-3 text-xs text-[var(--ui-muted)]">
              画像は最大2枚まで追加できます。
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {decorations.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-[var(--ui-border)] p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[var(--ui-muted)]">
                      {assets[item.assetId]?.filename ?? "未登録"}
                    </div>
                    <button
                      type="button"
                      className="ui-button h-7 px-2 text-[11px]"
                      onClick={() => handleDecorationRemove(item.id)}
                      disabled={disabled}
                    >
                      削除
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="ui-field">
                      <span className="ui-field-label">位置</span>
                      <select
                        className="ui-select"
                        value={item.position}
                        onChange={(event) =>
                          handleDecorationChange(item.id, {
                            position: event.target.value as DecorationItem["position"],
                          })
                        }
                        disabled={disabled}
                      >
                        <option value="lt">左上</option>
                        <option value="rt">右上</option>
                        <option value="lb">左下</option>
                        <option value="rb">右下</option>
                        <option value="bg">背景</option>
                      </select>
                    </label>
                    <label className="ui-field">
                      <span className="ui-field-label">サイズ(px)</span>
                      <input
                        className="ui-input"
                        type="number"
                        min={16}
                        max={600}
                        value={item.size}
                        onChange={(event) =>
                          handleDecorationChange(item.id, {
                            size: Number(event.target.value),
                          })
                        }
                        disabled={disabled}
                      />
                    </label>
                    <label className="ui-field">
                      <span className="ui-field-label">回転</span>
                      <input
                        className="ui-input"
                        type="number"
                        min={-180}
                        max={180}
                        value={item.rotate}
                        onChange={(event) =>
                          handleDecorationChange(item.id, {
                            rotate: Number(event.target.value),
                          })
                        }
                        disabled={disabled}
                      />
                    </label>
                    <label className="ui-field">
                      <span className="ui-field-label">透明度</span>
                      <input
                        className="ui-input"
                        type="number"
                        step={0.05}
                        min={0}
                        max={1}
                        value={item.opacity}
                        onChange={(event) =>
                          handleDecorationChange(item.id, {
                            opacity: Number(event.target.value),
                          })
                        }
                        disabled={disabled}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "anim" && capabilities.animation ? (
        <div className="ui-card">
          <div className="text-sm font-semibold text-[var(--ui-text)]">
            アニメーション
          </div>
          <div className="mt-3 grid gap-3">
            <label className="ui-field">
              <span className="ui-field-label">種類</span>
              <select
                className="ui-select"
                value={normalized.animation?.type ?? "none"}
                onChange={(event) =>
                  updateStyle({
                    animation: {
                      type: event.target.value as (typeof ANIM_TYPES)[number]["value"],
                      trigger: normalized.animation?.trigger ?? "onView",
                      speed: normalized.animation?.speed ?? 500,
                      easing: normalized.animation?.easing ?? "ease-out",
                    },
                  })
                }
                disabled={disabled}
              >
                {ANIM_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-field">
              <span className="ui-field-label">開始タイミング</span>
              <select
                className="ui-select"
                value={normalized.animation?.trigger ?? "onView"}
                onChange={(event) =>
                  updateStyle({
                    animation: {
                      type: normalized.animation?.type ?? "none",
                      trigger: event.target.value as (typeof ANIM_TRIGGERS)[number]["value"],
                      speed: normalized.animation?.speed ?? 500,
                      easing: normalized.animation?.easing ?? "ease-out",
                    },
                  })
                }
                disabled={disabled}
              >
                {ANIM_TRIGGERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-field">
              <span className="ui-field-label">速度(ms)</span>
              <input
                className="ui-input"
                type="number"
                min={150}
                max={1200}
                value={normalized.animation?.speed ?? 500}
                onChange={(event) =>
                  updateStyle({
                    animation: {
                      type: normalized.animation?.type ?? "none",
                      trigger: normalized.animation?.trigger ?? "onView",
                      speed: Number(event.target.value),
                      easing: normalized.animation?.easing ?? "ease-out",
                    },
                  })
                }
                disabled={disabled}
              />
            </label>
            <label className="ui-field">
              <span className="ui-field-label">イージング</span>
              <select
                className="ui-select"
                value={normalized.animation?.easing ?? "ease-out"}
                onChange={(event) =>
                  updateStyle({
                    animation: {
                      type: normalized.animation?.type ?? "none",
                      trigger: normalized.animation?.trigger ?? "onView",
                      speed: normalized.animation?.speed ?? 500,
                      easing: event.target.value as (typeof EASING_OPTIONS)[number]["value"],
                    },
                  })
                }
                disabled={disabled}
              >
                {EASING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
