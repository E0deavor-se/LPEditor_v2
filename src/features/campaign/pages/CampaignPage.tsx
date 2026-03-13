"use client";

import { useRouter } from "next/navigation";
import CampaignForm from "@/src/features/campaign/components/CampaignForm";
import CampaignPlanPreview from "@/src/features/campaign/components/CampaignPlanPreview";
import { useCampaignStore } from "@/src/features/campaign/stores/useCampaignStore";

const steps = [
  { key: "input", label: "キャンペーン内容入力" },
  { key: "analyze", label: "AI分析" },
  { key: "review", label: "内容確認" },
  { key: "apply", label: "Builderへ反映" },
] as const;

export default function CampaignPage() {
  const router = useRouter();
  const step = useCampaignStore((s) => s.step);
  const input = useCampaignStore((s) => s.input);
  const errors = useCampaignStore((s) => s.errors);
  const isGenerating = useCampaignStore((s) => s.isGenerating);
  const generationError = useCampaignStore((s) => s.generationError);
  const plan = useCampaignStore((s) => s.plan);
  const setField = useCampaignStore((s) => s.setField);
  const setStep = useCampaignStore((s) => s.setStep);
  const generatePlan = useCampaignStore((s) => s.generatePlan);
  const resetPlan = useCampaignStore((s) => s.resetPlan);
  const applyToBuilder = useCampaignStore((s) => s.applyToBuilder);

  const currentIndex = steps.findIndex((entry) => entry.key === step);

  return (
    <main className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-4 rounded-lg border border-[var(--ui-border)] bg-[var(--surface-2)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[15px] font-semibold">キャンペーンLP作成アシスタント</h1>
              <p className="mt-1 text-[11px] text-[var(--ui-muted)]">
                キャンペーン内容を入力すると、LP構成・コピー案・メインビジュアルの方向性を自動生成します。作成した内容は Builder に反映できます。
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="h-7 rounded border border-[var(--ui-border)] px-3 text-[11px]"
                onClick={() => router.push("/editor?mode=layout")}
              >
                Builderに戻る
              </button>
            </div>
          </div>
          <nav className="mt-3 flex flex-wrap items-center gap-1">
            {steps.map((entry, index) => (
              <span
                key={entry.key}
                className={`inline-flex items-center rounded px-2 py-1 text-[10px] ${
                  index === currentIndex
                    ? "bg-[var(--ui-primary)] text-white"
                    : index < currentIndex
                    ? "text-[var(--ui-primary)]"
                    : "text-[var(--ui-muted)]"
                }`}
              >
                {index + 1}. {entry.label}
              </span>
            ))}
          </nav>
        </header>

        {step === "input" || step === "analyze" ? (
          <CampaignForm
            value={input}
            errors={errors}
            isGenerating={isGenerating}
            onFieldChange={setField}
            onSubmit={() => {
              void generatePlan();
            }}
          />
        ) : null}

        {step === "analyze" ? (
          <section className="mt-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
            <h2 className="text-[12px] font-semibold text-[var(--ui-text)]">AIがキャンペーン内容を分析しています</h2>
            <p className="mt-1 text-[11px] text-[var(--ui-muted)]">
              入力内容をもとに、LP構成・コピー案・メインビジュアルの方向性を生成しています。
            </p>
            <p className="mt-1 text-[10px] text-[var(--ui-muted)]">通常は数秒で完了します。</p>
          </section>
        ) : null}

        {generationError ? (
          <section className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-[11px] text-rose-600">
            {generationError}
          </section>
        ) : null}

        {step === "review" && plan ? (
          <section className="space-y-3">
            <section className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] p-3 text-[11px] text-[var(--ui-muted)]">
              AIが生成したLP構成案・コピー案・クリエイティブ方針を確認できます。内容を確認後、Builderへ反映できます。
            </section>
            <CampaignPlanPreview plan={plan} />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="h-8 rounded border border-[var(--ui-border)] px-3 text-[11px]"
                onClick={() => setStep("input")}
              >
                入力に戻る
              </button>
              <button
                type="button"
                className="h-8 rounded bg-[var(--ui-primary)] px-3 text-[11px] font-semibold text-white"
                onClick={() => {
                  const ok = applyToBuilder();
                  if (ok) {
                    router.push("/editor?mode=layout&source=campaign");
                  }
                }}
              >
                Builderへ反映
              </button>
            </div>
          </section>
        ) : null}

        {step === "apply" ? (
          <section className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
            <h2 className="text-[13px] font-semibold">Builderへ引き渡し完了</h2>
            <p className="mt-1 text-[11px] text-[var(--ui-muted)]">
              LP構成案とヒーローコピーを Builder 参照用ストアに保存しました。
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="h-8 rounded border border-[var(--ui-border)] px-3 text-[11px]"
                onClick={() => router.push("/editor?mode=layout&source=campaign")}
              >
                Builderを開く
              </button>
              <button
                type="button"
                className="h-8 rounded bg-[var(--ui-primary)] px-3 text-[11px] font-semibold text-white"
                onClick={resetPlan}
              >
                新しいキャンペーンを作成
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
