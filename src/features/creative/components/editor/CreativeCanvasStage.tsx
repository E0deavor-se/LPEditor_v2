"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { CreativeVariantJson } from "@/src/features/creative/types/layer";

type Props = {
  variantJson: CreativeVariantJson;
  selectedLayerId: string | null;
  zoom: number;
  onSelectLayer: (layerId: string) => void;
  onMoveLayer: (layerId: string, x: number, y: number) => void;
  onResizeLayer: (layerId: string, width: number, height: number) => void;
  onTextEdit: (layerId: string, text: string) => void;
};

type DragState =
  | { mode: "move"; layerId: string; offsetX: number; offsetY: number }
  | { mode: "resize"; layerId: string; startX: number; startY: number; baseW: number; baseH: number }
  | null;

export default function CreativeCanvasStage({
  variantJson,
  selectedLayerId,
  zoom,
  onSelectLayer,
  onMoveLayer,
  onResizeLayer,
  onTextEdit,
}: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const sortedLayers = useMemo(
    () => [...variantJson.layers].sort((a, b) => a.zIndex - b.zIndex),
    [variantJson.layers],
  );

  const commitTextEdit = useCallback(() => {
    if (editingLayerId) {
      onTextEdit(editingLayerId, editingText);
      setEditingLayerId(null);
      setEditingText("");
    }
  }, [editingLayerId, editingText, onTextEdit]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!dragState || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      if (dragState.mode === "move") {
        const rawX = (event.clientX - rect.left) / zoom - dragState.offsetX;
        const rawY = (event.clientY - rect.top) / zoom - dragState.offsetY;
        onMoveLayer(dragState.layerId, rawX, rawY);
      } else {
        const dx = (event.clientX - dragState.startX) / zoom;
        const dy = (event.clientY - dragState.startY) / zoom;
        onResizeLayer(dragState.layerId, dragState.baseW + dx, dragState.baseH + dy);
      }
    },
    [dragState, zoom, onMoveLayer, onResizeLayer],
  );

  return (
    <div
      className="grid place-items-center py-4"
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDragState(null)}
    >
      <div
        ref={stageRef}
        className="relative overflow-hidden rounded bg-white shadow-md"
        style={{
          width: variantJson.width * zoom,
          height: variantJson.height * zoom,
          backgroundColor: variantJson.background.color ?? "#ffffff",
          backgroundImage: variantJson.background.imageUrl
            ? `url(${variantJson.background.imageUrl})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        onClick={() => {
          if (!dragState) {
            onSelectLayer("");
            commitTextEdit();
          }
        }}
      >
        {sortedLayers.map((layer) => {
          const isSelected = selectedLayerId === layer.id;
          const isEditing = editingLayerId === layer.id;
          return (
            <div
              key={layer.id}
              className="absolute"
              style={{
                left: layer.x * zoom,
                top: layer.y * zoom,
                width: layer.width * zoom,
                height: layer.height * zoom,
                outline: isSelected ? "2px solid #2563eb" : "1px solid transparent",
                outlineOffset: isSelected ? 1 : 0,
                cursor: dragState?.mode === "move" ? "grabbing" : "grab",
                zIndex: layer.zIndex,
              }}
              onMouseDown={(event) => {
                if (isEditing) return;
                event.stopPropagation();
                onSelectLayer(layer.id);
                const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                setDragState({
                  mode: "move",
                  layerId: layer.id,
                  offsetX: (event.clientX - rect.left) / zoom,
                  offsetY: (event.clientY - rect.top) / zoom,
                });
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                if (layer.type !== "text") return;
                setEditingLayerId(layer.id);
                setEditingText(layer.text);
              }}
            >
              {layer.type === "text" ? (
                isEditing ? (
                  <textarea
                    className="h-full w-full resize-none border-none bg-white/80 p-0 outline-none"
                    style={{
                      color: layer.color,
                      fontSize: layer.fontSize * zoom,
                      fontWeight: layer.fontWeight ?? 600,
                      lineHeight: 1.15,
                    }}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={commitTextEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEditingLayerId(null);
                      }
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        commitTextEdit();
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <div
                    className="h-full w-full overflow-hidden whitespace-pre-wrap"
                    style={{
                      color: layer.color,
                      fontSize: layer.fontSize * zoom,
                      fontWeight: layer.fontWeight ?? 600,
                      lineHeight: 1.15,
                    }}
                  >
                    {layer.text}
                  </div>
                )
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={layer.imageUrl} alt={layer.type} className="h-full w-full object-cover" draggable={false} />
              )}
              {isSelected && !isEditing ? (
                <button
                  type="button"
                  className="absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-se-resize rounded-full border-2 border-white bg-blue-500 shadow-sm"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setDragState({
                      mode: "resize",
                      layerId: layer.id,
                      startX: event.clientX,
                      startY: event.clientY,
                      baseW: layer.width,
                      baseH: layer.height,
                    });
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
