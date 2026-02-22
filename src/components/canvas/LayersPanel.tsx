/* ───────────────────────────────────────────────
   Canvas Layers Panel – 左パネル
   DnD 並び替え (上が前面)
   ─────────────────────────────────────────────── */

"use client";

import { useMemo, useState, type MouseEvent } from "react";
import {
  Eye, EyeOff, Lock, Unlock,
  ChevronUp, ChevronDown, Type, Image, Square, MousePointer2, Layers,
  Copy, Trash2,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCanvasEditorStore } from "@/src/store/canvasEditorStore";
import type { CanvasLayer } from "@/src/types/canvas";
import { getLayout } from "@/src/types/canvas";

const ICON_SIZE = 14;

const typeIcon = (type: string) => {
  switch (type) {
    case "text": return <Type size={ICON_SIZE} />;
    case "image": return <Image size={ICON_SIZE} />;
    case "shape": return <Square size={ICON_SIZE} />;
    case "button": return <MousePointer2 size={ICON_SIZE} />;
    default: return <Layers size={ICON_SIZE} />;
  }
};

type LayerRowProps = {
  layer: CanvasLayer;
  isSelected: boolean;
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

const SortableLayerRow = ({
  layer,
  isSelected,
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

export default function CanvasLayersPanel() {
  const doc = useCanvasEditorStore((s) => s.document);
  const device = useCanvasEditorStore((s) => s.device);
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const sortedLayers = useMemo(
    () =>
      [...doc.layers].sort(
        (a, b) => getLayout(b, device).z - getLayout(a, device).z
      ),
    [doc.layers, device]
  );

  const handleSelect = (layerId: string, e: MouseEvent) => {
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

  return (
    <aside
      className="flex h-full min-h-0 flex-col bg-[var(--ui-panel)] text-[var(--ui-text)]"
      style={{ width: 240, minWidth: 200, maxWidth: 300 }}
    >
      <div className="border-b border-[var(--ui-border)] bg-[var(--surface-2)] px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold">レイヤー</span>
          <span className="text-[11px] text-[var(--ui-muted)]">{doc.layers.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedLayers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {sortedLayers.map((layer) => (
              <SortableLayerRow
                key={layer.id}
                layer={layer}
                isSelected={selection.ids.includes(layer.id)}
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

        {doc.layers.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-[var(--ui-muted)]">
            レイヤーがありません
          </div>
        ) : null}
      </div>
    </aside>
  );
}
