"use client";

import type { JSX } from "react";
import type { SectionBase } from "@/src/types/project";
import type { InspectorCoreState } from "@/src/components/editor/right/useInspectorCore";
import CampaignPeriodEditor from "@/src/components/layout-v2/inspector/sectionSpecific/CampaignPeriodEditor";
import BrandBarEditor from "@/src/components/layout-v2/inspector/sectionSpecific/BrandBarEditor";
import MainVisualEditor from "@/src/components/layout-v2/inspector/sectionSpecific/MainVisualEditor";
import CampaignOverviewEditor from "@/src/components/layout-v2/inspector/sectionSpecific/CampaignOverviewEditor";
import TargetStoresEditor from "@/src/components/layout-v2/inspector/sectionSpecific/TargetStoresEditor";
import RankingTableEditor from "@/src/components/layout-v2/inspector/sectionSpecific/RankingTableEditor";
import NotesEditor from "@/src/components/layout-v2/inspector/sectionSpecific/NotesEditor";
import CouponFlowEditor from "@/src/components/layout-v2/inspector/sectionSpecific/CouponFlowEditor";
import PaymentHistoryGuideEditor from "@/src/components/layout-v2/inspector/sectionSpecific/PaymentHistoryGuideEditor";
import ExcludedListEditor from "@/src/components/layout-v2/inspector/sectionSpecific/ExcludedListEditor";
import TabbedNotesEditor from "@/src/components/layout-v2/inspector/sectionSpecific/TabbedNotesEditor";
import ImageOnlyEditor from "@/src/components/layout-v2/inspector/sectionSpecific/ImageOnlyEditor";
import FooterHtmlEditor from "@/src/components/layout-v2/inspector/sectionSpecific/FooterHtmlEditor";
import ImageSectionEditor from "@/src/components/layout-v2/inspector/sectionSpecific/ImageSectionEditor";
import StickyNoteEditor from "@/src/components/layout-v2/inspector/sectionSpecific/StickyNoteEditor";
import ContactSectionEditor from "@/src/components/layout-v2/inspector/sectionSpecific/ContactSectionEditor";
import FooterSectionEditor from "@/src/components/layout-v2/inspector/sectionSpecific/FooterSectionEditor";

type RendererArgs = {
  section: SectionBase;
  core: InspectorCoreState;
};

type SectionEditorRenderer = (args: RendererArgs) => JSX.Element;

const editorMap: Partial<Record<string, SectionEditorRenderer>> = {
  campaignPeriodBar: ({ section, core }) => (
    <CampaignPeriodEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onRenameSection={(name) => core.renameSection(section.id, name)}
    />
  ),
  brandBar: ({ section, core }) => (
    <BrandBarEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onPatchStyle={(patch) => core.updateSectionStyle(section.id, patch)}
      addAsset={core.addAsset}
    />
  ),
  heroImage: ({ section, core }) => (
    <MainVisualEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      addAsset={core.addAsset}
    />
  ),
  campaignOverview: ({ section, core }) => (
    <CampaignOverviewEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onPatchContent={(patch) => core.updateSectionContent(section.id, patch)}
      onPatchStyle={(patch) => core.updateSectionStyle(section.id, patch)}
      onRenameSection={(name) => core.renameSection(section.id, name)}
      onToggleVisible={() => core.toggleSectionVisible(section.id)}
    />
  ),
  targetStores: ({ section, core }) => (
    <TargetStoresEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onPatchTargetStores={(patch) => core.updateTargetStoresContent(section.id, patch)}
      onRenameSection={(name) => core.renameSection(section.id, name)}
    />
  ),
  rankingTable: ({ section, core }) => (
    <RankingTableEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onPatchContent={(patch) => core.updateSectionContent(section.id, patch)}
    />
  ),
  legalNotes: ({ section, core }) => (
    <NotesEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onPatchContent={(patch) => core.updateSectionContent(section.id, patch)}
      onRenameSection={(name) => core.renameSection(section.id, name)}
      onToggleVisible={() => core.toggleSectionVisible(section.id)}
    />
  ),
  couponFlow: ({ section, core }) => (
    <CouponFlowEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onPatchContent={(patch) => core.updateSectionContent(section.id, patch)}
      onPatchButtonItem={(itemId, patch) =>
        core.updateButtonItem(section.id, itemId, patch)
      }
      addAsset={core.addAsset}
      onRenameSection={(name) => core.renameSection(section.id, name)}
    />
  ),
  paymentHistoryGuide: ({ section, core }) => (
    <PaymentHistoryGuideEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onPatchContent={(patch) => core.updateSectionContent(section.id, patch)}
      addAsset={core.addAsset}
      sectionOptions={core.sectionOptions}
      onRenameSection={(name) => core.renameSection(section.id, name)}
    />
  ),
  excludedStoresList: ({ section, core }) => (
    <ExcludedListEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onPatchTargetStores={(patch) => core.updateTargetStoresContent(section.id, patch)}
    />
  ),
  excludedBrandsList: ({ section, core }) => (
    <ExcludedListEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onPatchTargetStores={(patch) => core.updateTargetStoresContent(section.id, patch)}
    />
  ),
  tabbedNotes: ({ section, core }) => (
    <TabbedNotesEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onRenameSection={(name) => core.renameSection(section.id, name)}
      onToggleVisible={() => core.toggleSectionVisible(section.id)}
    />
  ),
  imageOnly: ({ section, core }) => (
    <ImageOnlyEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      addAsset={core.addAsset}
    />
  ),
  footerHtml: ({ section, core }) => (
    <FooterHtmlEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      addAsset={core.addAsset}
      assets={core.project.assets ?? {}}
    />
  ),
  image: ({ section, core }) => (
    <ImageSectionEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      addAsset={core.addAsset}
      onRenameSection={(name) => core.renameSection(section.id, name)}
      onToggleVisible={() => core.toggleSectionVisible(section.id)}
    />
  ),
  stickyNote: ({ section, core }) => (
    <StickyNoteEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onRenameSection={(name) => core.renameSection(section.id, name)}
      onToggleVisible={() => core.toggleSectionVisible(section.id)}
    />
  ),
  contact: ({ section, core }) => (
    <ContactSectionEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onRenameSection={(name) => core.renameSection(section.id, name)}
      onToggleVisible={() => core.toggleSectionVisible(section.id)}
    />
  ),
  footer: ({ section, core }) => (
    <FooterSectionEditor
      section={section}
      disabled={core.isLocked}
      onPatchData={(patch) => core.updateSectionData(section.id, patch)}
      onRenameSection={(name) => core.renameSection(section.id, name)}
      onToggleVisible={() => core.toggleSectionVisible(section.id)}
    />
  ),
};

const supportedSectionTypes = new Set(Object.keys(editorMap));

export const renderSectionSpecificEditor = ({ section, core }: RendererArgs) => {
  const renderer = editorMap[section.type];
  return renderer ? renderer({ section, core }) : null;
};

export const isSectionSpecificEditorSupported = (type: string) =>
  supportedSectionTypes.has(type);

export const shouldUseNextInspector = (
  selectedKind: "page" | "section" | "block",
  selectedSectionType?: string
) => {
  if (selectedKind === "page") {
    return true;
  }
  if (selectedKind !== "section") {
    return false;
  }
  if (!selectedSectionType) {
    return false;
  }
  return isSectionSpecificEditorSupported(selectedSectionType);
};
