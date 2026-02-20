"use client";

import { Image, UploadCloud } from "lucide-react";
import { useRef } from "react";
import Accordion from "@/src/components/editor/right/primitives/Accordion";
import ColorField from "@/src/components/editor/right/primitives/ColorField";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import SegmentedField from "@/src/components/editor/right/primitives/SegmentedField";
import SelectField from "@/src/components/editor/right/primitives/SelectField";
import ToggleField from "@/src/components/editor/right/primitives/ToggleField";
import { buildBackgroundStyle } from "@/src/lib/backgroundSpec";
import {
  BACKGROUND_PRESET_OPTIONS,
  resolveBackgroundPreset,
} from "@/src/lib/backgroundPresets";
import {
  BACKGROUND_PATTERN_OPTIONS,
  normalizePatternSpec,
} from "@/src/lib/backgroundPatterns";
import type { BackgroundSpec } from "@/src/types/project";

export type BackgroundTarget = "page" | "mv";

type PageStyleBackgroundProps = {
  target: BackgroundTarget;
  onTargetChange: (target: BackgroundTarget) => void;
  spec?: BackgroundSpec;
  onChange: (spec: BackgroundSpec) => void;
  resolveAssetUrl?: (assetId: string) => string | undefined;
  onAddAsset?: (payload: { filename: string; data: string }) => string;
  defaultOpen?: boolean;
};

const DEFAULT_SOLID = "#ffffff";
type SolidSpec = Extract<BackgroundSpec, { type: "solid" }>;
type GradientSpec = Extract<BackgroundSpec, { type: "gradient" }>;
type PatternSpec = Extract<BackgroundSpec, { type: "pattern" }>;
type ImageSpec = Extract<BackgroundSpec, { type: "image" }>;
type VideoSpec = Extract<BackgroundSpec, { type: "video" }>;
type PresetSpec = Extract<BackgroundSpec, { type: "preset" }>;

const ensureSolid = (spec?: BackgroundSpec): SolidSpec =>
  spec && spec.type === "solid"
    ? spec
    : { type: "solid", color: DEFAULT_SOLID };

const ensureGradient = (spec?: BackgroundSpec): GradientSpec => {
  if (spec && spec.type === "gradient") {
    return {
      type: "gradient",
      angle: Number.isFinite(spec.angle) ? spec.angle : 135,
      stops:
        Array.isArray(spec.stops) && spec.stops.length >= 2
          ? spec.stops
          : [
              { color: DEFAULT_SOLID, pos: 0 },
              { color: DEFAULT_SOLID, pos: 100 },
            ],
    };
  }
  return {
    type: "gradient",
    angle: 135,
    stops: [
      { color: DEFAULT_SOLID, pos: 0 },
      { color: DEFAULT_SOLID, pos: 100 },
    ],
  };
};

const ensurePattern = (spec?: BackgroundSpec): PatternSpec => {
  if (spec && spec.type === "pattern") {
    return normalizePatternSpec(spec, DEFAULT_SOLID);
  }
  const fallbackId = BACKGROUND_PATTERN_OPTIONS[0]?.id ?? "dots";
  return normalizePatternSpec({ patternId: fallbackId }, DEFAULT_SOLID);
};

const ensureImage = (spec?: BackgroundSpec): ImageSpec =>
  spec && spec.type === "image"
    ? spec
    : {
        type: "image",
        assetId: "",
        repeat: "no-repeat",
        size: "cover",
        position: "center",
        attachment: "scroll",
        opacity: 1,
        blur: 0,
        brightness: 1,
        saturation: 1,
        overlayColor: "#000000",
        overlayOpacity: 0,
        overlayBlendMode: "normal",
      };

const ensureVideo = (spec?: BackgroundSpec): VideoSpec =>
  spec && spec.type === "video"
    ? spec
    : {
        type: "video",
        assetId: "",
        opacity: 1,
        blur: 0,
        brightness: 1,
        saturation: 1,
        autoPlay: true,
        loop: true,
        muted: true,
        playsInline: true,
      };

const ensurePreset = (spec?: BackgroundSpec): PresetSpec =>
  spec && spec.type === "preset"
    ? spec
    : {
        type: "preset",
        presetId: "",
      };

const getGradientStopColor = (spec: GradientSpec, index: number) => {
  const stop = spec.stops[index];
  return typeof stop?.color === "string" && stop.color ? stop.color : DEFAULT_SOLID;
};

export default function PageStyleBackground({
  target,
  onTargetChange,
  spec,
  onChange,
  resolveAssetUrl,
  onAddAsset,
  defaultOpen,
}: PageStyleBackgroundProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const currentSpec = spec ?? ensureSolid();
  const backgroundType = currentSpec.type;
  const previewStyle = buildBackgroundStyle(currentSpec, {
    resolveAssetUrl,
    resolvePreset: resolveBackgroundPreset,
    fallbackColor: DEFAULT_SOLID,
  }).style;

  const handleTypeChange = (nextType: string) => {
    if (nextType === backgroundType) {
      return;
    }
    if (nextType === "solid") {
      onChange(ensureSolid(spec));
      return;
    }
    if (nextType === "gradient") {
      onChange(ensureGradient(spec));
      return;
    }
    if (nextType === "image") {
      onChange(ensureImage(spec));
      return;
    }
    if (nextType === "pattern") {
      onChange(ensurePattern(spec));
      return;
    }
    if (nextType === "video") {
      onChange(ensureVideo(spec));
      return;
    }
    if (nextType === "preset") {
      onChange(ensurePreset(spec));
    }
  };

  return (
    <Accordion
      title="背景"
      icon={<Image size={14} />}
      defaultOpen={defaultOpen}
    >
      <div className="flex flex-col gap-3">
        <FieldRow label="適用先">
          <SegmentedField
            value={target}
            ariaLabel="適用先"
            options={[
              { value: "page", label: "LP全体" },
              { value: "mv", label: "MV" },
            ]}
            onChange={(next) => onTargetChange(next as BackgroundTarget)}
          />
        </FieldRow>
        <FieldRow label="タイプ">
          <SelectField
            value={backgroundType}
            ariaLabel="背景タイプ"
            onChange={handleTypeChange}
          >
            <option value="solid">単色</option>
            <option value="gradient">グラデーション</option>
            <option value="pattern">パターン</option>
            <option value="image">画像</option>
            <option value="video">動画</option>
            <option value="preset">プリセット</option>
          </SelectField>
        </FieldRow>
        {backgroundType === "solid" ? (
          <FieldRow label="カラー">
            <ColorField
              value={ensureSolid(spec).color}
              ariaLabel="背景カラー"
              onChange={(next) => onChange({ type: "solid", color: next })}
            />
          </FieldRow>
        ) : null}
        {backgroundType === "pattern" ? (
          <>
            <FieldRow label="パターン">
              <SelectField
                value={ensurePattern(spec).patternId}
                ariaLabel="パターン"
                onChange={(next) => {
                  const pattern = ensurePattern(spec);
                  onChange({
                    ...pattern,
                    patternId: next as PatternSpec["patternId"],
                  });
                }}
              >
                {BACKGROUND_PATTERN_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </FieldRow>
            <FieldRow label="前景色">
              <ColorField
                value={ensurePattern(spec).foreground}
                ariaLabel="前景色"
                onChange={(next) => {
                  const pattern = ensurePattern(spec);
                  onChange({ ...pattern, foreground: next });
                }}
              />
            </FieldRow>
            <FieldRow label="背景色">
              <ColorField
                value={ensurePattern(spec).background}
                ariaLabel="背景色"
                onChange={(next) => {
                  const pattern = ensurePattern(spec);
                  onChange({ ...pattern, background: next });
                }}
              />
            </FieldRow>
            <FieldRow label="サイズ">
              <NumberField
                value={ensurePattern(spec).size}
                min={4}
                max={120}
                step={1}
                ariaLabel="サイズ"
                onChange={(next) => {
                  const pattern = ensurePattern(spec);
                  onChange({ ...pattern, size: next });
                }}
              />
            </FieldRow>
            <FieldRow label="不透明度">
              <NumberField
                value={ensurePattern(spec).opacity}
                min={0}
                max={1}
                step={0.05}
                ariaLabel="不透明度"
                onChange={(next) => {
                  const pattern = ensurePattern(spec);
                  onChange({ ...pattern, opacity: next });
                }}
              />
            </FieldRow>
          </>
        ) : null}
        {backgroundType === "gradient" ? (
          <>
            <FieldRow label="開始色">
              <ColorField
                value={getGradientStopColor(ensureGradient(spec), 0)}
                ariaLabel="開始色"
                onChange={(next) => {
                  const gradient = ensureGradient(spec);
                  const nextStops = [
                    { color: next, pos: 0 },
                    {
                      color: getGradientStopColor(gradient, 1),
                      pos: 100,
                    },
                  ];
                  onChange({ ...gradient, stops: nextStops });
                }}
              />
            </FieldRow>
            <FieldRow label="終了色">
              <ColorField
                value={getGradientStopColor(ensureGradient(spec), 1)}
                ariaLabel="終了色"
                onChange={(next) => {
                  const gradient = ensureGradient(spec);
                  const nextStops = [
                    {
                      color: getGradientStopColor(gradient, 0),
                      pos: 0,
                    },
                    { color: next, pos: 100 },
                  ];
                  onChange({ ...gradient, stops: nextStops });
                }}
              />
            </FieldRow>
            <FieldRow label="角度">
              <NumberField
                value={ensureGradient(spec).angle}
                min={0}
                max={360}
                step={1}
                ariaLabel="角度"
                onChange={(next) => {
                  const gradient = ensureGradient(spec);
                  onChange({ ...gradient, angle: next });
                }}
              />
            </FieldRow>
          </>
        ) : null}
        {backgroundType === "video" ? (
          <div className="flex flex-col gap-2">
            <Accordion title="動画" defaultOpen>
              <div className="flex flex-col gap-2">
                <FieldRow label="ファイル">
                  <div className="flex w-full items-center gap-2">
                    <button
                      type="button"
                      className="ui-button h-7 px-2 text-[11px]"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={!onAddAsset}
                    >
                      <UploadCloud size={12} />
                      <span>アップロード</span>
                    </button>
                    {ensureVideo(spec).assetId ? (
                      <button
                        type="button"
                        className="ui-button h-7 px-2 text-[11px]"
                        onClick={() => {
                          const video = ensureVideo(spec);
                          onChange({ ...video, assetId: "" });
                        }}
                      >
                        削除
                      </button>
                    ) : null}
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file || !onAddAsset) {
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          const data = typeof reader.result === "string" ? reader.result : "";
                          if (!data) {
                            return;
                          }
                          const assetId = onAddAsset({
                            filename: file.name,
                            data,
                          });
                          const video = ensureVideo(spec);
                          onChange({ ...video, assetId });
                        };
                        reader.readAsDataURL(file);
                        event.target.value = "";
                      }}
                    />
                  </div>
                </FieldRow>
              </div>
            </Accordion>
            <Accordion title="表示調整">
              <div className="flex flex-col gap-2">
                <FieldRow label="不透明度">
                  <NumberField
                    value={ensureVideo(spec).opacity ?? 1}
                    min={0}
                    max={1}
                    step={0.05}
                    ariaLabel="不透明度"
                    onChange={(next) => {
                      const video = ensureVideo(spec);
                      onChange({ ...video, opacity: next });
                    }}
                  />
                </FieldRow>
                <FieldRow label="ぼかし">
                  <NumberField
                    value={ensureVideo(spec).blur ?? 0}
                    min={0}
                    max={40}
                    step={1}
                    ariaLabel="ぼかし"
                    onChange={(next) => {
                      const video = ensureVideo(spec);
                      onChange({ ...video, blur: next });
                    }}
                  />
                </FieldRow>
                <FieldRow label="明るさ">
                  <NumberField
                    value={ensureVideo(spec).brightness ?? 1}
                    min={0}
                    max={2}
                    step={0.05}
                    ariaLabel="明るさ"
                    onChange={(next) => {
                      const video = ensureVideo(spec);
                      onChange({ ...video, brightness: next });
                    }}
                  />
                </FieldRow>
                <FieldRow label="彩度">
                  <NumberField
                    value={ensureVideo(spec).saturation ?? 1}
                    min={0}
                    max={2}
                    step={0.05}
                    ariaLabel="彩度"
                    onChange={(next) => {
                      const video = ensureVideo(spec);
                      onChange({ ...video, saturation: next });
                    }}
                  />
                </FieldRow>
              </div>
            </Accordion>
            <Accordion title="オーバーレイ">
              <div className="flex flex-col gap-2">
                <FieldRow label="色">
                  <ColorField
                    value={ensureVideo(spec).overlayColor ?? "#000000"}
                    ariaLabel="オーバーレイ色"
                    onChange={(next) => {
                      const video = ensureVideo(spec);
                      onChange({ ...video, overlayColor: next });
                    }}
                  />
                </FieldRow>
              </div>
            </Accordion>
            <Accordion title="再生">
              <div className="flex flex-col gap-2">
                <FieldRow label="自動再生">
                  <ToggleField
                    value={ensureVideo(spec).autoPlay ?? true}
                    ariaLabel="自動再生"
                    onChange={(next) => {
                      const video = ensureVideo(spec);
                      onChange({ ...video, autoPlay: next });
                    }}
                  />
                </FieldRow>
                <FieldRow label="ループ">
                  <ToggleField
                    value={ensureVideo(spec).loop ?? true}
                    ariaLabel="ループ"
                    onChange={(next) => {
                      const video = ensureVideo(spec);
                      onChange({ ...video, loop: next });
                    }}
                  />
                </FieldRow>
                <FieldRow label="ミュート">
                  <ToggleField
                    value={ensureVideo(spec).muted ?? true}
                    ariaLabel="ミュート"
                    onChange={(next) => {
                      const video = ensureVideo(spec);
                      onChange({ ...video, muted: next });
                    }}
                  />
                </FieldRow>
                <FieldRow label="インライン">
                  <ToggleField
                    value={ensureVideo(spec).playsInline ?? true}
                    ariaLabel="インライン再生"
                    onChange={(next) => {
                      const video = ensureVideo(spec);
                      onChange({ ...video, playsInline: next });
                    }}
                  />
                </FieldRow>
              </div>
            </Accordion>
          </div>
        ) : null}
        {backgroundType === "preset" ? (
          <FieldRow label="プリセット">
            <SelectField
              value={ensurePreset(spec).presetId}
              ariaLabel="プリセット"
              onChange={(next) => {
                const preset = ensurePreset(spec);
                onChange({ ...preset, presetId: next });
              }}
            >
              <option value="">選択してください</option>
              {BACKGROUND_PRESET_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </FieldRow>
        ) : null}
        {backgroundType === "image" ? (
          <div className="flex flex-col gap-2">
            <Accordion title="画像" defaultOpen>
              <div className="flex flex-col gap-2">
                <FieldRow label="ファイル">
                  <div className="flex w-full items-center gap-2">
                    <button
                      type="button"
                      className="ui-button h-7 px-2 text-[11px]"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={!onAddAsset}
                    >
                      <UploadCloud size={12} />
                      <span>アップロード</span>
                    </button>
                    {ensureImage(spec).assetId ? (
                      <button
                        type="button"
                        className="ui-button h-7 px-2 text-[11px]"
                        onClick={() => {
                          const image = ensureImage(spec);
                          onChange({ ...image, assetId: "" });
                        }}
                      >
                        削除
                      </button>
                    ) : null}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file || !onAddAsset) {
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          const data = typeof reader.result === "string" ? reader.result : "";
                          if (!data) {
                            return;
                          }
                          const assetId = onAddAsset({
                            filename: file.name,
                            data,
                          });
                          const image = ensureImage(spec);
                          onChange({ ...image, assetId });
                        };
                        reader.readAsDataURL(file);
                        event.target.value = "";
                      }}
                    />
                  </div>
                </FieldRow>
              </div>
            </Accordion>
            <Accordion title="表示" defaultOpen>
              <div className="flex flex-col gap-2">
                <FieldRow label="サイズ">
                  <SegmentedField
                    value={ensureImage(spec).size}
                    ariaLabel="画像サイズ"
                    options={[
                      { value: "cover", label: "カバー" },
                      { value: "contain", label: "フィット" },
                      { value: "100% 100%", label: "引き伸ばし" },
                      { value: "auto", label: "自動" },
                    ]}
                    onChange={(next) => {
                      const image = ensureImage(spec);
                      onChange({ ...image, size: String(next) });
                    }}
                  />
                </FieldRow>
                <FieldRow label="位置">
                  <SelectField
                    value={ensureImage(spec).position}
                    ariaLabel="画像位置"
                    onChange={(next) => {
                      const image = ensureImage(spec);
                      onChange({ ...image, position: String(next) });
                    }}
                  >
                    <option value="center">中央</option>
                    <option value="top">上</option>
                    <option value="bottom">下</option>
                    <option value="left">左</option>
                    <option value="right">右</option>
                    <option value="center top">中央上</option>
                    <option value="center bottom">中央下</option>
                  </SelectField>
                </FieldRow>
                <FieldRow label="繰り返し">
                  <SelectField
                    value={ensureImage(spec).repeat}
                    ariaLabel="繰り返し"
                    onChange={(next) => {
                      const image = ensureImage(spec);
                      onChange({ ...image, repeat: String(next) });
                    }}
                  >
                    <option value="no-repeat">繰り返しなし</option>
                    <option value="repeat">繰り返し</option>
                    <option value="repeat-x">横方向</option>
                    <option value="repeat-y">縦方向</option>
                  </SelectField>
                </FieldRow>
                <FieldRow label="固定">
                  <SegmentedField
                    value={ensureImage(spec).attachment}
                    ariaLabel="固定"
                    options={[
                      { value: "scroll", label: "スクロール" },
                      { value: "fixed", label: "固定" },
                    ]}
                    onChange={(next) => {
                      const image = ensureImage(spec);
                      onChange({ ...image, attachment: String(next) });
                    }}
                  />
                </FieldRow>
              </div>
            </Accordion>
            <Accordion title="表示調整">
              <div className="flex flex-col gap-2">
                <FieldRow label="不透明度">
                  <NumberField
                    value={ensureImage(spec).opacity ?? 1}
                    min={0}
                    max={1}
                    step={0.05}
                    ariaLabel="不透明度"
                    onChange={(next) => {
                      const image = ensureImage(spec);
                      onChange({ ...image, opacity: next });
                    }}
                  />
                </FieldRow>
                <FieldRow label="ぼかし">
                  <NumberField
                    value={ensureImage(spec).blur ?? 0}
                    min={0}
                    max={40}
                    step={1}
                    ariaLabel="ぼかし"
                    onChange={(next) => {
                      const image = ensureImage(spec);
                      onChange({ ...image, blur: next });
                    }}
                  />
                </FieldRow>
                <FieldRow label="明るさ">
                  <NumberField
                    value={ensureImage(spec).brightness ?? 1}
                    min={0}
                    max={2}
                    step={0.05}
                    ariaLabel="明るさ"
                    onChange={(next) => {
                      const image = ensureImage(spec);
                      onChange({ ...image, brightness: next });
                    }}
                  />
                </FieldRow>
                <FieldRow label="彩度">
                  <NumberField
                    value={ensureImage(spec).saturation ?? 1}
                    min={0}
                    max={2}
                    step={0.05}
                    ariaLabel="彩度"
                    onChange={(next) => {
                      const image = ensureImage(spec);
                      onChange({ ...image, saturation: next });
                    }}
                  />
                </FieldRow>
              </div>
            </Accordion>
            <Accordion title="オーバーレイ">
              <div className="flex flex-col gap-2">
                <FieldRow label="色">
                  <ColorField
                    value={ensureImage(spec).overlayColor ?? "#000000"}
                    ariaLabel="オーバーレイ色"
                    onChange={(next) => {
                      const image = ensureImage(spec);
                      onChange({ ...image, overlayColor: next });
                    }}
                  />
                </FieldRow>
                <FieldRow label="不透明度">
                  <NumberField
                    value={ensureImage(spec).overlayOpacity ?? 0}
                    min={0}
                    max={1}
                    step={0.05}
                    ariaLabel="オーバーレイ不透明度"
                    onChange={(next) => {
                      const image = ensureImage(spec);
                      onChange({ ...image, overlayOpacity: next });
                    }}
                  />
                </FieldRow>
                <FieldRow label="合成">
                  <SelectField
                    value={ensureImage(spec).overlayBlendMode ?? "normal"}
                    ariaLabel="合成モード"
                    onChange={(next) => {
                      const image = ensureImage(spec);
                      onChange({
                        ...image,
                        overlayBlendMode: next as ImageSpec["overlayBlendMode"],
                      });
                    }}
                  >
                    <option value="normal">通常</option>
                    <option value="multiply">乗算</option>
                    <option value="screen">スクリーン</option>
                    <option value="overlay">オーバーレイ</option>
                  </SelectField>
                </FieldRow>
              </div>
            </Accordion>
          </div>
        ) : null}
        {backgroundType === "video" ? (
          <div className="text-xs text-[var(--ui-muted)]">
            URL指定はAdvancedで設定できます。
          </div>
        ) : null}
        <div className="mt-1 flex justify-end">
          <div className="flex flex-col items-end gap-1">
            <div
              className="overflow-hidden rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)]"
              style={{ width: 120, height: 80 }}
            >
              <div className="h-full w-full" style={previewStyle} />
            </div>
            {backgroundType === "video" ? (
              <div className="text-[10px] text-[var(--ui-muted)]">Video</div>
            ) : null}
          </div>
        </div>
      </div>
    </Accordion>
  );
}
