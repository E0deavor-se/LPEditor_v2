import CampaignCopyPreview from "@/src/features/campaign/components/CampaignCopyPreview";
import CampaignDirectionPreview from "@/src/features/campaign/components/CampaignDirectionPreview";
import CampaignStructureList from "@/src/features/campaign/components/CampaignStructureList";
import type { CampaignPlan } from "@/src/features/campaign/types/campaign";

const campaignTypeLabels: Record<CampaignPlan["campaignSummary"]["campaignType"], string> = {
  reward: "還元",
  coupon: "クーポン",
  lottery: "抽選",
  quick_chance: "クイックチャンス",
  municipality: "自治体キャンペーン",
  collaboration: "コラボキャンペーン",
};

const industryLabels: Record<CampaignPlan["campaignSummary"]["industry"], string> = {
  retail: "小売",
  food: "飲食",
  beauty: "美容",
  electronics: "家電",
  finance: "金融",
  public: "自治体 / 公共",
};

const goalLabels: Record<CampaignPlan["campaignSummary"]["goal"], string> = {
  acquisition: "新規獲得",
  retention: "リピート促進",
  store_visit: "来店促進",
  sales: "売上拡大",
};

type Props = {
  plan: CampaignPlan;
};

export default function CampaignPlanPreview({ plan }: Props) {
  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
        <h3 className="text-[13px] font-semibold text-[var(--ui-text)]">キャンペーン概要</h3>
        <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
          <div className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5">
            <div className="text-[10px] text-[var(--ui-muted)]">キャンペーン種類</div>
            <div className="mt-1 text-[var(--ui-text)]">
              {campaignTypeLabels[plan.campaignSummary.campaignType]}
            </div>
          </div>
          <div className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5">
            <div className="text-[10px] text-[var(--ui-muted)]">業種</div>
            <div className="mt-1 text-[var(--ui-text)]">
              {industryLabels[plan.campaignSummary.industry]}
            </div>
          </div>
          <div className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5">
            <div className="text-[10px] text-[var(--ui-muted)]">キャンペーン目的</div>
            <div className="mt-1 text-[var(--ui-text)]">{goalLabels[plan.campaignSummary.goal]}</div>
          </div>
        </div>
      </section>

      <CampaignStructureList structure={plan.lpStructure} />
      <CampaignCopyPreview copy={plan.copyDraft} />
      <CampaignDirectionPreview direction={plan.creativeDirection} />
    </div>
  );
}
