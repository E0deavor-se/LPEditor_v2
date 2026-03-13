import type {
  CampaignGoal,
  CampaignIndustry,
  CampaignInput,
  CampaignRewardType,
  CampaignTone,
  CampaignType,
} from "@/src/features/campaign/types/campaign";

type Props = {
  value: CampaignInput;
  errors: Partial<Record<keyof CampaignInput, string>>;
  isGenerating: boolean;
  onFieldChange: <K extends keyof CampaignInput>(key: K, next: CampaignInput[K]) => void;
  onSubmit: () => void;
};

const inputClass =
  "h-8 rounded border border-[var(--ui-border)] bg-[var(--ui-bg)] px-2 text-[11px] text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)]";

const sectionTitleClass = "text-[12px] font-semibold text-[var(--ui-text)]";

const selectLabels = {
  industry: {
    retail: "小売",
    food: "飲食",
    beauty: "美容",
    electronics: "家電",
    finance: "金融",
    public: "自治体 / 公共",
  },
  campaignType: {
    reward: "還元",
    coupon: "クーポン",
    lottery: "抽選",
    quick_chance: "クイックチャンス",
    municipality: "自治体キャンペーン",
    collaboration: "コラボキャンペーン",
  },
  goal: {
    acquisition: "新規獲得",
    retention: "リピート促進",
    store_visit: "来店促進",
    sales: "売上拡大",
  },
  rewardType: {
    points: "ポイント還元",
    discount: "割引",
    gift: "景品",
    cashback: "キャッシュバック",
  },
  tone: {
    friendly: "親しみやすい",
    premium: "プレミアム",
    corporate: "フォーマル",
    energetic: "元気・賑やか",
    seasonal: "季節感あり",
  },
} as const;

const renderError = (value?: string) => {
  if (!value) {
    return null;
  }
  return <p className="mt-1 text-[10px] text-rose-500">{value}</p>;
};

export default function CampaignForm({
  value,
  errors,
  isGenerating,
  onFieldChange,
  onSubmit,
}: Props) {
  return (
    <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
      <h2 className="text-[14px] font-semibold text-[var(--ui-text)]">キャンペーン内容入力</h2>
      <p className="mt-1 text-[11px] text-[var(--ui-muted)]">
        必須項目を入力すると、AIがLP構成・コピー案・ビジュアルの方向性を生成します。
      </p>
      <p className="mt-1 text-[10px] text-[var(--ui-muted)]">* は必須入力です。</p>

      <section className="mt-4">
        <h3 className={sectionTitleClass}>基本情報</h3>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <label className="text-[11px] text-[var(--ui-text)]">
            キャンペーン名 *
            <input
              className={`${inputClass} mt-1 w-full`}
              value={value.campaignName}
              placeholder="例：春の新生活キャンペーン"
              onChange={(e) => onFieldChange("campaignName", e.target.value)}
            />
            {renderError(errors.campaignName)}
          </label>

          <label className="text-[11px] text-[var(--ui-text)]">
            ブランド名 *
            <input
              className={`${inputClass} mt-1 w-full`}
              value={value.brandName}
              placeholder="例：au PAY"
              onChange={(e) => onFieldChange("brandName", e.target.value)}
            />
            {renderError(errors.brandName)}
          </label>

          <label className="text-[11px] text-[var(--ui-text)]">
            業種 *
            <select
              className={`${inputClass} mt-1 w-full`}
              value={value.industry}
              onChange={(e) => onFieldChange("industry", e.target.value as CampaignIndustry)}
            >
              <option value="retail">{selectLabels.industry.retail}</option>
              <option value="food">{selectLabels.industry.food}</option>
              <option value="beauty">{selectLabels.industry.beauty}</option>
              <option value="electronics">{selectLabels.industry.electronics}</option>
              <option value="finance">{selectLabels.industry.finance}</option>
              <option value="public">{selectLabels.industry.public}</option>
            </select>
          </label>

          <label className="text-[11px] text-[var(--ui-text)]">
            キャンペーン種類 *
            <select
              className={`${inputClass} mt-1 w-full`}
              value={value.campaignType}
              onChange={(e) => onFieldChange("campaignType", e.target.value as CampaignType)}
            >
              <option value="reward">{selectLabels.campaignType.reward}</option>
              <option value="coupon">{selectLabels.campaignType.coupon}</option>
              <option value="lottery">{selectLabels.campaignType.lottery}</option>
              <option value="quick_chance">{selectLabels.campaignType.quick_chance}</option>
              <option value="municipality">{selectLabels.campaignType.municipality}</option>
              <option value="collaboration">{selectLabels.campaignType.collaboration}</option>
            </select>
          </label>

          <label className="text-[11px] text-[var(--ui-text)] md:col-span-2">
            キャンペーン目的 *
            <select
              className={`${inputClass} mt-1 w-full`}
              value={value.goal}
              onChange={(e) => onFieldChange("goal", e.target.value as CampaignGoal)}
            >
              <option value="acquisition">{selectLabels.goal.acquisition}</option>
              <option value="retention">{selectLabels.goal.retention}</option>
              <option value="store_visit">{selectLabels.goal.store_visit}</option>
              <option value="sales">{selectLabels.goal.sales}</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mt-5 border-t border-[var(--ui-border)] pt-4">
        <h3 className={sectionTitleClass}>キャンペーン特典</h3>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <label className="text-[11px] text-[var(--ui-text)]">
            特典タイプ *
            <select
              className={`${inputClass} mt-1 w-full`}
              value={value.rewardType}
              onChange={(e) => onFieldChange("rewardType", e.target.value as CampaignRewardType)}
            >
              <option value="points">{selectLabels.rewardType.points}</option>
              <option value="discount">{selectLabels.rewardType.discount}</option>
              <option value="gift">{selectLabels.rewardType.gift}</option>
              <option value="cashback">{selectLabels.rewardType.cashback}</option>
            </select>
          </label>

          <label className="text-[11px] text-[var(--ui-text)]">
            特典内容 *
            <input
              className={`${inputClass} mt-1 w-full`}
              value={value.rewardValue}
              placeholder="例：最大20%ポイント還元 / 500円割引クーポン"
              onChange={(e) => onFieldChange("rewardValue", e.target.value)}
            />
            {renderError(errors.rewardValue)}
          </label>
        </div>
      </section>

      <section className="mt-5 border-t border-[var(--ui-border)] pt-4">
        <h3 className={sectionTitleClass}>参加条件・期間</h3>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <label className="text-[11px] text-[var(--ui-text)] md:col-span-2">
            参加条件 *
            <textarea
              className="mt-1 min-h-20 w-full rounded border border-[var(--ui-border)] bg-[var(--ui-bg)] px-2 py-1.5 text-[11px] text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)]"
              value={value.conditions}
              placeholder="例：200円以上の決済が対象 / アプリ提示で適用"
              onChange={(e) => onFieldChange("conditions", e.target.value)}
            />
            {renderError(errors.conditions)}
          </label>

          <label className="text-[11px] text-[var(--ui-text)]">
            開始日 *
            <input
              type="date"
              className={`${inputClass} mt-1 w-full`}
              value={value.periodStart}
              onChange={(e) => onFieldChange("periodStart", e.target.value)}
            />
            {renderError(errors.periodStart)}
          </label>

          <label className="text-[11px] text-[var(--ui-text)]">
            終了日 *
            <input
              type="date"
              className={`${inputClass} mt-1 w-full`}
              value={value.periodEnd}
              onChange={(e) => onFieldChange("periodEnd", e.target.value)}
            />
            {renderError(errors.periodEnd)}
          </label>

          <label className="text-[11px] text-[var(--ui-text)] md:col-span-2">
            還元上限・利用上限
            <input
              className={`${inputClass} mt-1 w-full`}
              value={value.limit}
              placeholder="例：上限1000ポイント / 1日1回まで"
              onChange={(e) => onFieldChange("limit", e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="mt-5 border-t border-[var(--ui-border)] pt-4">
        <h3 className={sectionTitleClass}>ターゲット・トーン</h3>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <label className="text-[11px] text-[var(--ui-text)]">
            想定ターゲット
            <input
              className={`${inputClass} mt-1 w-full`}
              value={value.targetAudience}
              placeholder="例：20〜40代女性 / 近隣の会社員"
              onChange={(e) => onFieldChange("targetAudience", e.target.value)}
            />
          </label>

          <label className="text-[11px] text-[var(--ui-text)]">
            LPトーン
            <select
              className={`${inputClass} mt-1 w-full`}
              value={value.tone}
              onChange={(e) => onFieldChange("tone", e.target.value as CampaignTone)}
            >
              <option value="friendly">{selectLabels.tone.friendly}</option>
              <option value="premium">{selectLabels.tone.premium}</option>
              <option value="corporate">{selectLabels.tone.corporate}</option>
              <option value="energetic">{selectLabels.tone.energetic}</option>
              <option value="seasonal">{selectLabels.tone.seasonal}</option>
            </select>
          </label>

          <label className="text-[11px] text-[var(--ui-text)] md:col-span-2">
            カラーイメージ
            <input
              className={`${inputClass} mt-1 w-full`}
              value={value.colorPreference}
              placeholder="例：オレンジ系 / 高級感のある黒"
              onChange={(e) => onFieldChange("colorPreference", e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="mt-5 border-t border-[var(--ui-border)] pt-4">
        <h3 className={sectionTitleClass}>参考情報</h3>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <label className="text-[11px] text-[var(--ui-text)] md:col-span-2">
            参考LP
            <input
              className={`${inputClass} mt-1 w-full`}
              value={value.referenceLpUrl}
              placeholder="参考にしたいLPのURLがあれば入力"
              onChange={(e) => onFieldChange("referenceLpUrl", e.target.value)}
            />
          </label>
        </div>
      </section>

      <div className="mt-4 flex items-center justify-end">
        <button
          type="button"
          disabled={isGenerating}
          onClick={onSubmit}
          className="h-8 rounded bg-[var(--ui-primary)] px-3 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isGenerating ? "生成中..." : "LP構成を生成"}
        </button>
      </div>
    </div>
  );
}
