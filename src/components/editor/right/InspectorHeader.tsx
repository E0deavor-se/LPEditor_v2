"use client";

import { Eye, EyeOff, Lock, RotateCcw, Unlock } from "lucide-react";
import ToggleIconButton from "@/src/components/editor/right/primitives/ToggleIconButton";
import { useI18n } from "@/src/i18n";

type InspectorHeaderProps = {
  breadcrumb: string[];
  isSection: boolean;
  isLocked: boolean;
  isVisible: boolean;
  disableLock: boolean;
  onToggleLock: () => void;
  onToggleVisible: () => void;
  onResetPage: () => void;
};

export default function InspectorHeader({
  breadcrumb,
  isSection,
  isLocked,
  isVisible,
  disableLock,
  onToggleLock,
  onToggleVisible,
  onResetPage,
}: InspectorHeaderProps) {
  const t = useI18n();
  return (
    <div className="border-b border-[var(--ui-border)]/60 px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[12px] text-[var(--ui-muted)]">
          {breadcrumb.map((item, index) => (
            <span key={`${item}-${index}`}>
              {item}
              {index < breadcrumb.length - 1 ? " / " : ""}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {isSection ? (
            <>
              <ToggleIconButton
                active={isVisible}
                ariaLabel={
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
              </ToggleIconButton>
              <ToggleIconButton
                active={isLocked}
                ariaLabel={
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
              </ToggleIconButton>
            </>
          ) : (
            <button
              type="button"
              className="ui-button h-7 px-2 text-[10px]"
              aria-label={t.inspector.header.reset}
              title={t.inspector.header.reset}
              onClick={onResetPage}
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>
      {isSection && isLocked ? (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--ui-muted)]">
          <Lock size={12} />
          {t.inspector.header.locked}
        </div>
      ) : null}
    </div>
  );
}
