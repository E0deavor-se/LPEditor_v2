"use client";

import { useEffect, useState } from "react";
import type {
  CampaignType,
  CreativeDesignTaste,
  CreativeInputValues,
  CreativeTone,
} from "@/src/features/creative/types/document";

type Props = {
  initialValues: CreativeInputValues;
  isSubmitting: boolean;
  onSubmit: (values: CreativeInputValues) => void;
};

const inputClassName =
  "h-7 rounded border border-[var(--ui-border)] bg-[var(--ui-bg)] px-2 text-[11px] text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)] transition-colors";

export default function CreativeInputForm({ initialValues, isSubmitting, onSubmit }: Props) {
  const [form, setForm] = useState<CreativeInputValues>(initialValues);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const setField = <K extends keyof CreativeInputValues>(
    key: K,
    value: CreativeInputValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form
      className="grid gap-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        <label className="grid gap-1 text-[11px]">
          Campaign Type
          <select
            className={inputClassName}
            value={form.campaignType}
            onChange={(event) => setField("campaignType", event.target.value as CampaignType)}
          >
            <option value="coupon">Coupon</option>
            <option value="points">Points</option>
            <option value="cashback">Cashback</option>
            <option value="event">Event</option>
          </select>
        </label>
        <label className="grid gap-1 text-[11px]">
          Industry
          <input
            className={inputClassName}
            value={form.industry}
            onChange={(event) => setField("industry", event.target.value)}
          />
        </label>
      </div>

      <label className="grid gap-1 text-[11px]">
        Company Name
        <input
          className={inputClassName}
          value={form.companyName}
          onChange={(event) => setField("companyName", event.target.value)}
        />
      </label>

      <label className="grid gap-1 text-[11px]">
        Main Copy
        <input
          className={inputClassName}
          value={form.mainCopy}
          onChange={(event) => setField("mainCopy", event.target.value)}
        />
      </label>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        <label className="grid gap-1 text-[11px]">
          Reward Text
          <input
            className={inputClassName}
            value={form.rewardText}
            onChange={(event) => setField("rewardText", event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-[11px]">
          Limit Text
          <input
            className={inputClassName}
            value={form.limitText}
            onChange={(event) => setField("limitText", event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-[11px]">
          Period Text
          <input
            className={inputClassName}
            value={form.periodText}
            onChange={(event) => setField("periodText", event.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        <label className="grid gap-1 text-[11px]">
          Tone
          <select
            className={inputClassName}
            value={form.tone}
            onChange={(event) => setField("tone", event.target.value as CreativeTone)}
          >
            <option value="formal">Formal</option>
            <option value="friendly">Friendly</option>
            <option value="bold">Bold</option>
            <option value="premium">Premium</option>
          </select>
        </label>

        <label className="grid gap-1 text-[11px]">
          Design Taste
          <select
            className={inputClassName}
            value={form.designTaste}
            onChange={(event) => setField("designTaste", event.target.value as CreativeDesignTaste)}
          >
            <option value="clean">Clean</option>
            <option value="playful">Playful</option>
            <option value="minimal">Minimal</option>
            <option value="impact">Impact</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        <label className="grid gap-1 text-[11px]">
          Brand Primary Color
          <input
            className="h-7 rounded border border-[var(--ui-border)] bg-[var(--ui-bg)] px-1"
            type="color"
            value={form.brandPrimaryColor}
            onChange={(event) => setField("brandPrimaryColor", event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-[11px]">
          Brand Secondary Color
          <input
            className="h-7 rounded border border-[var(--ui-border)] bg-[var(--ui-bg)] px-1"
            type="color"
            value={form.brandSecondaryColor}
            onChange={(event) => setField("brandSecondaryColor", event.target.value)}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-3 h-8 rounded bg-[var(--ui-primary)] px-4 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            生成中...
          </span>
        ) : "クリエイティブを生成"}
      </button>
    </form>
  );
}
