"use client";

import { useState } from "react";
import StatusChip from "./StatusChip";
import { useEditorStore } from "@/src/store/editorStore";
import { useThemeStore } from "@/src/store/themeStore";
import {
  downloadProjectJson,
  pickAndLoadProjectJson,
} from "@/src/lib/projectFile";
import { exportProjectToZip, triggerZipDownload } from "@/src/export/exportZip";
import { pickAndImportZip } from "@/src/lib/importZip";

export default function TopBar() {
  const themeMode = useThemeStore((state) => state.mode);
  const surfaceStyle = useThemeStore((state) => state.surfaceStyle);
  const presetId = useThemeStore((state) => state.presetId);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const setSurfaceStyle = useThemeStore((state) => state.setSurfaceStyle);
  const setPresetId = useThemeStore((state) => state.setPresetId);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const previewMode = useEditorStore((state) => state.previewMode);
  const previewAspect = useEditorStore((state) => state.previewAspect);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const saveStatusMessage = useEditorStore((state) => state.saveStatusMessage);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const requestManualSave = useEditorStore(
    (state) => state.requestManualSave
  );
  const project = useEditorStore((state) => state.project);
  const replaceProject = useEditorStore((state) => state.replaceProject);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const setPreviewBusy = useEditorStore((state) => state.setPreviewBusy);
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);
  const setPreviewAspect = useEditorStore((state) => state.setPreviewAspect);

  const isDesktop = previewMode === "desktop";
  const isMobile = previewMode === "mobile";
  const isDev =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_APP_ENV === "development";

  const glassClass = surfaceStyle === "glass" ? "backdrop-blur-xl" : "";

  const themeModeOptions = [
    { value: "light", label: "ライト" },
    { value: "dark", label: "ダーク" },
    { value: "system", label: "システム" },
  ] as const;

  const surfaceOptions = [
    { value: "glass", label: "ガラス" },
    { value: "flat", label: "フラット" },
  ] as const;

  const presetOptions = [
    { value: "classic", label: "クラシック" },
    { value: "premium", label: "プレミアム" },
    { value: "midnight", label: "ミッドナイト" },
    { value: "ivory", label: "アイボリー" },
    { value: "mint", label: "ミント" },
  ] as const;

  const aspectOptions = [
    { value: "free", label: "フリー" },
    { value: "16:9", label: "16:9" },
    { value: "4:3", label: "4:3" },
    { value: "1:1", label: "1:1" },
  ] as const;

  const handleExportZip = async () => {
    try {
      setSaveStatus("saving", "ZIPを書き出し中…");
      const result = await exportProjectToZip(project, {
        previewMode,
        previewAspect,
      });
      triggerZipDownload(result.blob, project.meta.projectName || "campaign-lp");
      setSaveStatus("saved", "ZIPを書き出しました");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "書き出しに失敗しました。";
      setSaveStatus("error", message);
    }
  };

  const handleSaveProjectJson = () => {
    setSaveStatus("saving", "プロジェクトをダウンロード中…");
    try {
      downloadProjectJson(project);
      setSaveStatus("saved", ".lp-project.json をダウンロードしました");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ダウンロードに失敗しました。";
      setSaveStatus("error", message);
    }
  };

  const handleLoadProjectJson = async () => {
    setSaveStatus("saving", "プロジェクトを読み込み中…");
    try {
      const nextProject = await pickAndLoadProjectJson();
      replaceProject(nextProject);
      const { getDb } = await import("@/src/db/db");
      const db = await getDb();
      await db.projects.put({
        id: "project_default",
        data: nextProject,
        updatedAt: Date.now(),
      });
      setSaveStatus("saved", "プロジェクトを読み込みました");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setSaveStatus("saved");
        return;
      }
      const message =
        error instanceof Error ? error.message : "読み込みに失敗しました。";
      setSaveStatus("error", message);
    }
  };

  const handleImportZip = async () => {
    setPreviewBusy(true, "import");
    setSaveStatus("saving", "ZIPを読み込み中…");
    try {
      const nextProject = await pickAndImportZip();
      replaceProject(nextProject);
      const { getDb } = await import("@/src/db/db");
      const db = await getDb();
      await db.projects.put({
        id: "project_default",
        data: nextProject,
        updatedAt: Date.now(),
      });
      setPreviewBusy(false);
      setSaveStatus("saved", "ZIPを読み込みました");
    } catch (error) {
      setPreviewBusy(false);
      if (error instanceof Error && error.name === "AbortError") {
        setSaveStatus("saved");
        return;
      }
      const message =
        error instanceof Error ? error.message : "読み込みに失敗しました。";
      setSaveStatus("error", message);
    }
  };

  return (
    <header
      className={
        "ui-panel sticky top-0 z-20 grid h-14 grid-cols-[1fr_auto_1fr] items-center rounded-none border-x-0 border-t-0 px-[var(--ui-space-3)] text-[var(--ui-text)] " +
        glassClass
      }
    >
      <div className="flex items-center gap-2">
        <button
          className="ui-button h-8 px-3 text-[11px]"
          type="button"
          aria-label="元に戻す"
          disabled={!canUndo}
          onClick={() => undo()}
        >
          元に戻す
        </button>
        <button
          className="ui-button h-8 px-3 text-[11px]"
          type="button"
          aria-label="やり直し"
          disabled={!canRedo}
          onClick={() => redo()}
        >
          やり直し
        </button>
        <button
          className="ui-button h-8 px-3 text-[11px]"
          type="button"
          aria-label="プロジェクトJSONを保存"
          onClick={handleSaveProjectJson}
        >
          JSONを保存
        </button>
        {isDev ? (
          <button
            className="ui-button h-8 px-3 text-[11px]"
            type="button"
            aria-label="デバッグで今すぐ保存"
            onClick={() => requestManualSave()}
          >
            デバッグ: 今すぐ保存
          </button>
        ) : null}
      </div>
      <div className="flex items-center justify-center gap-2">
        <div className="flex h-8 rounded-[var(--ui-radius-md)] border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-0.5">
          <button
            className={
              isDesktop
                ? "ui-chip is-active h-7 px-3"
                : "ui-chip h-7 px-3"
            }
            type="button"
            aria-label="デスクトップ表示"
            aria-pressed={isDesktop}
            onClick={() => setPreviewMode("desktop")}
          >
            デスクトップ
          </button>
          <button
            className={
              isMobile
                ? "ui-chip is-active h-7 px-3"
                : "ui-chip h-7 px-3"
            }
            type="button"
            aria-label="モバイル表示"
            aria-pressed={isMobile}
            onClick={() => setPreviewMode("mobile")}
          >
            モバイル
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <div
          className="flex h-8 rounded-[var(--ui-radius-md)] border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-0.5"
          role="radiogroup"
          aria-label="プレビューのアスペクト比"
        >
          {aspectOptions.map((option) => {
            const isActive = previewAspect === option.value;
            const isDisabled = isMobile;
            return (
              <button
                key={option.value}
                className={
                  (isActive
                    ? "ui-chip is-active h-7 px-2"
                    : "ui-chip h-7 px-2") +
                  (isDisabled
                    ? " cursor-not-allowed opacity-50 shadow-none"
                    : "")
                }
                type="button"
                aria-label={`アスペクト比 ${option.label}`}
                aria-pressed={isActive}
                aria-disabled={isDisabled}
                disabled={isDisabled}
                onClick={() => setPreviewAspect(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <button
          className="ui-button h-8 px-3 text-[11px]"
          type="button"
          aria-label="プロジェクトJSONを読み込み"
          onClick={handleLoadProjectJson}
        >
          JSONを読み込み
        </button>
        <button
          className="ui-button h-8 px-3 text-[11px]"
          type="button"
          aria-label="ZIPを読み込み"
          onClick={handleImportZip}
        >
          ZIPを読み込み
        </button>
        <button
          className="ui-button h-8 px-3 text-[11px]"
          type="button"
          aria-label="ZIPを書き出し"
          onClick={handleExportZip}
        >
          ZIPを書き出し
        </button>
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isThemeOpen}
            className="ui-button h-8 px-3 text-[11px]"
            onClick={() => setIsThemeOpen((current) => !current)}
          >
            テーマ
          </button>
          {isThemeOpen ? (
            <div
              className={
                "ui-panel absolute right-0 top-11 z-30 w-64 p-[var(--ui-space-3)] " +
                glassClass
              }
              role="menu"
            >
              <div className="text-[11px] font-semibold text-[var(--ui-muted)]">
                モード
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {themeModeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`ui-button h-8 px-2 text-[11px] ${
                      themeMode === option.value ? "ui-button-primary" : ""
                    }`}
                    onClick={() => setThemeMode(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[11px] font-semibold text-[var(--ui-muted)]">
                サーフェス
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {surfaceOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`ui-button h-8 px-2 text-[11px] ${
                      surfaceStyle === option.value ? "ui-button-primary" : ""
                    }`}
                    onClick={() => setSurfaceStyle(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[11px] font-semibold text-[var(--ui-muted)]">
                プリセット
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {presetOptions.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`ui-button h-9 justify-between px-2 text-[11px] ${
                      presetId === preset.value ? "ui-button-primary" : ""
                    }`}
                    onClick={() => setPresetId(preset.value)}
                  >
                    <span>{preset.label}</span>
                    <span className="h-3 w-3 rounded-full bg-[var(--ui-primary)]" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {isMobile ? (
          <span className="text-[11px] text-[var(--ui-muted)]">
            Mobileでは端末枠で固定表示です
          </span>
        ) : null}
        <StatusChip status={saveStatus} message={saveStatusMessage} />
      </div>
    </header>
  );
}
