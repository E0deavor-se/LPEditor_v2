import { create } from "zustand";
import { generateCampaignPlan } from "@/src/features/campaign/services/campaignAiService";
import {
  DEFAULT_CAMPAIGN_INPUT,
  type CampaignBuilderHandoff,
  type CampaignInput,
  type CampaignPlan,
  type CampaignStep,
} from "@/src/features/campaign/types/campaign";

export const CAMPAIGN_BUILDER_HANDOFF_STORAGE_KEY = "aurbit.campaign.builderHandoff";
export const CAMPAIGN_BUILDER_DIRECTION_STORAGE_KEY = "aurbit.campaign.builderDirection";

type CampaignErrors = Partial<Record<keyof CampaignInput, string>>;

type CampaignState = {
  step: CampaignStep;
  input: CampaignInput;
  errors: CampaignErrors;
  isGenerating: boolean;
  generationError: string | null;
  plan: CampaignPlan | null;
  builderHandoff: CampaignBuilderHandoff | null;
  builderCreativeDirection: CampaignPlan["creativeDirection"] | null;
  appliedToBuilder: boolean;
  setStep: (step: CampaignStep) => void;
  setField: <K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) => void;
  validate: () => boolean;
  generatePlan: () => Promise<void>;
  resetPlan: () => void;
  applyToBuilder: () => boolean;
  refreshBuilderHandoff: () => void;
  saveCreativeDirectionForBuilder: () => boolean;
};

const validateRequired = (input: CampaignInput): CampaignErrors => {
  const nextErrors: CampaignErrors = {};
  const requiredFields: Array<keyof CampaignInput> = [
    "campaignName",
    "brandName",
    "industry",
    "campaignType",
    "goal",
    "rewardType",
    "rewardValue",
    "conditions",
    "periodStart",
    "periodEnd",
  ];

  requiredFields.forEach((field) => {
    const value = input[field];
    if (typeof value === "string" && value.trim().length === 0) {
      nextErrors[field] = "必須入力です。";
    }
  });

  if (
    input.periodStart.trim().length > 0 &&
    input.periodEnd.trim().length > 0 &&
    input.periodStart > input.periodEnd
  ) {
    nextErrors.periodEnd = "終了日は開始日以降にしてください。";
  }

  return nextErrors;
};

export const readCampaignBuilderHandoffFromStorage = (): CampaignBuilderHandoff | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CAMPAIGN_BUILDER_HANDOFF_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as CampaignBuilderHandoff;
  } catch {
    return null;
  }
};

export const readCampaignBuilderDirectionFromStorage = (): CampaignPlan["creativeDirection"] | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CAMPAIGN_BUILDER_DIRECTION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as CampaignPlan["creativeDirection"];
  } catch {
    return null;
  }
};

const saveBuilderHandoff = (value: CampaignBuilderHandoff) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CAMPAIGN_BUILDER_HANDOFF_STORAGE_KEY, JSON.stringify(value));
};

const saveBuilderDirection = (value: CampaignPlan["creativeDirection"]) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CAMPAIGN_BUILDER_DIRECTION_STORAGE_KEY, JSON.stringify(value));
};

const makeBuilderHandoff = (
  input: CampaignInput,
  plan: CampaignPlan,
): CampaignBuilderHandoff => ({
  lpStructure: plan.lpStructure,
  heroHeadline: plan.copyDraft.heroHeadline,
  heroSubcopy: plan.copyDraft.heroSubcopy,
  cta: plan.copyDraft.cta,
  creativeDirection: plan.creativeDirection,
  sourceInput: input,
  generatedAt: new Date().toISOString(),
});

export const useCampaignStore = create<CampaignState>((set, get) => ({
  step: "input",
  input: DEFAULT_CAMPAIGN_INPUT,
  errors: {},
  isGenerating: false,
  generationError: null,
  plan: null,
  builderHandoff: readCampaignBuilderHandoffFromStorage(),
  builderCreativeDirection: readCampaignBuilderDirectionFromStorage(),
  appliedToBuilder: false,
  setStep: (step) => set({ step }),
  setField: (key, value) => {
    set((state) => ({
      input: {
        ...state.input,
        [key]: value,
      },
      errors: {
        ...state.errors,
        [key]: undefined,
      },
      generationError: null,
    }));
  },
  validate: () => {
    const nextErrors = validateRequired(get().input);
    set({ errors: nextErrors });
    return Object.keys(nextErrors).length === 0;
  },
  generatePlan: async () => {
    const isValid = get().validate();
    if (!isValid) {
      set({ step: "input" });
      return;
    }

    set({
      step: "analyze",
      isGenerating: true,
      generationError: null,
      appliedToBuilder: false,
    });

    try {
      const input = get().input;
      const plan = await generateCampaignPlan(input);
      set({
        plan,
        step: "review",
        isGenerating: false,
      });
    } catch (error) {
      set({
        isGenerating: false,
        generationError:
          error instanceof Error ? error.message : "キャンペーン分析に失敗しました。",
        step: "input",
      });
    }
  },
  resetPlan: () => {
    set({
      plan: null,
      generationError: null,
      step: "input",
      appliedToBuilder: false,
    });
  },
  applyToBuilder: () => {
    const { input, plan } = get();
    if (!plan) {
      return false;
    }
    const handoff = makeBuilderHandoff(input, plan);
    saveBuilderHandoff(handoff);
    set({
      builderHandoff: handoff,
      appliedToBuilder: true,
      step: "apply",
    });
    return true;
  },
  refreshBuilderHandoff: () => {
    const handoff = readCampaignBuilderHandoffFromStorage();
    set({
      builderHandoff: handoff,
      appliedToBuilder: Boolean(handoff),
    });
  },
  saveCreativeDirectionForBuilder: () => {
    const handoff = get().builderHandoff;
    if (!handoff) {
      return false;
    }
    saveBuilderDirection(handoff.creativeDirection);
    set({
      builderCreativeDirection: handoff.creativeDirection,
    });
    return true;
  },
}));
