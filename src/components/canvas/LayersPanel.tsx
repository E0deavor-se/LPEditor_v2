/* ───────────────────────────────────────────────
   Canvas Layers Panel – 左パネル
   DnD 並び替え (上が前面)
   ─────────────────────────────────────────────── */

"use client";

import { useMemo, useState, type MouseEvent } from "react";
import {
  Eye, EyeOff, Lock, Unlock,
  ChevronUp, ChevronDown, Type, ImageIcon, Square, MousePointer2, Layers,
  Copy, Trash2, GripVertical, Table2,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCanvasEditorStore } from "@/src/store/canvasEditorStore";
import type { CanvasLayer } from "@/src/types/canvas";
import { getDocumentMode, getLayout } from "@/src/types/canvas";

const ICON_SIZE = 14;

const typeIcon = (type: string) => {
  switch (type) {
    case "text": return <Type size={ICON_SIZE} />;
    case "image": return <ImageIcon size={ICON_SIZE} />;
    case "shape": return <Square size={ICON_SIZE} />;
    case "button": return <MousePointer2 size={ICON_SIZE} />;
    case "table": return <Table2 size={ICON_SIZE} />;
    default: return <Layers size={ICON_SIZE} />;
  }
};

type LayerRowProps = {
  layer: CanvasLayer;
  isSelected: boolean;
  indent?: number;
  isGroup?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
  editingId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  setEditingId: (id: string | null) => void;
  commitRename: () => void;
  onSelect: (layerId: string, e: MouseEvent) => void;
  onDoubleClick: (layer: CanvasLayer) => void;
  toggleHidden: (id: string) => void;
  toggleLock: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  duplicateLayer: (id: string) => void;
  removeLayer: (id: string) => void;
};

type SectionRowProps = {
  id: string;
  name: string;
  isSelected: boolean;
  isDragOver: boolean;
  isEditing: boolean;
  editName: string;
  onEditNameChange: (name: string) => void;
  onEditStart: (id: string, name: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
  onSelect: (id: string) => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  disableUp: boolean;
  disableDown: boolean;
};

type SectionLayerRowProps = {
  layer: CanvasLayer;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect: (layerId: string, e: MouseEvent) => void;
  onToggleHidden: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRemove: (id: string) => void;
};

const SortableLayerRow = ({
  layer,
  isSelected,
  indent = 0,
  isGroup = false,
  isCollapsed = false,
  onToggleCollapse,
  editingId,
  editName,
  setEditName,
  commitRename,
  onSelect,
  onDoubleClick,
  toggleHidden,
  toggleLock,
  bringForward,
  sendBackward,
  duplicateLayer,
  removeLayer,
}: LayerRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : layer.hidden ? 0.45 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "group flex items-center gap-1.5 border-b border-[var(--ui-border)] px-2 py-1.5 text-[11px] transition-colors" +
        (isSelected
          ? " bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]"
          : " hover:bg-[color-mix(in_srgb,var(--ui-text)_4%,transparent)]")
      }
      onClick={(e) => onSelect(layer.id, e)}
      onDoubleClick={() => onDoubleClick(layer)}
      {...attributes}
      {...listeners}
    >
      <span style={{ width: indent * 12, minWidth: indent * 12 }} />
      {isGroup ? (
        <button
          type="button"
          className="p-0.5 rounded hover:bg-[var(--surface-2)]"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse?.(layer.id);
          }}
          title={isCollapsed ? "展開" : "折りたたみ"}
        >
          {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      ) : null}
      <span className="flex-shrink-0 text-[var(--ui-muted)]">{typeIcon(layer.type)}</span>

      {editingId === layer.id ? (
        <input
          className="min-w-0 flex-1 rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1 py-0 text-[11px]"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => e.key === "Enter" && commitRename()}
          autoFocus
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{layer.name}</span>
      )}

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          className="p-0.5 rounded hover:bg-[var(--surface-2)]"
          title={layer.hidden ? "表示" : "非表示"}
          onClick={(e) => { e.stopPropagation(); toggleHidden(layer.id); }}
        >
          {layer.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <button
          type="button"
          className="p-0.5 rounded hover:bg-[var(--surface-2)]"
          title={layer.locked ? "ロック解除" : "ロック"}
          onClick={(e) => { e.stopPropagation(); toggleLock(layer.id); }}
        >
          {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
        <button
          type="button"
          className="p-0.5 rounded hover:bg-[var(--surface-2)]"
          title="前面へ"
          onClick={(e) => { e.stopPropagation(); bringForward(layer.id); }}
        >
          <ChevronUp size={12} />
        </button>
        <button
          type="button"
          className="p-0.5 rounded hover:bg-[var(--surface-2)]"
          title="背面へ"
          onClick={(e) => { e.stopPropagation(); sendBackward(layer.id); }}
        >
          <ChevronDown size={12} />
        </button>
        <button
          type="button"
          className="p-0.5 rounded hover:bg-[var(--surface-2)]"
          title="複製"
          onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }}
        >
          <Copy size={12} />
        </button>
        <button
          type="button"
          className="p-0.5 rounded hover:bg-[var(--surface-2)] text-red-400"
          title="削除"
          onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

const SortableSectionRow = ({
  id,
  name,
  isSelected,
  isDragOver,
  isEditing,
  editName,
  onEditNameChange,
  onEditStart,
  onEditCommit,
  onEditCancel,
  onSelect,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onRemove,
  disableUp,
  disableDown,
}: SectionRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "relative flex items-center gap-1 rounded border px-1.5 py-1 text-[10px] " +
        (isSelected
          ? "border-[var(--ui-text)] bg-[color-mix(in_srgb,var(--ui-text)_10%,transparent)]"
          : "border-[var(--ui-border)]")
      }
      onClick={() => onSelect(id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEditStart(id, name);
      }}
    >
      {isDragOver ? (
        <div className="pointer-events-none absolute inset-x-0 -top-px h-[2px] bg-[var(--ui-text)]" />
      ) : null}

      <button
        type="button"
        className="rounded p-0.5 text-[var(--ui-muted)] hover:bg-[var(--surface-2)]"
        title="ドラッグで並び替え"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={10} />
      </button>

      {isEditing ? (
        <input
          className="min-w-0 flex-1 rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1 py-0 text-[10px]"
          value={editName}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onEditNameChange(e.target.value)}
          onBlur={onEditCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEditCommit();
            if (e.key === "Escape") onEditCancel();
          }}
          autoFocus
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{name}</span>
      )}
      <button
        type="button"
        className="rounded p-0.5 hover:bg-[var(--surface-2)] disabled:opacity-40"
        onClick={(e) => {
          e.stopPropagation();
          onMoveUp();
        }}
        disabled={disableUp}
        title="上へ"
      >
        <ChevronUp size={10} />
      </button>
      <button
        type="button"
        className="rounded p-0.5 hover:bg-[var(--surface-2)] disabled:opacity-40"
        onClick={(e) => {
          e.stopPropagation();
          onMoveDown();
        }}
        disabled={disableDown}
        title="下へ"
      >
        <ChevronDown size={10} />
      </button>
      <button
        type="button"
        className="rounded p-0.5 hover:bg-[var(--surface-2)]"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        title="複製"
      >
        <Copy size={10} />
      </button>
      <button
        type="button"
        className="rounded p-0.5 text-red-400 hover:bg-[var(--surface-2)]"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="削除"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
};

const SortableSectionLayerRow = ({
  layer,
  isSelected,
  isDragOver,
  onSelect,
  onToggleHidden,
  onToggleLock,
  onRemove,
}: SectionLayerRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : layer.hidden ? 0.45 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "relative group flex items-center gap-1.5 border-b border-[var(--ui-border)] px-2 py-1.5 text-[11px] transition-colors " +
        (isSelected
          ? "bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]"
          : "hover:bg-[color-mix(in_srgb,var(--ui-text)_4%,transparent)]")
      }
      onClick={(e) => onSelect(layer.id, e)}
    >
      {isDragOver ? (
        <div className="pointer-events-none absolute inset-x-0 -top-px h-[2px] bg-[var(--ui-text)]" />
      ) : null}

      <button
        type="button"
        className="rounded p-0.5 text-[var(--ui-muted)] hover:bg-[var(--surface-2)]"
        title="ドラッグで並び替え"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={11} />
      </button>
      <span className="flex-shrink-0 text-[var(--ui-muted)]">{typeIcon(layer.type)}</span>
      <span className="min-w-0 flex-1 truncate">{layer.name}</span>
      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="p-0.5 rounded hover:bg-[var(--surface-2)]"
          title={layer.hidden ? "表示" : "非表示"}
          onClick={() => onToggleHidden(layer.id)}
        >
          {layer.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
        </button>
        <button
          type="button"
          className="p-0.5 rounded hover:bg-[var(--surface-2)]"
          title={layer.locked ? "ロック解除" : "ロック"}
          onClick={() => onToggleLock(layer.id)}
        >
          {layer.locked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
        <button
          type="button"
          className="p-0.5 rounded text-red-400 hover:bg-[var(--surface-2)]"
          title="削除"
          onClick={() => {
            if (window.confirm("このレイヤーを削除しますか？")) {
              onRemove(layer.id);
            }
          }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};

export default function CanvasLayersPanel() {
  const doc = useCanvasEditorStore((s) => s.document);
  const device = useCanvasEditorStore((s) => s.device);
  const getRenderableLayers = useCanvasEditorStore((s) => s.getRenderableLayers);
  const selection = useCanvasEditorStore((s) => s.selection);
  const select = useCanvasEditorStore((s) => s.select);
  const toggleLock = useCanvasEditorStore((s) => s.toggleLock);
  const toggleHidden = useCanvasEditorStore((s) => s.toggleHidden);
  const bringForward = useCanvasEditorStore((s) => s.bringForward);
  const sendBackward = useCanvasEditorStore((s) => s.sendBackward);
  const removeLayer = useCanvasEditorStore((s) => s.removeLayer);
  const duplicateLayer = useCanvasEditorStore((s) => s.duplicateLayer);
  const renameLayer = useCanvasEditorStore((s) => s.renameLayer);
  const reorderLayers = useCanvasEditorStore((s) => s.reorderLayers);
  const reorderSectionLayers = useCanvasEditorStore((s) => s.reorderSectionLayers);
  const addSection = useCanvasEditorStore((s) => s.addSection);
  const duplicateSection = useCanvasEditorStore((s) => s.duplicateSection);
  const removeSection = useCanvasEditorStore((s) => s.removeSection);
  const moveSection = useCanvasEditorStore((s) => s.moveSection);
  const moveSectionToIndex = useCanvasEditorStore((s) => s.moveSectionToIndex);
  const selectedSectionId = useCanvasEditorStore((s) => s.selectedSectionId);
  const selectSection = useCanvasEditorStore((s) => s.selectSection);
  const renameSection = useCanvasEditorStore((s) => s.renameSection);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set());
  const [sectionDragOverId, setSectionDragOverId] = useState<string | null>(null);
  const [sectionLayerDragOverId, setSectionLayerDragOverId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const [editingSectionOriginalName, setEditingSectionOriginalName] = useState("");
  const mode = getDocumentMode(doc);
  const sections = doc.sections?.sections ?? [];
  const selectedSection = sections.find((section) => section.id === selectedSectionId);
  const selectedSectionLayers = selectedSection?.layers ?? [];
  const editableLayers = useMemo(
    () => getRenderableLayers(device).filter((l) => !l.id.startsWith("section-bg:")),
    [getRenderableLayers, device]
  );

  const sortedLayers = useMemo(
    () =>
      [...editableLayers].sort(
        (a, b) => getLayout(b, device).z - getLayout(a, device).z
      ),
    [editableLayers, device]
  );

  const groupChildrenMap = useMemo(() => {
    const map = new Map<string, CanvasLayer[]>();
    const byId = new Map(sortedLayers.map((l) => [l.id, l]));
    for (const layer of sortedLayers) {
      if (!layer.groupId) continue;
      if (!byId.has(layer.groupId)) continue;
      const list = map.get(layer.groupId) ?? [];
      list.push(layer);
      map.set(layer.groupId, list);
    }
    return map;
  }, [sortedLayers]);

  const visibleRows = useMemo(() => {
    const rows: Array<{ layer: CanvasLayer; indent: number; isGroup: boolean }> = [];
    const childIds = new Set<string>();
    for (const children of groupChildrenMap.values()) {
      for (const child of children) childIds.add(child.id);
    }

    for (const layer of sortedLayers) {
      if (childIds.has(layer.id)) continue;
      if (layer.content.kind === "group") {
        rows.push({ layer, indent: 0, isGroup: true });
        if (!collapsedGroupIds.has(layer.id)) {
          const children = groupChildrenMap.get(layer.id) ?? [];
          for (const child of children) {
            rows.push({ layer: child, indent: 1, isGroup: false });
          }
        }
      } else {
        rows.push({ layer, indent: 0, isGroup: false });
      }
    }
    return rows;
  }, [sortedLayers, groupChildrenMap, collapsedGroupIds]);

  const handleSelect = (layerId: string, e: MouseEvent) => {
    const clicked = editableLayers.find((l) => l.id === layerId);
    if (clicked?.content.kind === "group") {
      const childIds = editableLayers.filter((l) => l.groupId === clicked.id).map((l) => l.id);
      const ids = [clicked.id, ...childIds];
      select(ids, clicked.id);
      return;
    }

    if (e.shiftKey) {
      const ids = selection.ids.includes(layerId)
        ? selection.ids.filter((id) => id !== layerId)
        : [...selection.ids, layerId];
      select(ids, layerId);
    } else {
      select([layerId], layerId);
    }
  };

  const handleDoubleClick = (layer: CanvasLayer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameLayer(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderLayers(String(active.id), String(over.id));
  };

  const handleSectionDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setSectionDragOverId(over ? String(over.id) : null);
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setSectionDragOverId(null);
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const targetIndex = sections.findIndex((s) => s.id === overId);
    if (targetIndex < 0) return;
    moveSectionToIndex(activeId, targetIndex);
  };

  const handleSectionLayerDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setSectionLayerDragOverId(over ? String(over.id) : null);
  };

  const handleSectionLayerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setSectionLayerDragOverId(null);
    if (!selectedSectionId || !over || active.id === over.id) return;
    reorderSectionLayers(selectedSectionId, String(active.id), String(over.id));
  };

  const startSectionRename = (sectionId: string, currentName: string) => {
    setEditingSectionId(sectionId);
    setEditingSectionName(currentName);
    setEditingSectionOriginalName(currentName);
  };

  const commitSectionRename = () => {
    if (editingSectionId && editingSectionName.trim()) {
      renameSection(editingSectionId, editingSectionName.trim());
    }
    setEditingSectionId(null);
    setEditingSectionName("");
    setEditingSectionOriginalName("");
  };

  const cancelSectionRename = () => {
    setEditingSectionId(null);
    setEditingSectionName(editingSectionOriginalName);
    setEditingSectionOriginalName("");
  };

  const toggleGroupCollapse = (id: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside
      className="flex h-full min-h-0 flex-col bg-[var(--ui-panel)] text-[var(--ui-text)]"
      style={{ width: 240, minWidth: 200, maxWidth: 300 }}
    >
      <div className="border-b border-[var(--ui-border)] bg-[var(--surface-2)] px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold">レイヤー</span>
          <span className="text-[11px] text-[var(--ui-muted)]">{sortedLayers.length}</span>
        </div>
      </div>

      {mode === "sections" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-[var(--ui-border)] px-2 py-2 space-y-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-[var(--ui-muted)]">Sections</span>
              <button
                type="button"
                className="rounded border border-[var(--ui-border)] px-1.5 py-0.5 text-[10px] hover:bg-[var(--surface-2)]"
                onClick={() => addSection()}
              >
                + Add
              </button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragOver={handleSectionDragOver}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
                {sections.map((section, index) => (
                  <SortableSectionRow
                    key={section.id}
                    id={section.id}
                    name={section.name ?? section.title ?? `セクション ${index + 1}`}
                    isSelected={selectedSectionId === section.id}
                    isDragOver={sectionDragOverId === section.id}
                    isEditing={editingSectionId === section.id}
                    editName={editingSectionName}
                    onEditNameChange={setEditingSectionName}
                    onEditStart={startSectionRename}
                    onEditCommit={commitSectionRename}
                    onEditCancel={cancelSectionRename}
                    onSelect={selectSection}
                    onDuplicate={() => duplicateSection(section.id)}
                    onMoveUp={() => moveSection(section.id, "up")}
                    onMoveDown={() => moveSection(section.id, "down")}
                    onRemove={() => {
                      if (window.confirm("このセクションを削除しますか？")) {
                        removeSection(section.id);
                      }
                    }}
                    disableUp={index === 0}
                    disableDown={index === sections.length - 1}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-[var(--ui-border)]">
            <div className="border-b border-[var(--ui-border)] bg-[var(--surface-2)] px-2 py-1.5 text-[11px] text-[var(--ui-muted)]">
              {selectedSection
                ? `Layers: ${selectedSection.name ?? selectedSection.title}`
                : "Layers"}
            </div>
            <div className="flex-1 overflow-y-auto">
              {!selectedSection ? (
                <div className="px-3 py-6 text-center text-[11px] text-[var(--ui-muted)]">
                  セクションを選択してください
                </div>
              ) : selectedSectionLayers.length === 0 ? (
                <div className="px-3 py-6 text-center text-[11px] text-[var(--ui-muted)]">
                  レイヤーがありません
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragOver={handleSectionLayerDragOver}
                  onDragEnd={handleSectionLayerDragEnd}
                >
                  <SortableContext items={selectedSectionLayers.map((layer) => layer.id)} strategy={verticalListSortingStrategy}>
                    {selectedSectionLayers.map((layer) => (
                      <SortableSectionLayerRow
                        key={layer.id}
                        layer={layer}
                        isSelected={selection.ids.includes(layer.id)}
                        isDragOver={sectionLayerDragOverId === layer.id}
                        onSelect={handleSelect}
                        onToggleHidden={toggleHidden}
                        onToggleLock={toggleLock}
                        onRemove={removeLayer}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleRows.map((row) => row.layer.id)} strategy={verticalListSortingStrategy}>
              {visibleRows.map((row) => (
                <SortableLayerRow
                  key={row.layer.id}
                  layer={row.layer}
                  isSelected={selection.ids.includes(row.layer.id)}
                  indent={row.indent}
                  isGroup={row.isGroup}
                  isCollapsed={collapsedGroupIds.has(row.layer.id)}
                  onToggleCollapse={toggleGroupCollapse}
                  editingId={editingId}
                  editName={editName}
                  setEditName={setEditName}
                  setEditingId={setEditingId}
                  commitRename={commitRename}
                  onSelect={handleSelect}
                  onDoubleClick={handleDoubleClick}
                  toggleHidden={toggleHidden}
                  toggleLock={toggleLock}
                  bringForward={bringForward}
                  sendBackward={sendBackward}
                  duplicateLayer={duplicateLayer}
                  removeLayer={removeLayer}
                />
              ))}
            </SortableContext>
          </DndContext>

          {sortedLayers.length === 0 ? (
            <div className="px-3 py-6 text-center text-[11px] text-[var(--ui-muted)]">
              レイヤーがありません
            </div>
          ) : null}
        </div>
      )}
    </aside>
  );
}
