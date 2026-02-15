"use client";

import { useEffect, useMemo, useState } from "react";
import { diffWords, type DiffToken } from "@/src/lib/ai/diff";
import { validateProposal } from "@/src/lib/ai/guardrails";
import { getAiProvider } from "@/src/lib/ai/providerFactory";
import { useEditorStore } from "@/src/store/editorStore";
import { useThemeStore } from "@/src/store/themeStore";

const PRESET_CHIPS = ["短く", "わかりやすく", "より丁寧に", "訴求力を上げる"];

type AiAssistDrawerProps = {
  open: boolean;
  targetLabel: string;
  originalText: string;
  onApply: (text: string) => void;
  onClose: () => void;
};

const renderDiff = (tokens: DiffToken[]) =>
  tokens.map((token, index) => {
    if (token.type === "equal") {
      return <span key={`diff-eq-${index}`}>{token.text}</span>;
    }
    if (token.type === "insert") {
      return (
        <span
          key={`diff-in-${index}`}
          className="rounded bg-emerald-100/60 px-0.5 text-[var(--ui-text)]"
        >
          {token.text}
        </span>
      );
    }
    return (
      <span
        key={`diff-del-${index}`}
        className="rounded bg-rose-100/70 px-0.5 text-[var(--ui-text)] line-through"
      >
        {token.text}
      </span>
    );
  });

export default function AiAssistDrawer({
  open,
  targetLabel,
  originalText,
  onApply,
  onClose,
}: AiAssistDrawerProps) {
  const surfaceStyle = useThemeStore((state) => state.surfaceStyle);
  const setPreviewBusy = useEditorStore((state) => state.setPreviewBusy);
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLongLoading, setShowLongLoading] = useState(false);
  const provider = useMemo(() => getAiProvider(), []);
  const glassClass = surfaceStyle === "glass" ? "backdrop-blur-xl" : "";

  useEffect(() => {
    if (open) {
      setInstruction("");
      setProposal("");
      setError(null);
    }
  }, [open, originalText, targetLabel]);

  useEffect(() => {
    if (!isLoading) {
      setShowLongLoading(false);
      return;
    }
    const timer = setTimeout(() => setShowLongLoading(true), 1500);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const diffTokens = useMemo(() => {
    if (!proposal) {
      return [];
    }
    return diffWords(originalText, proposal);
  }, [originalText, proposal]);

  const handleGenerate = async () => {
    if (!originalText.trim()) {
      setError("テキストが空のため提案を生成できません。");
      return;
    }
    setIsLoading(true);
    setError(null);
    setPreviewBusy(true, "ai");
    try {
      const response = await provider.rewrite({
        text: originalText,
        instruction,
      });
      const validation = validateProposal(originalText, response.text);
      if (!validation.ok) {
        setProposal("");
        setError(validation.reason ?? "エラーが発生しました。");
        return;
      }
      setProposal(response.text);
    } catch (err) {
      setProposal("");
      if (err instanceof Error) {
        setError(err.message || "提案の生成に失敗しました。もう一度お試しください。");
      } else {
        setError("提案の生成に失敗しました。もう一度お試しください。");
      }
    } finally {
      setIsLoading(false);
      setPreviewBusy(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="AI提案を閉じる"
        onClick={onClose}
      />
      <div
        className={
          "ui-panel absolute inset-y-0 right-0 flex w-full max-w-[360px] flex-col rounded-none border-y-0 border-r-0 " +
          glassClass
        }
      >
        <div className="flex items-center justify-between border-b border-[var(--ui-border)] px-[var(--ui-space-3)] py-[var(--ui-space-2)]">
          <div>
            <div className="text-base font-semibold text-[var(--ui-text)]">
              AI提案
            </div>
            <div className="text-xs text-[var(--ui-muted)]">{targetLabel}</div>
          </div>
          <button
            type="button"
            className="ui-button h-8 px-3 text-[11px]"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
        <div className="flex-1 overflow-auto px-[var(--ui-space-3)] py-[var(--ui-space-3)] text-xs text-[var(--ui-muted)]">
          <div>
            <div className="text-sm font-semibold text-[var(--ui-text)]">
              目的
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESET_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="ui-chip"
                  onClick={() =>
                    setInstruction((current) =>
                      current ? `${current} / ${chip}` : chip
                    )
                  }
                >
                  {chip}
                </button>
              ))}
            </div>
            <textarea
              className="ui-textarea mt-2"
              placeholder="目的やトーンを入力"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
            />
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-[var(--ui-text)]">
              変更前
            </div>
            <textarea
              className="ui-textarea mt-2 text-[var(--ui-muted)]"
              value={originalText}
              readOnly
            />
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-[var(--ui-text)]">
              変更後
            </div>
            <textarea
              className="ui-textarea mt-2 text-[var(--ui-muted)]"
              value={proposal}
              readOnly
              placeholder="提案がここに表示されます"
            />
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-[var(--ui-text)]">差分</div>
            <div className="mt-2 rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-3 text-xs text-[var(--ui-text)]">
              {proposal ? renderDiff(diffTokens) : "-"}
            </div>
          </div>
          {error ? (
            <div className="mt-3 rounded-md border border-rose-200/60 bg-rose-50/70 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--ui-border)] px-[var(--ui-space-3)] py-[var(--ui-space-2)]">
          <button
            type="button"
            className="ui-button h-8 px-3 text-[11px]"
            disabled={isLoading}
            onClick={handleGenerate}
          >
            再提案
          </button>
          {showLongLoading ? (
            <span className="text-[11px] text-[var(--ui-muted)]">AI生成中...</span>
          ) : null}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="ui-button h-8 px-3 text-[11px]"
              onClick={onClose}
            >
              破棄
            </button>
            <button
              type="button"
              className="ui-button ui-button-primary h-8 px-3 text-[11px]"
              disabled={!proposal || Boolean(error)}
              onClick={() => {
                if (!proposal) {
                  return;
                }
                onApply(proposal);
                onClose();
              }}
            >
              採用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
