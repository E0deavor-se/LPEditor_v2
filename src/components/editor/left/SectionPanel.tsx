"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useEditorStore, type EditorUIState } from "@/src/store/editorStore";
import SectionRow from "@/src/components/editor/left/SectionRow";
import type { SectionBase } from "@/src/types/project";

const SectionTypeLabels: Record<string, string> = {
  brandBar: "ブランドバー",
  heroImage: "MV画像",
  campaignPeriodBar: "キャンペーン期間(MV直下)",
  campaignOverview: "キャンペーン概要",
  couponFlow: "クーポン利用方法",
  targetStores: "対象店舗",
  legalNotes: "注意事項",
  footerHtml: "問い合わせ",
  rankingTable: "ランキング表",
  paymentHistoryGuide: "決済履歴の確認方法",
};

const normalizeName = (name: string) =>
  name.trim().length > 0 ? name.trim() : "無題";

export default function SectionPanel() {
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
  const addSection = useEditorStore(
    (state: EditorUIState) => state.addSection
  );
  const insertSectionAfter = useEditorStore(
    (state: EditorUIState) => state.insertSectionAfter
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const originalNameRef = useRef("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

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
      if (event.key === "Enter" && selectedSectionId) {
        const target = sections.find(
          (section: SectionBase) => section.id === selectedSectionId
        );
        if (target && !target.locked) {
          event.preventDefault();
          handleStartRename(
            selectedSectionId,
            target.name ?? SectionTypeLabels[target.type] ?? ""
          );
        }
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedSectionId) {
        const target = sections.find(
          (section: SectionBase) => section.id === selectedSectionId
        );
        if (target && !target.locked) {
          event.preventDefault();
          setDeleteTargetId(target.id);
        }
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

  const header = (
    <div className="flex items-center justify-between text-[11px] text-[var(--ui-muted)]">
      <span>ドラッグして並び替え</span>
      <button
        type="button"
        className="ui-button h-7 px-2 text-[10px]"
        onClick={() => setIsAddMenuOpen((current) => !current)}
      >
        <span className="flex items-center gap-1">
          <Plus size={14} />
          セクション追加
        </span>
      </button>
    </div>
  );

  const emptyState = (
    <div className="rounded-md border border-dashed border-[var(--ui-border)]/70 bg-[var(--ui-panel)]/60 px-3 py-4 text-center text-xs text-[var(--ui-muted)]">
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
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            disableDrag={section.locked || isEditing}
            onSelect={() => selectSection(section.id)}
            onStartRename={() =>
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

  return (
    <div className="flex flex-col gap-2" ref={listRef} tabIndex={0}>
      <button
        type="button"
        className={
          "relative flex flex-col gap-1 rounded-md border border-[var(--ui-border)]/50 bg-[var(--ui-panel)]/70 px-3 py-2 text-left transition " +
          (isPageSelected
            ? " bg-[color-mix(in_oklab,var(--ui-primary)_10%,var(--ui-panel))]"
            : " hover:bg-[var(--ui-panel)]/85")
        }
        onClick={() => setSelectedSection(undefined)}
      >
        {isPageSelected ? (
          <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-[var(--ui-primary)]" />
        ) : null}
        <div className="text-[12px] font-semibold text-[var(--ui-text)]">
          LP全体（ページ設定）
        </div>
        <div className="text-[11px] text-[var(--ui-muted)]">
          背景 / タイポ / カラー
        </div>
      </button>
      {header}
      {isAddMenuOpen ? (
        <div className="rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/70 p-2 text-[12px]">
          <div className="mb-2 text-[10px] text-[var(--ui-muted)]">
            追加するセクションタイプを選択
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="ui-button h-8 justify-start px-2 text-[12px]"
              onClick={() => {
                addSection();
                setIsAddMenuOpen(false);
              }}
            >
              通常セクション
            </button>
            <button
              type="button"
              className="ui-button h-8 justify-start px-2 text-[12px]"
              onClick={() => {
                insertSectionAfter(undefined, "couponFlow");
                setIsAddMenuOpen(false);
              }}
            >
              クーポン利用方法
            </button>
            <button
              type="button"
              className="ui-button h-8 justify-start px-2 text-[12px]"
              onClick={() => {
                insertSectionAfter(undefined, "rankingTable");
                setIsAddMenuOpen(false);
              }}
            >
              ランキング表
            </button>
            <button
              type="button"
              className="ui-button h-8 justify-start px-2 text-[12px]"
              onClick={() => {
                insertSectionAfter(undefined, "paymentHistoryGuide");
                setIsAddMenuOpen(false);
              }}
            >
              決済履歴の確認方法
            </button>
          </div>
        </div>
      ) : null}
      {sections.length === 0 ? emptyState : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map((section) => section.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">{listItems}</div>
          </SortableContext>
        </DndContext>
      )}
      <div className="rounded-md border border-dashed border-[var(--ui-border)]/70 bg-[var(--ui-panel)]/50 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
        挿入ラインのUIは準備中です。
      </div>
      {deleteTargetId ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
          <div className="ui-panel w-full max-w-sm p-4">
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
