"use client";

import { useEffect, useMemo, useState } from "react";
import { diffWords, type DiffToken } from "@/src/lib/ai/diff";
import { guardAiRewrite } from "@/src/lib/ai/guardrails";
import { mockProvider } from "@/src/lib/ai/mockProvider";
import { useEditorStore } from "@/src/store/editorStore";

const PRESET_CHIPS = ["短く", "わかりやすく", "より丁寧に", "親しみやすく"];

const parseForbiddenWords = (value: string) =>
  value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

type AiAssistPanelProps = {
  open: boolean;
  targetLabel: string;
  originalText: string;
  onApply: (text: string) => void;
  onClose: () => void;
};

const renderDiff = (tokens: DiffToken[], mode: "before" | "after") =>
  tokens.map((token, index) => {
    if (token.type === "equal") {
      return <span key={`${mode}-eq-${index}`}>{token.text}</span>;
    }
    if (mode === "before" && token.type === "delete") {
      return (
        <span
          key={`${mode}-rm-${index}`}
          className="rounded bg-rose-100/70 px-0.5 text-rose-700 line-through"
        >
          {token.text}
        </span>
      );
    }
    if (mode === "after" && token.type === "insert") {
      return (
        <span
          key={`${mode}-add-${index}`}
          className="rounded bg-emerald-100/70 px-0.5 text-emerald-700"
        >
          {token.text}
        </span>
      );
    }
    return null;
  });

export default function AiAssistPanel({
  open,
  targetLabel,
  originalText,
  onApply,
  onClose,
}: AiAssistPanelProps) {
  const setPreviewBusy = useEditorStore((state) => state.setPreviewBusy);
  const aiDefaultInstruction = useEditorStore(
    (state) => state.aiDefaultInstruction
  );
  const aiForbiddenWords = useEditorStore((state) => state.aiForbiddenWords);
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setInstruction(aiDefaultInstruction || "");
      setProposal("");
      setError(null);
    }
  }, [open, originalText, targetLabel, aiDefaultInstruction]);

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
      const response = await mockProvider.rewrite({
        text: originalText,
        instruction,
        context: { fieldLabel: targetLabel },
      });
      const forbiddenWords = parseForbiddenWords(aiForbiddenWords);
      const forbiddenHit = forbiddenWords.find((word) =>
        response.text.includes(word)
      );
      if (forbiddenHit) {
        setProposal("");
        setError(`禁止語「${forbiddenHit}」が含まれています。`);
        return;
      }
      const guard = guardAiRewrite(originalText, response.text);
      if (!guard.ok) {
        setProposal("");
        setError(guard.error);
        return;
      }
      setProposal(guard.text);
    } catch {
      setProposal("");
      setError("提案の生成に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
      setPreviewBusy(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="ui-panel w-full max-w-3xl p-[var(--ui-space-4)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-[var(--ui-text)]">AI提案</div>
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
        <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-[var(--ui-text)]">目的</div>
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="ui-button ui-button-primary h-9 px-3 text-[11px]"
                disabled={isLoading}
                onClick={handleGenerate}
              >
                提案を生成
              </button>
              {isLoading ? (
                <span className="text-xs text-[var(--ui-muted)]">生成中...</span>
              ) : null}
            </div>
            {error ? (
              <div className="rounded-md border border-rose-200/60 bg-rose-50/70 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}
            <div>
              <div className="text-sm font-semibold text-[var(--ui-text)]">提案結果</div>
              <textarea
                className="ui-textarea mt-2"
                value={proposal}
                readOnly
                placeholder="提案がここに表示されます"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-[var(--ui-text)]">差分</div>
              <div className="mt-2 rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-3 text-xs text-[var(--ui-text)]">
                {proposal ? renderDiff(diffTokens, "before") : "-"}
              </div>
              <div className="mt-3 rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] p-3 text-xs text-[var(--ui-text)]">
                {proposal ? renderDiff(diffTokens, "after") : "-"}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
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
  );
}
