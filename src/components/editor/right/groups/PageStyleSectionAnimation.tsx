"use client";

import { Sparkles } from "lucide-react";
import Accordion from "@/src/components/editor/right/primitives/Accordion";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import SelectField from "@/src/components/editor/right/primitives/SelectField";
import type { PageBaseStyle } from "@/src/types/project";
import { useI18n } from "@/src/i18n";

type PageStyleSectionAnimationProps = {
  value: PageBaseStyle["sectionAnimation"];
  onChange: (patch: Partial<PageBaseStyle["sectionAnimation"]>) => void;
  defaultOpen?: boolean;
};

export default function PageStyleSectionAnimation({
  value,
  onChange,
  defaultOpen,
}: PageStyleSectionAnimationProps) {
  const t = useI18n();
  return (
    <Accordion
      title={t.inspector.page.groups.sectionAnimation}
      icon={<Sparkles size={14} />}
      defaultOpen={defaultOpen}
    >
      <FieldRow label={t.inspector.page.fields.sectionAnimationType}>
        <SelectField
          value={value.type}
          ariaLabel={t.inspector.page.fields.sectionAnimationType}
          onChange={(next) =>
            onChange({
              type: next as PageBaseStyle["sectionAnimation"]["type"],
            })
          }
        >
          <option value="none">{t.inspector.page.animationOptions.none}</option>
          <option value="fade">{t.inspector.page.animationOptions.fade}</option>
          <option value="slide">{t.inspector.page.animationOptions.slide}</option>
          <option value="slideDown">
            {t.inspector.page.animationOptions.slideDown}
          </option>
          <option value="slideLeft">
            {t.inspector.page.animationOptions.slideLeft}
          </option>
          <option value="slideRight">
            {t.inspector.page.animationOptions.slideRight}
          </option>
          <option value="zoom">{t.inspector.page.animationOptions.zoom}</option>
          <option value="bounce">{t.inspector.page.animationOptions.bounce}</option>
          <option value="flip">{t.inspector.page.animationOptions.flip}</option>
          <option value="flipY">{t.inspector.page.animationOptions.flipY}</option>
          <option value="rotate">{t.inspector.page.animationOptions.rotate}</option>
          <option value="blur">{t.inspector.page.animationOptions.blur}</option>
          <option value="pop">{t.inspector.page.animationOptions.pop}</option>
          <option value="swing">{t.inspector.page.animationOptions.swing}</option>
          <option value="float">{t.inspector.page.animationOptions.float}</option>
          <option value="pulse">{t.inspector.page.animationOptions.pulse}</option>
          <option value="shake">{t.inspector.page.animationOptions.shake}</option>
          <option value="wobble">{t.inspector.page.animationOptions.wobble}</option>
          <option value="skew">{t.inspector.page.animationOptions.skew}</option>
          <option value="roll">{t.inspector.page.animationOptions.roll}</option>
          <option value="tilt">{t.inspector.page.animationOptions.tilt}</option>
          <option value="zoomOut">
            {t.inspector.page.animationOptions.zoomOut}
          </option>
          <option value="stretch">
            {t.inspector.page.animationOptions.stretch}
          </option>
          <option value="compress">
            {t.inspector.page.animationOptions.compress}
          </option>
          <option value="glide">{t.inspector.page.animationOptions.glide}</option>
        </SelectField>
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.sectionAnimationTrigger}>
        <SelectField
          value={value.trigger}
          ariaLabel={t.inspector.page.fields.sectionAnimationTrigger}
          onChange={(next) =>
            onChange({
              trigger: next as PageBaseStyle["sectionAnimation"]["trigger"],
            })
          }
        >
          <option value="onView">
            {t.inspector.page.animationTriggers.onView}
          </option>
          <option value="onScroll">
            {t.inspector.page.animationTriggers.onScroll}
          </option>
        </SelectField>
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.sectionAnimationSpeed}>
        <NumberField
          value={value.speed}
          min={150}
          max={1500}
          step={50}
          ariaLabel={t.inspector.page.fields.sectionAnimationSpeed}
          onChange={(next) => onChange({ speed: next })}
        />
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.sectionAnimationEasing}>
        <SelectField
          value={value.easing}
          ariaLabel={t.inspector.page.fields.sectionAnimationEasing}
          onChange={(next) =>
            onChange({
              easing: next as PageBaseStyle["sectionAnimation"]["easing"],
            })
          }
        >
          <option value="linear">{t.inspector.page.animationEasings.linear}</option>
          <option value="ease">{t.inspector.page.animationEasings.ease}</option>
          <option value="ease-in">
            {t.inspector.page.animationEasings.easeIn}
          </option>
          <option value="ease-out">
            {t.inspector.page.animationEasings.easeOut}
          </option>
          <option value="ease-in-out">
            {t.inspector.page.animationEasings.easeInOut}
          </option>
        </SelectField>
      </FieldRow>
    </Accordion>
  );
}
