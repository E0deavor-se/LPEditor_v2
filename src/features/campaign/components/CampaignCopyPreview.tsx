import type { CampaignPlan } from "@/src/features/campaign/types/campaign";

type Props = {
  copy: CampaignPlan["copyDraft"];
};

export default function CampaignCopyPreview({ copy }: Props) {
  return (
    <section className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
      <h3 className="text-[13px] font-semibold text-[var(--ui-text)]">コピー案</h3>
      <div className="mt-3 space-y-2">
        <div className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5 text-[11px]">
          <div className="text-[10px] text-[var(--ui-muted)]">メイン見出し案</div>
          <div className="mt-1 font-semibold text-[var(--ui-text)]">{copy.heroHeadline}</div>
        </div>
        <div className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5 text-[11px]">
          <div className="text-[10px] text-[var(--ui-muted)]">サブコピー案</div>
          <div className="mt-1 text-[var(--ui-text)]">{copy.heroSubcopy}</div>
        </div>
        <div className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5 text-[11px]">
          <div className="text-[10px] text-[var(--ui-muted)]">CTA案</div>
          <div className="mt-1 text-[var(--ui-text)]">{copy.cta}</div>
        </div>
      </div>
    </section>
  );
}
