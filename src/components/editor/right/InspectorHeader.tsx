"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Lock,
  MoreHorizontal,
  PencilLine,
  Trash2,
  Unlock,
} from "lucide-react";
import { useI18n } from "@/src/i18n";
import SelectField from "@/src/components/editor/right/primitives/SelectField";

type InspectorScope = "page" | "section" | "element";

type InspectorHeaderProps = {
  targetName: string;
  breadcrumb: string[];
  scope: InspectorScope;
  canSelectSection: boolean;
  canSelectElement: boolean;
  targetLabel: string;
  targetOptions: Array<{ value: string; label: string }>;
  targetValue?: string;
  targetDisabled?: boolean;
  onScopeChange: (scope: InspectorScope) => void;
  onTargetChange: (value: string) => void;
  isSection: boolean;
  isLocked: boolean;
  isVisible: boolean;
  disableLock: boolean;
  onToggleLock: () => void;
  onToggleVisible: () => void;
  onDuplicateSection: () => void;
  onDeleteSection: () => void;
  onRenameSection?: () => void;
  onResetPage: () => void;
};

export default function InspectorHeader({
  targetName,
  breadcrumb,
  scope,
  canSelectSection,
  canSelectElement,
  targetLabel,
  targetOptions = [],
  targetValue,
  targetDisabled,
  onScopeChange,
  onTargetChange,
  isSection,
  isLocked,
  isVisible,
  disableLock,
  onToggleLock,
  onToggleVisible,
  onDuplicateSection,
  onDeleteSection,
  onRenameSection,
  onResetPage,
}: InspectorHeaderProps) {
  const t = useI18n();
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const pageMenuRef = useRef<HTMLDivElement | null>(null);
  const scopeOptions: Array<{ key: InspectorScope; label: string; disabled?: boolean }> = [
    { key: "page", label: "ページ" },
    { key: "section", label: "セクション", disabled: !canSelectSection },
    { key: "element", label: "要素", disabled: !canSelectElement },
  ];
  const isRenameAvailable = Boolean(onRenameSection);
  const hasTargetOptions = scope === "element" && targetOptions.length > 0;

  useEffect(() => {
    if (!isPageMenuOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!pageMenuRef.current?.contains(event.target as Node)) {
        setIsPageMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPageMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPageMenuOpen]);

  return (
    <div className="border-b border-[var(--ui-border)]/60 bg-[var(--surface)] px-4 py-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-[var(--ui-text)]">
              {targetName}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-[var(--ui-muted)]">
              {breadcrumb.map((item, index) => (
                <span key={`${item}-${index}`} className="flex items-center gap-1">
                  <span>{item}</span>
                  {index < breadcrumb.length - 1 ? (
                    <span className="opacity-60">/</span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isSection ? (
              <>
                <button
                  type="button"
                  className="ui-button ui-button-ghost h-8 w-8 px-0 text-[10px]"
                  aria-label="複製"
                  title="複製"
                  onClick={onDuplicateSection}
                >
                  <Copy size={14} />
                </button>
                <button
                  type="button"
                  className="ui-button ui-button-ghost h-8 w-8 px-0 text-[10px]"
                  aria-label="名前変更"
                  title={isRenameAvailable ? "名前変更" : "名前変更 (準備中)"}
                  onClick={() => onRenameSection?.()}
                  disabled={!isRenameAvailable}
                >
                  <PencilLine size={14} />
                </button>
                <button
                  type="button"
                  className="ui-button ui-button-ghost h-8 w-8 px-0 text-[10px]"
                  aria-label={
                    isVisible
                      ? t.inspector.header.hideSection
                      : t.inspector.header.showSection
                  }
                  title={
                    isVisible
                      ? t.inspector.header.hideSection
                      : t.inspector.header.showSection
                  }
                  onClick={onToggleVisible}
                >
                  {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  type="button"
                  className="ui-button ui-button-ghost h-8 w-8 px-0 text-[10px]"
                  aria-label={
                    isLocked ? t.inspector.header.unlock : t.inspector.header.lock
                  }
                  title={
                    disableLock
                      ? t.inspector.header.lockedSection
                      : isLocked
                      ? t.inspector.header.unlock
                      : t.inspector.header.lock
                  }
                  disabled={disableLock}
                  onClick={onToggleLock}
                >
                  {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <span className="mx-1 h-4 w-px bg-[var(--ui-border)]" />
                <button
                  type="button"
                  className="ui-button ui-button-ghost h-8 w-8 px-0 text-[10px] text-rose-500 hover:text-rose-400"
                  aria-label="削除"
                  title="削除"
                  onClick={onDeleteSection}
                >
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <div ref={pageMenuRef} className="relative">
                <button
                  type="button"
                  className="ui-button ui-button-ghost h-8 w-8 px-0 text-[10px]"
                  aria-label="メニュー"
                  title="メニュー"
                  onClick={() => setIsPageMenuOpen((current) => !current)}
                >
                  <MoreHorizontal size={14} />
                </button>
                {isPageMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-[var(--ui-border)] bg-[var(--surface)]/95 p-1 text-[var(--ui-text)] shadow-[var(--ui-shadow-md)] backdrop-blur"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="ui-menu-item"
                      onClick={() => {
                        setIsPageMenuOpen(false);
                        setIsResetConfirmOpen(true);
                      }}
                    >
                      {t.inspector.header.reset}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border border-[var(--ui-border)]/60 bg-[var(--surface-2)] p-1 text-[11px]">
            {scopeOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={
                  "h-6 rounded-sm px-2 transition " +
                  (scope === option.key
                    ? "bg-[var(--ui-panel)] text-[var(--ui-text)]"
                    : "text-[var(--ui-muted)] hover:text-[var(--ui-text)]")
                }
                aria-pressed={scope === option.key}
                disabled={option.disabled}
                onClick={() => onScopeChange(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {hasTargetOptions ? (
            <div className="flex min-w-[180px] items-center gap-2 rounded-md border border-[var(--ui-border)]/60 bg-[var(--surface-2)] px-2 py-1">
              <span className="text-[10px] font-semibold text-[var(--ui-muted)]">
                {targetLabel}
              </span>
              <SelectField
                value={targetValue}
                ariaLabel={targetLabel}
                onChange={(value) => onTargetChange(String(value))}
                disabled={targetDisabled}
              >
                {targetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1 text-[12px] text-[var(--ui-muted)]">
          {breadcrumb.map((item, index) => (
            <span key={`${item}-${index}`}>
              {item}
              {index < breadcrumb.length - 1 ? " > " : ""}
            </span>
          ))}
        </div>
      </div>
      {isSection && isLocked ? (
        <div className="mt-1 flex items-center gap-1 text-xs text-[var(--ui-muted)]">
          <Lock size={12} />
          {t.inspector.header.locked}
        </div>
      ) : null}
      {isResetConfirmOpen ? (
        <div className="fixed inset-0 z-50 ui-modal-overlay flex items-center justify-center px-4">
          <div className="ui-modal w-full max-w-sm p-4">
            <div className="text-sm font-semibold text-[var(--ui-text)]">
              ページをリセットしますか？
            </div>
            <p className="mt-2 text-xs text-[var(--ui-muted)]">
              この操作は取り消せません。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="ui-button h-8 px-3 text-[11px]"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="ui-button h-8 px-3 text-[11px]"
                onClick={() => {
                  setIsResetConfirmOpen(false);
                  onResetPage();
                }}
              >
                リセットする
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
