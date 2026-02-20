"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ChevronRight, Layers } from "lucide-react";
import { useEditorStore, type EditorUIState } from "@/src/store/editorStore";
import SectionRow from "@/src/components/editor/left/SectionRow";
import type { SectionBase } from "@/src/types/project";
import SectionTree from "@/src/components/editor/left/SectionTree";

const SectionTypeLabels: Record<string, string> = {
  brandBar: "ブランドバー",
  heroImage: "メインビジュアル",
  imageOnly: "画像のみ",
  campaignPeriodBar: "キャンペーン期間",
  campaignOverview: "キャンペーン概要",
  couponFlow: "クーポン利用方法",
  targetStores: "対象店舗",
  legalNotes: "注意事項",
  footerHtml: "問い合わせ",
  rankingTable: "ランキング表",
  paymentHistoryGuide: "決済利用方法",
  excludedStoresList: "対象外店舗セクション",
  excludedBrandsList: "対象外ブランドセクション",
  tabbedNotes: "付箋タブセクション",
  imageOnly: "画像セクション",
};

const SECTION_CHOICES = Object.entries(SectionTypeLabels).map(
  ([type, label]) => ({ type, label })
);

const normalizeName = (name: string) =>
  name.trim().length > 0 ? name.trim() : "無題";

type SectionPanelProps = {
  isAddMenuOpen: boolean;
  onAddMenuOpenChange: (isOpen: boolean) => void;
};

export default function SectionPanel({
  isAddMenuOpen,
  onAddMenuOpenChange,
}: SectionPanelProps) {
  const sections = useEditorStore(
    (state: EditorUIState) => state.project.sections
  ) as SectionBase[];
  const selected = useEditorStore((state: EditorUIState) => state.selected);
  const selectSection = useEditorStore(
    (state: EditorUIState) => state.selectSection
  );
  const setSelectedSection = useEditorStore(
    (state: EditorUIState) => state.setSelectedSection
  );
  const renameSection = useEditorStore(
    (state: EditorUIState) => state.renameSection
  );
  const toggleSectionVisible = useEditorStore(
    (state: EditorUIState) => state.toggleSectionVisible
  );
  const toggleSectionLocked = useEditorStore(
    (state: EditorUIState) => state.toggleSectionLocked
  );
  const duplicateSection = useEditorStore(
    (state: EditorUIState) => state.duplicateSection
  );
  const deleteSection = useEditorStore(
    (state: EditorUIState) => state.deleteSection
  );
  const moveSection = useEditorStore(
    (state: EditorUIState) => state.moveSection
  );
  const reorderSections = useEditorStore(
    (state: EditorUIState) => state.reorderSections
  );
  const insertSectionAfter = useEditorStore(
    (state: EditorUIState) => state.insertSectionAfter
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const originalNameRef = useRef("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [addMenuPage, setAddMenuPage] = useState(0);

  const addMenuPageSize = 6;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const selectedSectionId =
    selected.kind === "section" ? selected.id : undefined;
  const isPageSelected = selected.kind === "page";

  const handleStartRename = useCallback(
    (sectionId: string, name: string) => {
      setEditingId(sectionId);
      setDraftName(name);
      originalNameRef.current = name;
    },
    []
  );

  const handleCommitRename = useCallback(() => {
    if (!editingId) {
      return;
    }
    const nextName = normalizeName(draftName);
    renameSection(editingId, nextName);
    setEditingId(null);
  }, [draftName, editingId, renameSection]);

  const handleCancelRename = useCallback(() => {
    if (!editingId) {
      return;
    }
    setDraftName(originalNameRef.current);
    setEditingId(null);
  }, [editingId]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isAddMenuOpen) {
      setAddMenuPage(0);
    }
  }, [isAddMenuOpen]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") {
        return;
      }
      if (editingId) {
        return;
      }
      const currentIndex = sections.findIndex(
        (section: SectionBase) => section.id === selectedSectionId
      );
      if (event.key === "ArrowUp") {
        event.preventDefault();
        const nextIndex = Math.max(0, currentIndex - 1);
        const nextSection = sections[nextIndex];
        if (nextSection) {
          selectSection(nextSection.id);
        }
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = Math.min(
          sections.length - 1,
          Math.max(0, currentIndex + 1)
        );
        const nextSection = sections[nextIndex];
        if (nextSection) {
          selectSection(nextSection.id);
        }
        return;
      }
    };

    const node = listRef.current;
    node.addEventListener("keydown", handleKeyDown);
    return () => node.removeEventListener("keydown", handleKeyDown);
  }, [
    editingId,
    handleStartRename,
    sections,
    selectSection,
    selectedSectionId,
  ]);

  const emptyState = (
    <div className="mx-3 rounded-md border border-dashed border-[var(--ui-border)]/70 bg-[var(--ui-panel)]/60 px-3 py-4 text-center text-xs text-[var(--ui-muted)]">
      セクションがありません。
    </div>
  );

  const listItems = useMemo(
    () =>
      sections.map((section: SectionBase, index: number) => {
        const label = normalizeName(
          section.name ?? SectionTypeLabels[section.type] ?? ""
        );
        const isEditing = editingId === section.id;
        const canMoveUp = index > 0 && !section.locked;
        const canMoveDown = index < sections.length - 1 && !section.locked;

        return (
          <SectionRow
            key={section.id}
            section={section}
            label={label}
            isSelected={selectedSectionId === section.id}
            isEditing={isEditing}
            draftName={isEditing ? draftName : label}
            depth={0}
            hasChildren={false}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            disableDrag={section.locked || isEditing}
            onSelect={() => selectSection(section.id)}
            onRename={() =>
              handleStartRename(
                section.id,
                section.name ?? SectionTypeLabels[section.type] ?? ""
              )
            }
            onChangeName={setDraftName}
            onCommitName={handleCommitRename}
            onCancelName={handleCancelRename}
            onToggleVisibility={() => toggleSectionVisible(section.id)}
            onToggleLock={() => toggleSectionLocked(section.id)}
            onDuplicate={() => duplicateSection(section.id)}
            onDelete={() => setDeleteTargetId(section.id)}
            onMoveUp={() => moveSection(section.id, "up")}
            onMoveDown={() => moveSection(section.id, "down")}
          />
        );
      }),
    [
      sections,
      editingId,
      draftName,
      handleCommitRename,
      handleCancelRename,
      handleStartRename,
      selectSection,
      selectedSectionId,
      toggleSectionVisible,
      toggleSectionLocked,
      duplicateSection,
      moveSection,
    ]
  );

  const sectionTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sections.forEach((section) => {
      counts[section.type] = (counts[section.type] ?? 0) + 1;
    });
    return counts;
  }, [sections]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeId = event.active?.id?.toString();
      const overId = event.over?.id?.toString();
      if (!activeId || !overId || activeId === overId) {
        return;
      }
      reorderSections(activeId, overId);
    },
    [reorderSections]
  );

  const handleAddSection = useCallback(
    (type: string) => {
      insertSectionAfter(undefined, type);
      onAddMenuOpenChange(false);
    },
    [insertSectionAfter, onAddMenuOpenChange]
  );

  const addMenuTotalPages = Math.max(
    1,
    Math.ceil(SECTION_CHOICES.length / addMenuPageSize)
  );
  const addMenuPageStart = addMenuPage * addMenuPageSize;
  const addMenuPageItems = SECTION_CHOICES.slice(
    addMenuPageStart,
    addMenuPageStart + addMenuPageSize
  );

  return (
    <div className="flex flex-col py-2" ref={listRef} tabIndex={0}>
      <div className="px-3">
        <button
          type="button"
          className={
            "group relative flex h-8 w-full items-center gap-2 border-b border-[var(--ui-border)]/40 text-left text-[12px] transition-colors duration-150 ease-out " +
            (isPageSelected
              ? " bg-[color-mix(in_srgb,var(--ui-accent)_6%,transparent)]"
              : " hover:bg-[var(--surface-2)]/70")
          }
          onClick={() => setSelectedSection(undefined)}
        >
          {isPageSelected ? (
            <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-[var(--ui-accent)]" />
          ) : null}
          <span className="flex h-5 w-5 items-center justify-center text-[var(--ui-muted)] opacity-30">
            <ChevronRight size={14} />
          </span>
          <span className="flex h-4 w-4 items-center justify-center text-[var(--ui-muted)]">
            <Layers size={14} />
          </span>
          <span className="truncate text-[12px] text-[var(--ui-text)]">
            LP全体（ページ設定）
          </span>
        </button>
      </div>
      {isAddMenuOpen && isMounted
        ? createPortal(
            <div className="fixed inset-0 z-[1000] ui-modal-overlay flex items-center justify-center p-4">
              <div className="ui-modal w-full max-w-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--ui-muted)]">
                      セクション追加
                    </div>
                    <div className="text-lg font-semibold text-[var(--ui-text)]">
                      追加するセクションを選択してください
                    </div>
                    <div className="text-[12px] text-[var(--ui-muted)]">
                      クリックすると即時に追加されます。
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ui-button h-7 px-2.5 text-[10px]"
                    onClick={() => onAddMenuOpenChange(false)}
                  >
                    閉じる
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 text-xs text-[var(--ui-muted)]">
                  <span>
                    {addMenuPage + 1} / {addMenuTotalPages}ページ
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="ui-button h-7 px-2 text-[10px]"
                      onClick={() =>
                        setAddMenuPage((current) => Math.max(0, current - 1))
                      }
                      disabled={addMenuPage === 0}
                    >
                      前へ
                    </button>
                    <button
                      type="button"
                      className="ui-button h-7 px-2 text-[10px]"
                      onClick={() =>
                        setAddMenuPage((current) =>
                          Math.min(addMenuTotalPages - 1, current + 1)
                        )
                      }
                      disabled={addMenuPage >= addMenuTotalPages - 1}
                    >
                      次へ
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {addMenuPageItems.map((option) => (
                    (() => {
                      const count = sectionTypeCounts[option.type] ?? 0;
                      const isAdded = count > 0;
                      return (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => handleAddSection(option.type)}
                      className={
                        "group relative flex h-full flex-col gap-2 rounded-lg border p-4 text-left transition-colors duration-150 ease-out " +
                        (isAdded
                          ? "border-[var(--ui-primary-base)]/40 bg-[var(--surface)]"
                          : "border-[var(--ui-border)] bg-[var(--surface)] hover:border-[var(--ui-text)] hover:bg-[var(--surface-2)]")
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-[var(--ui-text)]">
                          {option.label}
                        </div>
                        {isAdded ? (
                          <span className="rounded-full border border-[var(--ui-primary-base)]/40 px-2 py-0.5 text-[9px] font-semibold text-[var(--ui-primary-base)]">
                            追加済み
                          </span>
                        ) : (
                          <span className="rounded-full border border-[var(--ui-border)] px-2 py-0.5 text-[9px] font-semibold text-[var(--ui-muted)]">
                            追加
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-[var(--ui-muted)]">
                        {isAdded
                          ? `追加済み: ${count}件`
                          : "このセクションを追加します。"}
                      </div>
                      <div className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-[var(--ui-text)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--ui-bg)]">
                        追加する
                      </div>
                    </button>
                      );
                    })()
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      {sections.length === 0 ? (
        emptyState
      ) : (
        <SectionTree
          items={sections.map((section) => section.id)}
          sensors={sensors}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col px-3">{listItems}</div>
        </SectionTree>
      )}
      {deleteTargetId ? (
        <div className="fixed inset-0 z-[1000] ui-modal-overlay flex items-center justify-center px-4">
          <div className="ui-modal w-full max-w-sm p-4">
            <div className="text-sm font-semibold text-[var(--ui-text)]">
              セクションを削除しますか？
            </div>
            <p className="mt-2 text-xs text-[var(--ui-muted)]">
              この操作は取り消せません。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="ui-button h-8 px-3 text-[11px]"
                onClick={() => setDeleteTargetId(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="ui-button h-8 px-3 text-[11px]"
                onClick={() => {
                  deleteSection(deleteTargetId);
                  setDeleteTargetId(null);
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
