"use client";

import { useRef } from "react";
import type { CreativeLayer } from "@/src/features/creative/types/layer";

type Props = {
  selectedLayer: CreativeLayer | null;
  onPatchLayer: (layerId: string, patch: Record<string, string | number>) => void;
  onReplaceLogo: (url: string) => void;
  onReplaceBackground: (url: string) => void;
};

const inputCls = "h-7 rounded border border-[var(--ui-border)] bg-[var(--ui-bg)] px-2 text-[11px] text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)] transition-colors";
const sectionTitle = "text-[10px] font-semibold uppercase tracking-wider text-[var(--ui-muted)]";
const btnApply = "h-7 rounded bg-[var(--ui-primary)] px-2.5 text-[10px] font-medium text-white transition-opacity hover:opacity-90";

export default function CreativeInspectorPanel({
  selectedLayer,
  onPatchLayer,
  onReplaceLogo,
  onReplaceBackground,
}: Props) {
  const logoRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <h3 className="text-[13px] font-semibold text-[var(--ui-text)]">インスペクター</h3>

      {selectedLayer ? (
        <div className="space-y-3">
          {/* Position & Size */}
          <section>
            <h4 className={sectionTitle}>位置・サイズ</h4>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <label className="grid gap-0.5 text-[10px] text-[var(--ui-muted)]">
                X
                <input
                  className={inputCls}
                  type="number"
                  value={selectedLayer.x}
                  onChange={(e) => onPatchLayer(selectedLayer.id, { x: Number(e.target.value) })}
                />
              </label>
              <label className="grid gap-0.5 text-[10px] text-[var(--ui-muted)]">
                Y
                <input
                  className={inputCls}
                  type="number"
                  value={selectedLayer.y}
                  onChange={(e) => onPatchLayer(selectedLayer.id, { y: Number(e.target.value) })}
                />
              </label>
              <label className="grid gap-0.5 text-[10px] text-[var(--ui-muted)]">
                W
                <input
                  className={inputCls}
                  type="number"
                  value={selectedLayer.width}
                  onChange={(e) => onPatchLayer(selectedLayer.id, { width: Number(e.target.value) })}
                />
              </label>
              <label className="grid gap-0.5 text-[10px] text-[var(--ui-muted)]">
                H
                <input
                  className={inputCls}
                  type="number"
                  value={selectedLayer.height}
                  onChange={(e) => onPatchLayer(selectedLayer.id, { height: Number(e.target.value) })}
                />
              </label>
            </div>
          </section>

          {/* Text Properties */}
          {selectedLayer.type === "text" && (
            <section>
              <h4 className={sectionTitle}>テキスト</h4>
              <div className="mt-1.5 space-y-1.5">
                <textarea
                  className="min-h-16 w-full rounded border border-[var(--ui-border)] bg-[var(--ui-bg)] p-1.5 text-[11px] text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)]"
                  value={selectedLayer.text}
                  onChange={(e) => onPatchLayer(selectedLayer.id, { text: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="grid gap-0.5 text-[10px] text-[var(--ui-muted)]">
                    色
                    <input
                      className="h-7 rounded border border-[var(--ui-border)] bg-[var(--ui-bg)]"
                      type="color"
                      value={selectedLayer.color}
                      onChange={(e) => onPatchLayer(selectedLayer.id, { color: e.target.value })}
                    />
                  </label>
                  <label className="grid gap-0.5 text-[10px] text-[var(--ui-muted)]">
                    サイズ
                    <input
                      className={inputCls}
                      type="number"
                      value={selectedLayer.fontSize}
                      onChange={(e) => onPatchLayer(selectedLayer.id, { fontSize: Number(e.target.value) })}
                    />
                  </label>
                </div>
                <label className="grid gap-0.5 text-[10px] text-[var(--ui-muted)]">
                  太さ
                  <select
                    className={inputCls}
                    value={selectedLayer.fontWeight ?? 600}
                    onChange={(e) => onPatchLayer(selectedLayer.id, { fontWeight: Number(e.target.value) })}
                  >
                    <option value={400}>Normal (400)</option>
                    <option value={500}>Medium (500)</option>
                    <option value={600}>Semi-Bold (600)</option>
                    <option value={700}>Bold (700)</option>
                    <option value={800}>Extra-Bold (800)</option>
                  </select>
                </label>
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="rounded border border-dashed border-[var(--ui-border)] p-3 text-center text-[11px] text-[var(--ui-muted)]">
          レイヤーを選択して編集
        </div>
      )}

      <hr className="border-[var(--ui-border)]" />

      {/* Logo replacement */}
      <section>
        <h4 className={sectionTitle}>ロゴ差し替え</h4>
        <div className="mt-1.5 flex gap-1.5">
          <input
            ref={logoRef}
            className={`${inputCls} flex-1`}
            placeholder="https://...logo.png"
          />
          <button
            type="button"
            className={btnApply}
            onClick={() => {
              const url = logoRef.current?.value.trim();
              if (url) {
                onReplaceLogo(url);
                if (logoRef.current) logoRef.current.value = "";
              }
            }}
          >
            適用
          </button>
        </div>
      </section>

      {/* Background replacement */}
      <section>
        <h4 className={sectionTitle}>背景差し替え</h4>
        <div className="mt-1.5 flex gap-1.5">
          <input
            ref={bgRef}
            className={`${inputCls} flex-1`}
            placeholder="https://...background.jpg"
          />
          <button
            type="button"
            className={btnApply}
            onClick={() => {
              const url = bgRef.current?.value.trim();
              if (url) {
                onReplaceBackground(url);
                if (bgRef.current) bgRef.current.value = "";
              }
            }}
          >
            適用
          </button>
        </div>
      </section>
    </div>
  );
}
