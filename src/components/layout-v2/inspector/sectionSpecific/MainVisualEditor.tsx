"use client";

import { useMemo, useRef } from "react";
import { useState } from "react";
import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorSelect from "@/src/components/inspector/InspectorSelect";
import SectionAssetPicker from "@/src/features/ai-assets/components/SectionAssetPicker";
import CreativeMainVisualModal from "@/src/features/creative/components/CreativeMainVisualModal";
import type { SectionBase } from "@/src/types/project";

type MainVisualEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  addAsset: (asset: { filename: string; data: string }) => string;
};

type HeroSlide = {
  assetId?: string;
  src?: string;
  alt?: string;
  title?: string;
  ctaText?: string;
  ctaUrl?: string;
};

type HeroAnimation = {
  preset: "fade" | "slideUp" | "zoom";
  durationMs?: number;
  delayMs?: number;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const getImageSize = (dataUrl: string) =>
  new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = dataUrl;
  });

export default function MainVisualEditor({
  section,
  disabled,
  onPatchData,
  addAsset,
}: MainVisualEditorProps) {
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const pcRef = useRef<HTMLInputElement | null>(null);
  const spRef = useRef<HTMLInputElement | null>(null);
  const slidePcRef = useRef<HTMLInputElement | null>(null);
  const slideSpRef = useRef<HTMLInputElement | null>(null);
  const data = section.data as Record<string, unknown>;

  const pcMeta = useMemo(
    () =>
      (data.heroPcMeta as { filename?: string; relativePath?: string; size?: number } | undefined) ??
      {},
    [data.heroPcMeta]
  );
  const spMeta = useMemo(
    () =>
      (data.heroSpMeta as { filename?: string; relativePath?: string; size?: number } | undefined) ??
      {},
    [data.heroSpMeta]
  );

  const heroSlidesPc = useMemo<HeroSlide[]>(
    () => (Array.isArray(data.heroSlidesPc) ? (data.heroSlidesPc as HeroSlide[]) : []),
    [data.heroSlidesPc]
  );
  const heroSlidesSp = useMemo<HeroSlide[]>(
    () => (Array.isArray(data.heroSlidesSp) ? (data.heroSlidesSp as HeroSlide[]) : []),
    [data.heroSlidesSp]
  );
  const heroAnimation = useMemo<HeroAnimation | undefined>(() => {
    if (!data.heroAnimation || typeof data.heroAnimation !== "object") {
      return undefined;
    }
    const value = data.heroAnimation as Record<string, unknown>;
    const preset = value.preset;
    if (preset !== "fade" && preset !== "slideUp" && preset !== "zoom") {
      return undefined;
    }
    return {
      preset,
      durationMs: typeof value.durationMs === "number" ? value.durationMs : 400,
      delayMs: typeof value.delayMs === "number" ? value.delayMs : 0,
    };
  }, [data.heroAnimation]);

  const carouselEnabled =
    typeof data.heroCarouselEnabled === "boolean"
      ? data.heroCarouselEnabled
      : heroSlidesPc.length > 0 || heroSlidesSp.length > 0;

  const upload = async (file: File, device: "pc" | "sp") => {
    const dataUrl = await readFileAsDataUrl(file);
    const dim = await getImageSize(dataUrl);
    const assetId = addAsset({ filename: file.name, data: dataUrl });

    if (device === "pc") {
      onPatchData({
        imageAssetIdPc: assetId,
        imageUrl: dataUrl,
        heroPc: { assetId, w: dim.w, h: dim.h },
        heroPcMeta: {
          filename: file.name,
          relativePath: file.webkitRelativePath || "",
          size: file.size,
        },
      });
      return;
    }

    onPatchData({
      imageAssetIdSp: assetId,
      imageUrlSp: dataUrl,
      heroSp: { assetId, w: dim.w, h: dim.h },
      heroSpMeta: {
        filename: file.name,
        relativePath: file.webkitRelativePath || "",
        size: file.size,
      },
    });
  };

  const patchSlides = (device: "pc" | "sp", slides: HeroSlide[]) => {
    onPatchData(device === "pc" ? { heroSlidesPc: slides } : { heroSlidesSp: slides });
  };

  const addSlideFromFile = async (file: File, device: "pc" | "sp") => {
    const dataUrl = await readFileAsDataUrl(file);
    const assetId = addAsset({ filename: file.name, data: dataUrl });
    const slides = device === "pc" ? heroSlidesPc : heroSlidesSp;
    patchSlides(device, [...slides, { assetId, src: dataUrl, alt: "", title: "", ctaText: "", ctaUrl: "" }]);
  };

  const moveSlide = (device: "pc" | "sp", index: number, direction: -1 | 1) => {
    const slides = [...(device === "pc" ? heroSlidesPc : heroSlidesSp)];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= slides.length) {
      return;
    }
    const [moved] = slides.splice(index, 1);
    slides.splice(nextIndex, 0, moved);
    patchSlides(device, slides);
  };

  const duplicateSlide = (device: "pc" | "sp", index: number) => {
    const slides = [...(device === "pc" ? heroSlidesPc : heroSlidesSp)];
    const target = slides[index];
    if (!target) {
      return;
    }
    slides.splice(index + 1, 0, { ...target });
    patchSlides(device, slides);
  };

  const replaceSlideImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
    device: "pc" | "sp",
    index: number
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const assetId = addAsset({ filename: file.name, data: dataUrl });
    const slides = (device === "pc" ? heroSlidesPc : heroSlidesSp).map((entry, idx) =>
      idx === index ? { ...entry, assetId, src: dataUrl } : entry
    );
    patchSlides(device, slides);
    event.target.value = "";
  };

  const renderSlidesEditor = (device: "pc" | "sp") => {
    const title = device === "pc" ? "PCカルーセル" : "SPカルーセル";
    const inputRef = device === "pc" ? slidePcRef : slideSpRef;
    const slides = device === "pc" ? heroSlidesPc : heroSlidesSp;

    return (
      <InspectorSection title={title}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await addSlideFromFile(file, device);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="ui-button h-7 px-2 text-[11px]"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          スライドを追加
        </button>
        <div className="mt-2 space-y-2">
          {slides.length === 0 ? (
            <div className="text-[11px] text-[var(--ui-muted)]">スライドがありません。</div>
          ) : (
            slides.map((slide, index) => (
              <div key={`${device}_slide_${index}`} className="rounded-md border border-[var(--ui-border)]/60 p-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id={`${device}_slide_upload_${index}`}
                  onChange={(event) => void replaceSlideImage(event, device, index)}
                />
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-[var(--ui-muted)]">{index + 1}枚目</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="ui-button h-6 w-6 px-0"
                      onClick={() => moveSlide(device, index, -1)}
                      disabled={disabled || index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ui-button h-6 w-6 px-0"
                      onClick={() => moveSlide(device, index, 1)}
                      disabled={disabled || index >= slides.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="ui-button h-6 w-6 px-0"
                      onClick={() => duplicateSlide(device, index)}
                      disabled={disabled}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ui-button h-6 w-6 px-0"
                      onClick={() =>
                        patchSlides(
                          device,
                          slides.filter((_entry, idx) => idx !== index)
                        )
                      }
                      disabled={disabled}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="mb-2">
                  <label
                    htmlFor={`${device}_slide_upload_${index}`}
                    className="ui-button inline-flex h-6 items-center px-2 text-[10px]"
                  >
                    画像を選択
                  </label>
                </div>
                <InspectorField label="画像URL">
                  <InspectorInput
                    type="text"
                    value={slide.src ?? ""}
                    onChange={(event) => {
                      const next = slides.map((entry, idx) =>
                        idx === index ? { ...entry, src: event.target.value } : entry
                      );
                      patchSlides(device, next);
                    }}
                    disabled={disabled}
                  />
                </InspectorField>
                <InspectorField label="代替テキスト">
                  <InspectorInput
                    type="text"
                    value={slide.alt ?? ""}
                    onChange={(event) => {
                      const next = slides.map((entry, idx) =>
                        idx === index ? { ...entry, alt: event.target.value } : entry
                      );
                      patchSlides(device, next);
                    }}
                    disabled={disabled}
                  />
                </InspectorField>
                <InspectorField label="スライドタイトル">
                  <InspectorInput
                    type="text"
                    value={slide.title ?? ""}
                    onChange={(event) => {
                      const next = slides.map((entry, idx) =>
                        idx === index ? { ...entry, title: event.target.value } : entry
                      );
                      patchSlides(device, next);
                    }}
                    disabled={disabled}
                  />
                </InspectorField>
                <InspectorField label="スライドCTA文言">
                  <InspectorInput
                    type="text"
                    value={slide.ctaText ?? ""}
                    onChange={(event) => {
                      const next = slides.map((entry, idx) =>
                        idx === index ? { ...entry, ctaText: event.target.value } : entry
                      );
                      patchSlides(device, next);
                    }}
                    disabled={disabled}
                  />
                </InspectorField>
                <InspectorField label="スライドCTAリンク">
                  <InspectorInput
                    type="text"
                    value={slide.ctaUrl ?? ""}
                    onChange={(event) => {
                      const next = slides.map((entry, idx) =>
                        idx === index ? { ...entry, ctaUrl: event.target.value } : entry
                      );
                      patchSlides(device, next);
                    }}
                    disabled={disabled}
                  />
                </InspectorField>
              </div>
            ))
          )}
        </div>
      </InspectorSection>
    );
  };

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <InspectorSection title="AI Main Visual">
        <div className="space-y-2">
          <div className="text-[11px] text-[var(--ui-muted)]">
            既存の設定を維持したまま、AIでメインビジュアル案を生成します。
          </div>
          <button
            type="button"
            className="ui-button h-7 px-2.5 text-[11px]"
            onClick={() => setIsAiModalOpen(true)}
            disabled={disabled}
          >
            AIでMV生成
          </button>
        </div>
      </InspectorSection>

      <CreativeMainVisualModal
        open={isAiModalOpen}
        sectionId={section.id}
        onClose={() => setIsAiModalOpen(false)}
      />

      <SectionAssetPicker
        section={section}
        disabled={disabled}
        addAsset={addAsset}
        onPatchData={onPatchData}
      />

      <InspectorSection title="ヒーロー表示">
        <InspectorField label="タイトル">
          <InspectorInput
            type="text"
            value={String(data.title ?? "")}
            onChange={(event) => onPatchData({ title: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="サブタイトル">
          <InspectorInput
            type="text"
            value={String(data.subtitle ?? "")}
            onChange={(event) => onPatchData({ subtitle: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="CTA文言">
          <InspectorInput
            type="text"
            value={String(data.ctaText ?? "")}
            onChange={(event) => onPatchData({ ctaText: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="CTAリンク">
          <InspectorInput
            type="text"
            value={String(data.ctaUrl ?? "")}
            onChange={(event) => onPatchData({ ctaUrl: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>

        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">フルサイズ表示</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(data.heroFullSize)}
            onChange={(event) => onPatchData({ heroFullSize: event.target.checked })}
            disabled={disabled}
          />
        </label>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <InspectorField label="画像fit">
            <InspectorSelect
              value={String(data.heroImageFit ?? "contain")}
              onChange={(event) => onPatchData({ heroImageFit: event.target.value })}
              disabled={disabled}
            >
              <option value="contain">contain</option>
              <option value="cover">cover</option>
            </InspectorSelect>
          </InspectorField>
          <InspectorField label="画像position">
            <InspectorSelect
              value={String(data.heroImagePosition ?? "center center")}
              onChange={(event) => onPatchData({ heroImagePosition: event.target.value })}
              disabled={disabled}
            >
              <option value="center center">center</option>
              <option value="center top">top</option>
              <option value="center bottom">bottom</option>
              <option value="left center">left</option>
              <option value="right center">right</option>
            </InspectorSelect>
          </InspectorField>
        </div>
      </InspectorSection>

      <InspectorSection title="PC画像">
        <input
          ref={pcRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await upload(file, "pc");
            event.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onClick={() => pcRef.current?.click()}
            disabled={disabled}
          >
            PC画像を選択
          </button>
          {data.imageAssetIdPc ? (
            <button
              type="button"
              className="ui-button h-7 px-2 text-[11px]"
              onClick={() =>
                onPatchData({
                  imageAssetIdPc: undefined,
                  imageUrl: "",
                  heroPc: undefined,
                  heroPcMeta: undefined,
                })
              }
              disabled={disabled}
            >
              PC画像を削除
            </button>
          ) : null}
        </div>
        {data.imageAssetIdPc ? (
          <div className="text-[11px] text-[var(--ui-muted)]">
            <div>File: {pcMeta.filename ?? "-"}</div>
            <div>Location: {pcMeta.relativePath || "local file"}</div>
          </div>
        ) : null}
      </InspectorSection>

      <InspectorSection title="SP画像">
        <input
          ref={spRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await upload(file, "sp");
            event.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onClick={() => spRef.current?.click()}
            disabled={disabled}
          >
            SP画像を選択
          </button>
          {data.imageAssetIdSp ? (
            <button
              type="button"
              className="ui-button h-7 px-2 text-[11px]"
              onClick={() =>
                onPatchData({
                  imageAssetIdSp: undefined,
                  imageUrlSp: "",
                  heroSp: undefined,
                  heroSpMeta: undefined,
                })
              }
              disabled={disabled}
            >
              SP画像を削除
            </button>
          ) : null}
        </div>
        {data.imageAssetIdSp ? (
          <div className="text-[11px] text-[var(--ui-muted)]">
            <div>File: {spMeta.filename ?? "-"}</div>
            <div>Location: {spMeta.relativePath || "local file"}</div>
          </div>
        ) : null}
      </InspectorSection>

      <InspectorSection title="カルーセル設定">
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">カルーセル有効</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={carouselEnabled}
            onChange={(event) => onPatchData({ heroCarouselEnabled: event.target.checked })}
            disabled={disabled}
          />
        </label>
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">自動再生</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(data.heroCarouselAutoplay)}
            onChange={(event) => onPatchData({ heroCarouselAutoplay: event.target.checked })}
            disabled={disabled}
          />
        </label>
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">ループ</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(data.heroCarouselLoop)}
            onChange={(event) => onPatchData({ heroCarouselLoop: event.target.checked })}
            disabled={disabled}
          />
        </label>
        <InspectorField label="切替秒数">
          <InspectorInput
            type="number"
            min={1}
            max={30}
            step={1}
            value={Number(data.heroCarouselIntervalSec ?? 4)}
            onChange={(event) =>
              onPatchData({ heroCarouselIntervalSec: Number(event.target.value) || 4 })
            }
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      {renderSlidesEditor("pc")}
      {renderSlidesEditor("sp")}

      <InspectorSection title="ヒーローアニメーション">
        <InspectorField label="プリセット">
          <InspectorSelect
            value={heroAnimation?.preset ?? "none"}
            onChange={(event) => {
              const preset = event.target.value;
              if (preset === "none") {
                onPatchData({ heroAnimation: undefined });
                return;
              }
              onPatchData({
                heroAnimation: {
                  preset,
                  durationMs: heroAnimation?.durationMs ?? 400,
                  delayMs: heroAnimation?.delayMs ?? 0,
                },
              });
            }}
            disabled={disabled}
          >
            <option value="none">なし</option>
            <option value="fade">fade</option>
            <option value="slideUp">slideUp</option>
            <option value="zoom">zoom</option>
          </InspectorSelect>
        </InspectorField>

        {heroAnimation ? (
          <>
            <InspectorField label="再生時間(ms)">
              <InspectorInput
                type="number"
                min={100}
                max={5000}
                step={50}
                value={heroAnimation.durationMs ?? 400}
                onChange={(event) =>
                  onPatchData({
                    heroAnimation: {
                      ...heroAnimation,
                      durationMs: Number(event.target.value),
                    },
                  })
                }
                disabled={disabled}
              />
            </InspectorField>
            <InspectorField label="遅延(ms)">
              <InspectorInput
                type="number"
                min={0}
                max={3000}
                step={50}
                value={heroAnimation.delayMs ?? 0}
                onChange={(event) =>
                  onPatchData({
                    heroAnimation: {
                      ...heroAnimation,
                      delayMs: Number(event.target.value),
                    },
                  })
                }
                disabled={disabled}
              />
            </InspectorField>
          </>
        ) : null}
      </InspectorSection>
    </div>
  );
}
