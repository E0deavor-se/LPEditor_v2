"use client";

import { useMemo, useState } from "react";
import StatusChip from "./StatusChip";
import { useEditorStore } from "@/src/store/editorStore";
import { useThemeStore } from "@/src/store/themeStore";
import {
  downloadProjectJson,
  pickAndLoadProjectJson,
} from "@/src/lib/projectFile";
import { exportProjectToZip, triggerZipDownload } from "@/src/export/exportZip";
import { pickAndImportZip } from "@/src/lib/importZip";

type TopBarProps = {
  onOpenTemplate?: () => void;
};

export default function TopBar({ onOpenTemplate }: TopBarProps) {
  const themeMode = useThemeStore((state) => state.mode);
  const surfaceStyle = useThemeStore((state) => state.surfaceStyle);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const setSurfaceStyle = useThemeStore((state) => state.setSurfaceStyle);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [rollbackSteps, setRollbackSteps] = useState(1);
  const previewMode = useEditorStore((state) => state.previewMode);
  const previewAspect = useEditorStore((state) => state.previewAspect);
  const previewDesktopWidth = useEditorStore(
    (state) => state.previewDesktopWidth
  );
  const previewMobileWidth = useEditorStore((state) => state.previewMobileWidth);
  const previewGuidesEnabled = useEditorStore(
    (state) => state.previewGuidesEnabled
  );
  const previewSafeAreaEnabled = useEditorStore(
    (state) => state.previewSafeAreaEnabled
  );
  const previewSectionBoundsEnabled = useEditorStore(
    (state) => state.previewSectionBoundsEnabled
  );
  const previewScrollSnapEnabled = useEditorStore(
    (state) => state.previewScrollSnapEnabled
  );
  const previewFontScale = useEditorStore((state) => state.previewFontScale);
  const previewContrastWarningsEnabled = useEditorStore(
    (state) => state.previewContrastWarningsEnabled
  );
  const autoSaveIntervalSec = useEditorStore(
    (state) => state.autoSaveIntervalSec
  );
  const setAutoSaveIntervalSec = useEditorStore(
    (state) => state.setAutoSaveIntervalSec
  );
  const saveDestination = useEditorStore((state) => state.saveDestination);
  const setSaveDestination = useEditorStore(
    (state) => state.setSaveDestination
  );
  const exportFilenameTemplate = useEditorStore(
    (state) => state.exportFilenameTemplate
  );
  const setExportFilenameTemplate = useEditorStore(
    (state) => state.setExportFilenameTemplate
  );
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
  const setPreviewDesktopWidth = useEditorStore(
    (state) => state.setPreviewDesktopWidth
  );
  const setPreviewMobileWidth = useEditorStore(
    (state) => state.setPreviewMobileWidth
  );
  const setPreviewGuidesEnabled = useEditorStore(
    (state) => state.setPreviewGuidesEnabled
  );
  const setPreviewSafeAreaEnabled = useEditorStore(
    (state) => state.setPreviewSafeAreaEnabled
  );
  const setPreviewSectionBoundsEnabled = useEditorStore(
    (state) => state.setPreviewSectionBoundsEnabled
  );
  const setPreviewScrollSnapEnabled = useEditorStore(
    (state) => state.setPreviewScrollSnapEnabled
  );
  const setPreviewFontScale = useEditorStore(
    (state) => state.setPreviewFontScale
  );
  const setPreviewContrastWarningsEnabled = useEditorStore(
    (state) => state.setPreviewContrastWarningsEnabled
  );
  const undoCount = useEditorStore((state) => state.undoStack.length);
  const redoCount = useEditorStore((state) => state.redoStack.length);
  const clearHistory = useEditorStore((state) => state.clearHistory);
  const aiDefaultInstruction = useEditorStore(
    (state) => state.aiDefaultInstruction
  );
  const aiForbiddenWords = useEditorStore((state) => state.aiForbiddenWords);
  const aiTargetSectionTypes = useEditorStore(
    (state) => state.aiTargetSectionTypes
  );
  const setAiDefaultInstruction = useEditorStore(
    (state) => state.setAiDefaultInstruction
  );
  const setAiForbiddenWords = useEditorStore(
    (state) => state.setAiForbiddenWords
  );
  const setAiTargetSectionTypes = useEditorStore(
    (state) => state.setAiTargetSectionTypes
  );

  const isDesktop = previewMode === "desktop";
  const isMobile = previewMode === "mobile";
  const isDev =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_APP_ENV === "development";
  const maxRollbackSteps = Math.min(undoCount, 10);
  const rollbackValue = Math.min(
    rollbackSteps,
    Math.max(1, maxRollbackSteps)
  );

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


  const autoSaveOptions = [
    { value: 10, label: "10秒" },
    { value: 30, label: "30秒" },
    { value: 60, label: "1分" },
    { value: 120, label: "2分" },
    { value: 300, label: "5分" },
    { value: 600, label: "10分" },
  ] as const;

  const aspectOptions = [
    { value: "free", label: "フリー" },
    { value: "16:9", label: "16:9" },
    { value: "4:3", label: "4:3" },
    { value: "1:1", label: "1:1" },
  ] as const;

  const aiToneOptions = [
    { value: "", label: "指定なし" },
    { value: "短く", label: "短く" },
    { value: "わかりやすく", label: "わかりやすく" },
    { value: "より丁寧に", label: "より丁寧に" },
    { value: "親しみやすく", label: "親しみやすく" },
    { value: "訴求力を上げる", label: "訴求力を上げる" },
  ] as const;

  const sanitizeFilename = (value: string) =>
    value
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim();

  const buildExportFilename = (template: string, projectName: string) => {
    const date = new Date().toISOString().slice(0, 10);
    const baseName = projectName || "campaign-lp";
    const resolved = template
      .replaceAll("{projectName}", baseName)
      .replaceAll("{date}", date);
    return sanitizeFilename(resolved) || "campaign-lp";
  };

  const handleExportZip = async () => {
    try {
      setSaveStatus("saving", "ZIPを書き出し中…");
      const result = await exportProjectToZip(project, {
        previewMode,
        previewAspect,
      });
      const filename = buildExportFilename(
        exportFilenameTemplate,
        project.meta.projectName || "campaign-lp"
      );
      triggerZipDownload(result.blob, filename);
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

  const sectionTypeOptions = useMemo(() => {
    const types = new Set(project.sections.map((section) => section.type));
    return Array.from(types).sort();
  }, [project.sections]);

  return (
    <header
      className={
        "ui-panel sticky top-0 z-20 grid h-14 grid-cols-[1fr_auto_1fr] items-center rounded-none border-x-0 border-t-0 px-[var(--ui-space-3)] text-[var(--ui-text)] " +
        glassClass
      }
    >
      <div className="flex items-center gap-2">
        {onOpenTemplate ? (
          <button
            className="ui-button h-8 px-3 text-[11px]"
            type="button"
            aria-label="テンプレート選択画面に戻る"
            onClick={onOpenTemplate}
          >
            テンプレート選択画面に戻る
          </button>
        ) : null}
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
            aria-haspopup="dialog"
            aria-expanded={isSettingsOpen}
            aria-label="設定"
            className="ui-button h-8 px-3 text-[11px]"
            onClick={() => setIsSettingsOpen(true)}
          >
            設定
          </button>
        </div>
        {isSettingsOpen ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 backdrop-blur-[2px] p-4 pt-6">
            <div
              className={
                "ui-panel w-full max-w-xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.3)] " +
                glassClass
              }
              role="dialog"
              aria-modal="true"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--ui-muted)]">
                    設定
                  </div>
                  <div className="text-lg font-semibold text-[var(--ui-text)]">
                    LP Editor 設定
                  </div>
                  <div className="text-[12px] text-[var(--ui-muted)]">
                    テーマや保存方法を調整できます。
                  </div>
                </div>
                <button
                  type="button"
                  className="ui-button h-7 px-2.5 text-[10px]"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  閉じる
                </button>
              </div>

              <div className="mt-4 grid gap-4">
                <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-3">
                  <div className="text-[11px] font-semibold text-[var(--ui-muted)]">
                    テーマ
                  </div>
                  <div className="mt-2 text-[10px] font-semibold text-[var(--ui-muted)]">
                    モード
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {themeModeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`ui-button h-7 px-2 text-[10px] ${
                          themeMode === option.value ? "ui-button-primary" : ""
                        }`}
                        onClick={() => setThemeMode(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-[10px] font-semibold text-[var(--ui-muted)]">
                    サーフェス
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {surfaceOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`ui-button h-7 px-2 text-[10px] ${
                          surfaceStyle === option.value ? "ui-button-primary" : ""
                        }`}
                        onClick={() => setSurfaceStyle(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-3">
                  <div className="text-[11px] font-semibold text-[var(--ui-muted)]">
                    保存
                  </div>
                  <div className="mt-2 text-[10px] font-semibold text-[var(--ui-muted)]">
                    自動保存期間
                  </div>
                  <select
                    className="ui-input mt-2 h-7 w-full text-[11px]"
                    value={autoSaveIntervalSec}
                    onChange={(event) =>
                      setAutoSaveIntervalSec(Number(event.target.value))
                    }
                    disabled={saveDestination !== "browser"}
                  >
                    {autoSaveOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 text-[10px] font-semibold text-[var(--ui-muted)]">
                    保存先
                  </div>
                  <div className="mt-2 flex flex-col gap-2 text-[11px]">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="save-destination"
                        value="browser"
                        checked={saveDestination === "browser"}
                        onChange={() => setSaveDestination("browser")}
                      />
                      <span>ブラウザ内（IndexedDB）</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="save-destination"
                        value="manual-json"
                        checked={saveDestination === "manual-json"}
                        onChange={() => setSaveDestination("manual-json")}
                      />
                      <span>JSONファイル（手動保存）</span>
                    </label>
                    {saveDestination !== "browser" ? (
                      <div className="text-[10px] text-[var(--ui-muted)]">
                        自動保存は無効になります。
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-3">
                  <div className="text-[11px] font-semibold text-[var(--ui-muted)]">
                    エクスポート
                  </div>
                  <div className="mt-2 text-[10px] font-semibold text-[var(--ui-muted)]">
                    デフォルトファイル名
                  </div>
                  <input
                    type="text"
                    className="ui-input mt-2 h-7 w-full text-[11px]"
                    value={exportFilenameTemplate}
                    onChange={(event) =>
                      setExportFilenameTemplate(event.target.value)
                    }
                    placeholder="{projectName}-{date}"
                  />
                  <div className="mt-2 text-[10px] text-[var(--ui-muted)]">
                    利用可能: {"{projectName}"} / {"{date}"}
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--ui-muted)]">
                    保存先フォルダはブラウザのダウンロード設定に従います。
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-3">
                  <div className="text-[11px] font-semibold text-[var(--ui-muted)]">
                    履歴
                  </div>
                  <div className="mt-2 text-[10px] font-semibold text-[var(--ui-muted)]">
                    直近ロールバック
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      className="ui-input h-7 flex-1 text-[11px]"
                      value={rollbackValue}
                      onChange={(event) =>
                        setRollbackSteps(Number(event.target.value))
                      }
                      disabled={!canUndo}
                    >
                      {Array.from({ length: Math.max(1, maxRollbackSteps) }, (_, index) => {
                        const value = index + 1;
                        return (
                          <option key={value} value={value}>
                            {value} 手前に戻す
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="button"
                      className="ui-button h-7 px-2 text-[10px]"
                      disabled={!canUndo}
                      onClick={() => {
                        const steps = Math.min(rollbackValue, undoCount);
                        for (let i = 0; i < steps; i += 1) {
                          undo();
                        }
                      }}
                    >
                      まとめて戻す
                    </button>
                  </div>
                  <div className="mt-2 text-[10px] text-[var(--ui-muted)]">
                    履歴: {undoCount} / やり直し: {redoCount}
                  </div>
                  <button
                    type="button"
                    className="ui-button mt-2 h-7 px-2 text-[10px]"
                    disabled={undoCount === 0 && redoCount === 0}
                    onClick={() => clearHistory()}
                  >
                    履歴をクリア
                  </button>
                </div>

                <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-3">
                  <div className="text-[11px] font-semibold text-[var(--ui-muted)]">
                    プレビュー
                  </div>
                  <div className="mt-2 text-[10px] font-semibold text-[var(--ui-muted)]">
                    デフォルト端末幅
                  </div>
                  <div className="mt-2 grid gap-2">
                    <label className="text-[10px] text-[var(--ui-muted)]">
                      デスクトップ (px)
                      <input
                        type="number"
                        className="ui-input mt-1 h-7 w-full text-[11px]"
                        min={720}
                        max={1600}
                        step={10}
                        value={previewDesktopWidth}
                        onChange={(event) =>
                          setPreviewDesktopWidth(Number(event.target.value))
                        }
                      />
                    </label>
                    <label className="text-[10px] text-[var(--ui-muted)]">
                      モバイル (px)
                      <input
                        type="number"
                        className="ui-input mt-1 h-7 w-full text-[11px]"
                        min={320}
                        max={520}
                        step={10}
                        value={previewMobileWidth}
                        onChange={(event) =>
                          setPreviewMobileWidth(Number(event.target.value))
                        }
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 text-[11px]">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={previewGuidesEnabled}
                        onChange={(event) =>
                          setPreviewGuidesEnabled(event.target.checked)
                        }
                      />
                      <span>ガイドライン表示</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={previewSafeAreaEnabled}
                        onChange={(event) =>
                          setPreviewSafeAreaEnabled(event.target.checked)
                        }
                      />
                      <span>セーフエリア表示</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={previewSectionBoundsEnabled}
                        onChange={(event) =>
                          setPreviewSectionBoundsEnabled(event.target.checked)
                        }
                      />
                      <span>セクション境界を常時表示</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={previewScrollSnapEnabled}
                        onChange={(event) =>
                          setPreviewScrollSnapEnabled(event.target.checked)
                        }
                      />
                      <span>スクロールをセクションにスナップ</span>
                    </label>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-3">
                  <div className="text-[11px] font-semibold text-[var(--ui-muted)]">
                    アクセシビリティ
                  </div>
                  <div className="mt-2 text-[10px] font-semibold text-[var(--ui-muted)]">
                    フォント拡大
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="range"
                      min={0.85}
                      max={1.2}
                      step={0.05}
                      value={previewFontScale}
                      onChange={(event) =>
                        setPreviewFontScale(Number(event.target.value))
                      }
                      className="flex-1"
                    />
                    <span className="text-[10px] text-[var(--ui-muted)]">
                      {Math.round(previewFontScale * 100)}%
                    </span>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={previewContrastWarningsEnabled}
                      onChange={(event) =>
                        setPreviewContrastWarningsEnabled(event.target.checked)
                      }
                    />
                    <span>色コントラスト警告</span>
                  </label>
                </div>

                <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-3">
                  <div className="text-[11px] font-semibold text-[var(--ui-muted)]">
                    AI支援
                  </div>
                  <div className="mt-2 text-[10px] font-semibold text-[var(--ui-muted)]">
                    デフォルトトーン
                  </div>
                  <select
                    className="ui-input mt-2 h-7 w-full text-[11px]"
                    value={aiDefaultInstruction}
                    onChange={(event) =>
                      setAiDefaultInstruction(event.target.value)
                    }
                  >
                    {aiToneOptions.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 text-[10px] font-semibold text-[var(--ui-muted)]">
                    禁止語
                  </div>
                  <textarea
                    className="ui-textarea mt-2 text-[11px]"
                    value={aiForbiddenWords}
                    onChange={(event) => setAiForbiddenWords(event.target.value)}
                    placeholder="カンマ区切りで入力"
                  />
                  <div className="mt-3 text-[10px] font-semibold text-[var(--ui-muted)]">
                    対象セクション
                  </div>
                  <div className="mt-2 text-[10px] text-[var(--ui-muted)]">
                    未選択の場合は全セクションが対象になります。
                  </div>
                  <div className="mt-2 flex flex-col gap-2 text-[11px]">
                    {sectionTypeOptions.length === 0 ? (
                      <div className="text-[10px] text-[var(--ui-muted)]">
                        セクションがありません。
                      </div>
                    ) : (
                      sectionTypeOptions.map((type) => {
                        const checked = aiTargetSectionTypes.includes(type);
                        return (
                          <label key={type} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? aiTargetSectionTypes.filter(
                                      (entry) => entry !== type
                                    )
                                  : [...aiTargetSectionTypes, type];
                                setAiTargetSectionTypes(next);
                              }}
                            />
                            <span>{type}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
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
