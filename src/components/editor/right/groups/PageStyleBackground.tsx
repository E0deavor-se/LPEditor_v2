"use client";

import { Image } from "lucide-react";
import Accordion from "@/src/components/editor/right/primitives/Accordion";
import ColorField from "@/src/components/editor/right/primitives/ColorField";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import SegmentedField from "@/src/components/editor/right/primitives/SegmentedField";
import SelectField from "@/src/components/editor/right/primitives/SelectField";
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
      };

const ensureVideo = (spec?: BackgroundSpec): VideoSpec =>
  spec && spec.type === "video"
    ? spec
    : {
        type: "video",
        assetId: "",
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
  defaultOpen,
}: PageStyleBackgroundProps) {
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
            <option value="gradient">グラデ</option>
            <option value="pattern">柄</option>
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
            <FieldRow label="柄">
              <SelectField
                value={ensurePattern(spec).patternId}
                ariaLabel="柄タイプ"
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
                ariaLabel="柄前景色"
                onChange={(next) => {
                  const pattern = ensurePattern(spec);
                  onChange({ ...pattern, foreground: next });
                }}
              />
            </FieldRow>
            <FieldRow label="背景色">
              <ColorField
                value={ensurePattern(spec).background}
                ariaLabel="柄背景色"
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
                ariaLabel="柄サイズ"
                onChange={(next) => {
                  const pattern = ensurePattern(spec);
                  onChange({ ...pattern, size: next });
                }}
              />
            </FieldRow>
            <FieldRow label="濃さ">
              <NumberField
                value={ensurePattern(spec).opacity}
                min={0}
                max={1}
                step={0.05}
                ariaLabel="柄濃さ"
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
                ariaLabel="グラデ開始色"
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
                ariaLabel="グラデ終了色"
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
                ariaLabel="グラデ角度"
                onChange={(next) => {
                  const gradient = ensureGradient(spec);
                  onChange({ ...gradient, angle: next });
                }}
              />
            </FieldRow>
          </>
        ) : null}
        {backgroundType === "video" ? (
          <FieldRow label="オーバーレイ">
            <ColorField
              value={ensureVideo(spec).overlayColor ?? "#000000"}
              ariaLabel="動画オーバーレイ"
              onChange={(next) => {
                const video = ensureVideo(spec);
                onChange({ ...video, overlayColor: next });
              }}
            />
          </FieldRow>
        ) : null}
        {backgroundType === "preset" ? (
          <FieldRow label="プリセットID">
            <SelectField
              value={ensurePreset(spec).presetId}
              ariaLabel="プリセットID"
              onChange={(next) => {
                const preset = ensurePreset(spec);
                onChange({ ...preset, presetId: next });
              }}
            >
              <option value="">未選択</option>
              {BACKGROUND_PRESET_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </FieldRow>
        ) : null}
        {backgroundType === "image" ? (
          <div className="text-[11px] text-[var(--ui-muted)]">
            URLはAdvancedで設定します。
          </div>
        ) : null}
        {backgroundType === "video" ? (
          <div className="text-[11px] text-[var(--ui-muted)]">
            URLはAdvancedで設定します。
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
