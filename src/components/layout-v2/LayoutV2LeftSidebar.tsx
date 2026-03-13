/* ───────────────────────────────────────────────
   LayoutV2LeftSidebar
   Canvas LayersPanel と同系統の見た目。
   既存 SectionPanel ロジックを再利用する。
   ─────────────────────────────────────────────── */

"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Lock,
  Plus,
  Trash2,
  Unlock,
  Copy,
  Image as ImageIcon,
  Store,
  Type,
  LayoutGrid,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditorStore } from "@/src/store/editorStore";
import { getLayoutSections } from "@/src/lib/editorProject";
import SharedSidebarShell from "@/src/components/shared/SharedSidebarShell";
import SharedSidebarHeader from "@/src/components/shared/SharedSidebarHeader";
import SharedSidebarListRow from "@/src/components/shared/SharedSidebarListRow";
import type { SectionBase } from "@/src/types/project";
import { isTemplateDebugEnabled } from "@/src/lib/debugFlags";

/* ---------- Constants ---------- */

const SectionTypeLabels: Record<string, string> = {
  brandBar: "ブランドバー",
  heroImage: "メインビジュアル",
  campaignPeriodBar: "キャンペーン期間",
  campaignOverview: "キャンペーン概要",
  couponFlow: "クーポン利用方法",
  targetStores: "対象店舗",
  legalNotes: "注意事項",
  footerHtml: "お問い合わせ",
  rankingTable: "ランキング表",
  paymentHistoryGuide: "決済利用方法",
  excludedStoresList: "対象外店舗",
  excludedBrandsList: "対象外ブランド",
  tabbedNotes: "付箋タブ",
  imageOnly: "画像セクション",
  image: "画像",
  stickyNote: "付箋メモ",
  contact: "お問い合わせ(新)",
  footer: "フッター",
};

const SECTION_CHOICES = Object.entries(SectionTypeLabels).map(
  ([type, label]) => ({ type, label })
);

const typeIcon = (type: string) => {
  switch (type) {
    case "heroImage":
    case "imageOnly":
    case "image":
      return <ImageIcon size={14} />;
    case "targetStores":
    case "excludedStoresList":
    case "excludedBrandsList":
      return <Store size={14} />;
    case "brandBar":
    case "campaignPeriodBar":
      return <Type size={14} />;
    default:
      return <LayoutGrid size={14} />;
  }
};

/* ---------- Sortable Section Row ---------- */

type SortableSectionRowProps = {
  section: SectionBase;
  isSelected: boolean;
  isDropTarget: boolean;
  isAnyDragging: boolean;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
};

function SortableSectionRow({
  section,
  isSelected,
  isDropTarget,
  isAnyDragging,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDuplicate,
  onDelete,
  onRename,
}: SortableSectionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 2 : undefined,
  };

  const label = section.name || SectionTypeLabels[section.type] || section.type;

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== label) {
      onRename(section.id, trimmed);
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={
        isDropTarget && !isDragging
          ? "rounded-md ring-1 ring-[var(--ui-accent)]/60"
          : undefined
      }
    >
      <SharedSidebarListRow
        isSelected={isSelected}
        showDropIndicator={isDropTarget && !isDragging}
        onClick={() => onSelect(section.id)}
        onDoubleClick={() => {
          setDraftName(label);
          setIsEditing(true);
        }}
        icon={<span className="text-[var(--ui-muted)]">{typeIcon(section.type)}</span>}
        label={
          isEditing ? (
            <input
              autoFocus
              className="h-6 w-full rounded border border-[var(--ui-border)] bg-transparent px-1 text-[11px] outline-none focus:border-[var(--ui-accent)]"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
          ) : (
            <span className={section.visible === false ? "opacity-40" : ""}>
              {label}
            </span>
          )
        }
        actions={
          <>
            <button
              type="button"
              className={
                "h-5 w-5 rounded text-[var(--ui-muted)] hover:text-[var(--ui-text)] " +
                (isAnyDragging ? "cursor-grabbing" : "cursor-grab")
              }
              title="ドラッグして並び替え"
              aria-label="ドラッグして並び替え"
              aria-grabbed={isDragging}
              {...listeners}
            >
              <GripVertical size={12} />
            </button>
            <button
              type="button"
              className="h-5 w-5 rounded text-[var(--ui-muted)] hover:text-[var(--ui-text)]"
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(section.id); }}
              title={section.visible ? "非表示" : "表示"}
            >
              {section.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            <button
              type="button"
              className="h-5 w-5 rounded text-[var(--ui-muted)] hover:text-[var(--ui-text)]"
              onClick={(e) => { e.stopPropagation(); onToggleLock(section.id); }}
              title={section.locked ? "ロック解除" : "ロック"}
            >
              {section.locked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>
            <button
              type="button"
              className="h-5 w-5 rounded text-[var(--ui-muted)] hover:text-[var(--ui-text)]"
              onClick={(e) => { e.stopPropagation(); onDuplicate(section.id); }}
              title="複製"
            >
              <Copy size={12} />
            </button>
            <button
              type="button"
              className="h-5 w-5 rounded text-[var(--ui-muted)] hover:text-[var(--ui-text)]"
              onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
              title="削除"
            >
              <Trash2 size={12} />
            </button>
          </>
        }
      />
    </div>
  );
}

/* ---------- Add Section Modal ---------- */

type AddSectionModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (type: string) => void;
  existingTypes: Set<string>;
};

function AddSectionModal({ open, onClose, onAdd, existingTypes }: AddSectionModalProps) {
  const [page, setPage] = useState(0);
  const pageSize = 6;
  const totalPages = Math.ceil(SECTION_CHOICES.length / pageSize);
  const slice = SECTION_CHOICES.slice(page * pageSize, (page + 1) * pageSize);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-lg border border-[var(--ui-border)] bg-[var(--surface)] p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold">セクション追加</span>
          <button
            type="button"
            className="text-[var(--ui-muted)] hover:text-[var(--ui-text)]"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {slice.map((choice) => {
            const exists = existingTypes.has(choice.type);
            return (
              <button
                key={choice.type}
                type="button"
                className={
                  "flex h-9 items-center gap-2 rounded-md border px-3 text-[11px] transition-colors " +
                  (exists
                    ? "border-[var(--ui-border)] text-[var(--ui-muted)] opacity-60"
                    : "border-[var(--ui-border)] hover:border-[var(--ui-accent)] hover:bg-[color-mix(in_srgb,var(--ui-accent)_8%,transparent)]")
                }
                onClick={() => {
                  onAdd(choice.type);
                  onClose();
                }}
              >
                {typeIcon(choice.type)}
                <span className="truncate">{choice.label}</span>
                {exists && <span className="ml-auto text-[9px] text-[var(--ui-muted)]">追加済み</span>}
              </button>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              className="text-[11px] text-[var(--ui-muted)] disabled:opacity-30"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ← 前
            </button>
            <span className="text-[10px] text-[var(--ui-muted)]">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="text-[11px] text-[var(--ui-muted)] disabled:opacity-30"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              次 →
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ==================== Main Component ==================== */

export default function LayoutV2LeftSidebar() {
  const sections = useEditorStore((s) => getLayoutSections(s.project)) as SectionBase[];
  const selected = useEditorStore((s) => s.selected);
  const selectSection = useEditorStore((s) => s.selectSection);
  const setSelectedSection = useEditorStore((s) => s.setSelectedSection);
  const renameSection = useEditorStore((s) => s.renameSection);
  const toggleSectionVisible = useEditorStore((s) => s.toggleSectionVisible);
  const toggleSectionLocked = useEditorStore((s) => s.toggleSectionLocked);
  const duplicateSection = useEditorStore((s) => s.duplicateSection);
  const deleteSection = useEditorStore((s) => s.deleteSection);
  const reorderSections = useEditorStore((s) => s.reorderSections);
  const insertSectionAfter = useEditorStore((s) => s.insertSectionAfter);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDragId, setOverDragId] = useState<string | null>(null);
  const isMounted = typeof window !== "undefined";

  useEffect(() => {
    if (isTemplateDebugEnabled()) {
      console.log("[TemplateDebug] 8.left sidebar selector", {
        sectionsLength: sections.length,
        sectionTypes: sections.map((section) => section.type),
      });
    }
  }, [sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const existingTypes = useMemo(
    () => new Set(sections.map((s) => s.type)),
    [sections]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverDragId(event.over ? String(event.over.id) : null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragId(null);
      setOverDragId(null);
      if (!over || active.id === over.id) return;
      reorderSections(active.id as string, over.id as string);
    },
    [reorderSections]
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    setOverDragId(null);
  }, []);

  const activeDragSection = useMemo(
    () => sections.find((section) => section.id === activeDragId),
    [sections, activeDragId]
  );

  const handleAddSection = useCallback(
    (type: string) => {
      insertSectionAfter(undefined, type);
    },
    [insertSectionAfter]
  );

  const handleSelectPage = useCallback(() => {
    setSelectedSection(undefined);
  }, [setSelectedSection]);

  return (
    <SharedSidebarShell className="hidden lg:flex">
      <SharedSidebarHeader
        title="レイヤー"
        actions={
          <>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded text-[var(--ui-muted)] hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)] hover:text-[var(--ui-text)]"
              title="セクション追加"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus size={14} />
            </button>
          </>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Page setting row – matches Canvas "root" feel */}
        <SharedSidebarListRow
          isSelected={selected.kind === "page"}
          onClick={handleSelectPage}
          icon={<Layers size={14} />}
          label="LP全体（ページ設定）"
        />

        {/* Section list with DnD */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {sections.map((section) => (
              <SortableSectionRow
                key={section.id}
                section={section}
                isSelected={selected.kind === "section" && selected.id === section.id}
                isDropTarget={Boolean(activeDragId) && overDragId === section.id}
                isAnyDragging={Boolean(activeDragId)}
                onSelect={(id) => selectSection(id)}
                onToggleVisibility={toggleSectionVisible}
                onToggleLock={toggleSectionLocked}
                onDuplicate={duplicateSection}
                onDelete={deleteSection}
                onRename={renameSection}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeDragSection ? (
              <div className="flex items-center gap-2 rounded-md border border-[var(--ui-border)] bg-[var(--surface)] px-2 py-1 text-[11px] shadow-[var(--ui-shadow-md)]">
                <GripVertical size={12} className="text-[var(--ui-muted)]" />
                <span>{activeDragSection.name || SectionTypeLabels[activeDragSection.type] || activeDragSection.type}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Add section modal */}
      {isMounted && (
        <AddSectionModal
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onAdd={handleAddSection}
          existingTypes={existingTypes}
        />
      )}
    </SharedSidebarShell>
  );
}
