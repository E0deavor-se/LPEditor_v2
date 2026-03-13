import type { CampaignPlan } from "@/src/features/campaign/types/campaign";

type Props = {
  structure: CampaignPlan["lpStructure"];
};

const structureLabels: Record<string, string> = {
  hero: "メインビジュアル",
  campaign_period: "キャンペーン期間",
  campaign_overview: "キャンペーン概要",
  target_stores: "対象店舗",
  how_to_use: "参加方法 / 利用方法",
  faq: "FAQ",
  notes: "注意事項",
  cta: "CTA",
};

export default function CampaignStructureList({ structure }: Props) {
  return (
    <section className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
      <h3 className="text-[13px] font-semibold text-[var(--ui-text)]">LP構成案</h3>
      {structure.length === 0 ? (
        <p className="mt-2 text-[11px] text-[var(--ui-muted)]">まだ構成案が生成されていません。</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {structure.map((entry, index) => (
          <li
            key={`${entry}_${index}`}
            className="flex items-center gap-2 text-[11px] text-[var(--ui-text)]"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ui-primary)]/15 text-[10px] font-semibold text-[var(--ui-primary)]">
              {index + 1}
            </span>
            <span>{structureLabels[entry] ?? entry}</span>
          </li>
          ))}
        </ol>
      )}
    </section>
  );
}
