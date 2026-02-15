"use client";

import type { EditorSaveStatus } from "@/src/store/editorStore";

type StatusChipProps = {
  status: EditorSaveStatus;
  message?: string;
};

const statusLabel: Record<EditorSaveStatus, string> = {
  saved: "保存済み",
  dirty: "未保存の変更",
  saving: "保存中",
  error: "保存エラー",
  offline: "オフライン",
};

export default function StatusChip({ status, message }: StatusChipProps) {
  const isSaving = status === "saving";
  const isError = status === "error";
  const chipClassName =
    "ui-chip px-3 py-1 text-[11px]" +
    (status === "saved" ? " status-fade" : "") +
    (isError ? " status-shake" : "");

  return (
    <div className={chipClassName}>
      {isSaving ? (
        <span className="mr-2 inline-flex h-3 w-3 animate-spin rounded-full border border-[var(--ui-border)] border-t-[var(--ui-text)]" />
      ) : null}
      <span>{statusLabel[status]}</span>
      {message ? (
        <span className="ml-2 text-[var(--ui-muted)]">{message}</span>
      ) : null}
    </div>
  );
}
