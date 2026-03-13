"use client";

import CreativeCanvasStage from "@/src/features/creative/components/editor/CreativeCanvasStage";
import CreativeEditorLayout from "@/src/features/creative/components/editor/CreativeEditorLayout";
import CreativeInspectorPanel from "@/src/features/creative/components/editor/CreativeInspectorPanel";
import { useCreativeEditorUiStore } from "@/src/features/creative/stores/useCreativeEditorUiStore";
import { useCreativeVariantStore } from "@/src/features/creative/stores/useCreativeVariantStore";

type Props = {
  onBack: () => void;
  onNext: () => void;
  fullHeight?: boolean;
};

const btnGhost =
  "h-7 rounded px-2 text-[11px] font-medium text-[var(--ui-text)] border border-[var(--ui-border)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]";
const btnPrimary =
  "h-7 rounded bg-[var(--ui-primary)] px-3 text-[11px] font-medium text-white transition-opacity hover:opacity-90";

function layerLabel(layer: { id: string; type: string }): string {
  if (layer.type === "text") return "テキスト";
  if (layer.type === "logo") return "ロゴ";
  if (layer.type === "image") return "画像";
  return layer.type;
}

export default function CreativeEditorShell({ onBack, onNext, fullHeight = false }: Props) {
  const variants = useCreativeVariantStore((s) => s.variants);
  const currentVariantId = useCreativeVariantStore((s) => s.currentVariantId);
  const variantJson = useCreativeVariantStore((s) => s.variantJson);
  const patchLayer = useCreativeVariantStore((s) => s.patchLayer);
  const moveLayer = useCreativeVariantStore((s) => s.moveLayer);
  const resizeLayer = useCreativeVariantStore((s) => s.resizeLayer);
  const replaceLogo = useCreativeVariantStore((s) => s.replaceLogo);
  const replaceBackground = useCreativeVariantStore((s) => s.replaceBackground);
  const setCurrentVariantById = useCreativeVariantStore((s) => s.setCurrentVariantById);
  const undo = useCreativeVariantStore((s) => s.undo);
  const redo = useCreativeVariantStore((s) => s.redo);

  const selectedLayerId = useCreativeEditorUiStore((s) => s.selectedLayerId);
  const zoom = useCreativeEditorUiStore((s) => s.zoom);
  const setZoom = useCreativeEditorUiStore((s) => s.setZoom);
  const setSelectedLayerId = useCreativeEditorUiStore((s) => s.setSelectedLayerId);

  if (!variantJson) {
    return (
      <div className="rounded border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 text-[11px] text-[var(--ui-muted)]">
        バリアントが選択されていません。
      </div>
    );
  }

  const selectedLayer = variantJson.layers.find((layer) => layer.id === selectedLayerId) ?? null;

  return (
    <div className={fullHeight ? "flex h-full min-h-0 flex-col" : "flex flex-col gap-0"}>
      {/* Toolbar */}
      <header className="flex h-11 items-center justify-between border-b border-[var(--ui-border)] bg-[var(--surface-2,var(--ui-panel))] px-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold text-[var(--ui-text)]">クリエイティブ編集</h2>
          <span className="text-[10px] text-[var(--ui-muted)]">Drag / Text / Resize / Color</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={undo} className={btnGhost}>
            ↩ Undo
          </button>
          <button type="button" onClick={redo} className={btnGhost}>
            Redo ↪
          </button>
          <div className="mx-1 h-4 w-px bg-[var(--ui-border)]" />
          <label className="flex items-center gap-1.5 text-[11px] text-[var(--ui-muted)]">
            Zoom
            <input
              type="range"
              min={0.3}
              max={2}
              step={0.1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-1 w-16 accent-[var(--ui-primary)]"
            />
            <span className="w-7 text-right text-[10px]">{Math.round(zoom * 100)}%</span>
          </label>
          <div className="mx-1 h-4 w-px bg-[var(--ui-border)]" />
          <button type="button" onClick={onBack} className={btnGhost}>
            ← 戻る
          </button>
          <button type="button" onClick={onNext} className={btnPrimary}>
            エクスポート →
          </button>
        </div>
      </header>

      <CreativeEditorLayout
        fullHeight={fullHeight}
        left={
          <div className="space-y-3">
            <section>
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ui-muted)]">バリアント</h4>
              <div className="space-y-1">
                {variants.map((variant, i) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setCurrentVariantById(variant.id)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] transition-colors ${
                      variant.id === currentVariantId
                        ? "bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] font-medium"
                        : "text-[var(--ui-text)] hover:bg-[color-mix(in_srgb,var(--ui-text)_6%,transparent)]"
                    }`}
                  >
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${
                      variant.id === currentVariantId ? "bg-[var(--ui-primary)] text-white" : "bg-[var(--ui-panel-muted)] text-[var(--ui-muted)]"
                    }`}>{i + 1}</span>
                    {variant.strategyLabel}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ui-muted)]">レイヤー</h4>
              <div className="space-y-0.5">
                {variantJson.layers.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[11px] transition-colors ${
                      selectedLayerId === layer.id
                        ? "bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] font-medium"
                        : "text-[var(--ui-text)] hover:bg-[color-mix(in_srgb,var(--ui-text)_6%,transparent)]"
                    }`}
                  >
                    <span className="w-10 shrink-0 text-[10px] text-[var(--ui-muted)]">{layerLabel(layer)}</span>
                    <span className="truncate">
                      {layer.type === "text" ? (layer as { text: string }).text.slice(0, 20) : layer.id.split("-").pop()}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        }
        center={
          <CreativeCanvasStage
            variantJson={variantJson}
            selectedLayerId={selectedLayerId}
            zoom={zoom}
            onSelectLayer={setSelectedLayerId}
            onMoveLayer={moveLayer}
            onResizeLayer={resizeLayer}
            onTextEdit={(layerId, text) => patchLayer(layerId, { text })}
          />
        }
        right={
          <CreativeInspectorPanel
            selectedLayer={selectedLayer}
            onPatchLayer={patchLayer}
            onReplaceLogo={replaceLogo}
            onReplaceBackground={replaceBackground}
          />
        }
      />
    </div>
  );
}
