import type { CampaignPlan } from "@/src/features/campaign/types/campaign";

type Props = {
  direction: CampaignPlan["creativeDirection"];
};

const toneLabels: Record<CampaignPlan["creativeDirection"]["tone"], string> = {
  friendly: "親しみやすい",
  premium: "プレミアム",
  corporate: "フォーマル",
  energetic: "元気・賑やか",
  seasonal: "季節感あり",
};

const styleLabels: Record<string, string> = {
  retail_campaign: "販促訴求型",
  lifestyle_food: "ライフスタイル訴求型",
  beauty_clean: "美容・クリーン系",
  tech_modern: "テック・モダン系",
  trust_finance: "信頼感重視",
  public_information: "公共情報訴求",
};

const strategyLabels: Record<string, string> = {
  benefit_push: "特典訴求",
  urgency_push: "緊急性訴求",
  trust_push: "信頼訴求",
  simple_cta: "シンプル導線",
};

export default function CampaignDirectionPreview({ direction }: Props) {
  return (
    <section className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
      <h3 className="text-[13px] font-semibold text-[var(--ui-text)]">クリエイティブ方針</h3>
      <div className="mt-3 grid gap-2 text-[11px]">
        <div className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5">
          <div className="text-[10px] text-[var(--ui-muted)]">トーン</div>
          <div className="mt-1 text-[var(--ui-text)]">{toneLabels[direction.tone]}</div>
        </div>
        <div className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5">
          <div className="text-[10px] text-[var(--ui-muted)]">デザイン方針</div>
          <div className="mt-1 text-[var(--ui-text)]">{styleLabels[direction.style] ?? direction.style}</div>
        </div>
        <div className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5">
          <div className="text-[10px] text-[var(--ui-muted)]">推奨生成パターン</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {direction.preferredStrategies.map((entry) => (
              <span
                key={entry}
                className="rounded-full border border-[var(--ui-border)] px-2 py-0.5 text-[10px] text-[var(--ui-text)]"
              >
                {strategyLabels[entry] ?? entry}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
