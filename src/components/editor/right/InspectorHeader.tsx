"use client";

import { Copy, Eye, EyeOff, Lock, PencilLine, RotateCcw, Trash2, Unlock } from "lucide-react";
import SelectField from "@/src/components/editor/right/primitives/SelectField";
import { useI18n } from "@/src/i18n";

type InspectorScope = "page" | "section" | "element";

type InspectorHeaderProps = {
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
  const scopeOptions: Array<{ key: InspectorScope; label: string; disabled?: boolean }> = [
    { key: "page", label: "ページ" },
    { key: "section", label: "セクション", disabled: !canSelectSection },
    { key: "element", label: "要素", disabled: !canSelectElement },
  ];
  const isRenameAvailable = Boolean(onRenameSection);
  return (
    <div className="border-b border-[var(--ui-border)]/60 bg-[var(--surface)] px-3 py-2">
      <div className="flex flex-col gap-2">
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
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-semibold text-[var(--ui-muted)]">
              クイック操作
            </span>
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
              <button
                type="button"
                className="ui-button ui-button-ghost h-8 w-8 px-0 text-[10px]"
                aria-label={t.inspector.header.reset}
                title={t.inspector.header.reset}
                onClick={onResetPage}
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--ui-border)]/60 bg-[var(--surface-2)] px-2 py-1">
          <div className="text-[10px] font-semibold text-[var(--ui-muted)]">
            {targetLabel}
          </div>
          <div className="min-w-0 flex-1">
            <SelectField
              value={targetValue ?? ""}
              ariaLabel={targetLabel}
              onChange={onTargetChange}
              disabled={targetDisabled}
            >
              {targetOptions.length > 0 ? (
                targetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              ) : (
                <option value="">--</option>
              )}
            </SelectField>
          </div>
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
    </div>
  );
}
