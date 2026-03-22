"use client";

import { useEffect, type KeyboardEvent, type SyntheticEvent } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorTextarea from "@/src/components/inspector/InspectorTextarea";
import Inspector2Block from "@/src/components/layout-v2/inspector/Inspector2Block";
import SectionAppearanceEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionAppearanceEditor";
import SectionCommonFields from "@/src/components/layout-v2/inspector/sectionSpecific/SectionCommonFields";
import SectionOptionalBlocksEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionOptionalBlocksEditor";
import { useTextSelection } from "@/src/components/editor/TextSelectionContext";
import { autoGrowTextarea } from "@/src/lib/editor/textareaAutoGrow";
import type { ContentItem, SectionBase } from "@/src/types/project";

type NotesEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  onPatchContent: (patch: {
    items?: ContentItem[];
    buttons?: Array<{ id: string; label: string; href: string; variant?: "primary" | "secondary" }>;
    media?: Array<{ id: string; imageUrl: string; alt?: string; caption?: string; width?: number; align?: "left" | "center" | "right" }>;
  }) => void;
  onRenameSection?: (name: string) => void;
  onToggleVisible?: () => void;
};

type EditableNoteItem = {
  id: string;
  text: string;
};

const createLineId = () => `line_${Math.random().toString(36).slice(2, 10)}`;
const createItemId = () => `item_${Math.random().toString(36).slice(2, 10)}`;

const normalizeItems = (values: EditableNoteItem[], preserveTrailingEmpty = false): EditableNoteItem[] => {
  const normalized = values.map((value) => ({
    id: value.id,
    text: value.text.replace(/\r/g, ""),
  }));
  if (!preserveTrailingEmpty) {
    while (normalized.length > 1 && normalized[normalized.length - 1].text.trim() === "") {
      normalized.pop();
    }
  }
  return normalized;
};

const isNoteWithoutBullet = (value: string) => value.trim().startsWith("※");

const resizeTextarea = (element: HTMLTextAreaElement | null) =>
  autoGrowTextarea(element, 44);

type SortableNoteRowProps = {
  item: EditableNoteItem;
  index: number;
  bulletEnabled: boolean;
  disabled: boolean;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onKeyDown: (index: number) => (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

function SortableNoteRow({
  item,
  index,
  bulletEnabled,
  disabled,
  onUpdate,
  onRemove,
  onKeyDown,
}: SortableNoteRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="flex items-start gap-1.5 rounded-sm py-0.5"
    >
      <button
        type="button"
        className="mt-1 inline-flex h-5 w-3 cursor-grab items-center justify-center text-[11px] text-[var(--ui-muted)]"
        disabled={disabled}
        title="ドラッグして並び替え"
        aria-label="ドラッグして並び替え"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>

      <span className="mt-1.5 flex h-5 w-2.5 flex-shrink-0 items-start justify-center">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            background:
              bulletEnabled && !isNoteWithoutBullet(item.text) ? "currentColor" : "transparent",
            border:
              bulletEnabled && !isNoteWithoutBullet(item.text) ? "none" : "1px solid transparent",
            opacity: bulletEnabled && !isNoteWithoutBullet(item.text) ? 0.9 : 0,
          }}
        />
      </span>

      <InspectorTextarea
        data-legal-note-item={index}
        rows={2}
        value={item.text}
        onChange={(event) => onUpdate(index, event.target.value)}
        onKeyDown={onKeyDown(index)}
        onInput={(event) => resizeTextarea(event.currentTarget)}
        disabled={disabled}
        className="min-h-[44px] resize-none overflow-hidden border-[var(--ui-border)]/40 bg-transparent px-1.5 py-1 text-[12px] leading-5"
        placeholder="Enter: 次項目 / Shift+Enter: 改行"
      />

      <button
        type="button"
        className="ui-button mt-1 h-6 w-6 px-0 text-[13px] leading-none"
        onClick={() => onRemove(index)}
        disabled={disabled}
        title="項目削除"
      >
        ×
      </button>
    </div>
  );
}

export default function NotesEditor({
  section,
  disabled,
  onPatchData,
  onPatchContent,
  onRenameSection,
  onToggleVisible,
}: NotesEditorProps) {
  const { saveSelection } = useTextSelection();
  const data = section.data as Record<string, unknown>;
  const items = (section.content?.items ?? []) as ContentItem[];
  const titleItem = items.find((item) => item.type === "title");
  const textItem = items.find((item) => item.type === "text");

  const heading =
    titleItem && titleItem.type === "title"
      ? String(titleItem.text ?? "")
      : String(data.title ?? "");

  const bulletEnabled = !(data.bullet === false || data.bullet === "none");

  const linesFromContent: EditableNoteItem[] =
    textItem && textItem.type === "text"
      ? textItem.lines.map((line, index) => ({
          id: String(line.id ?? `note_${index}`),
          text: String(line.text ?? ""),
        }))
      : [];

  const linesFromData: EditableNoteItem[] = Array.isArray(data.items)
    ? (data.items as unknown[]).map((entry, index) => {
        if (typeof entry === "string") {
          return { id: `data_${index}`, text: entry.replace(/\r/g, "") };
        }
        if (!entry || typeof entry !== "object") {
          return { id: `data_${index}`, text: "" };
        }
        return {
          id: `data_${index}`,
          text: String((entry as Record<string, unknown>).text ?? "").replace(/\r/g, ""),
        };
      })
    : [];

  const editableItems =
    linesFromData.length > 0 ? linesFromData : linesFromContent.length > 0 ? linesFromContent : [{ id: createLineId(), text: "" }];

  useEffect(() => {
    const areas = document.querySelectorAll<HTMLTextAreaElement>("[data-legal-note-item]");
    areas.forEach((area) => resizeTextarea(area));
  }, [editableItems.length, editableItems.map((item) => item.text).join("\u001f")]);

  const patchAll = (
    next: { heading?: string; noteItems?: EditableNoteItem[]; bulletEnabled?: boolean },
    options?: { preserveTrailingEmpty?: boolean }
  ) => {
    const nextHeading = next.heading ?? heading;
    const nextItems = normalizeItems(
      next.noteItems ?? editableItems,
      options?.preserveTrailingEmpty === true
    );
    const nextBulletEnabled =
      typeof next.bulletEnabled === "boolean" ? next.bulletEnabled : bulletEnabled;

    const toLineBullet = (line: string): "none" | "disc" =>
      nextBulletEnabled && !isNoteWithoutBullet(line) ? "disc" : "none";

    const nextTitleItem =
      titleItem && titleItem.type === "title"
        ? { ...titleItem, text: nextHeading }
        : {
            id: createItemId(),
            type: "title" as const,
            text: nextHeading,
          };

    const nextTextItem = {
      id: textItem && textItem.type === "text" ? textItem.id : createItemId(),
      type: "text" as const,
      lines: nextItems.map((item) => ({
        id: item.id || createLineId(),
        text: item.text,
        marks: {
          bullet: toLineBullet(item.text),
        },
      })),
    };

    const restItems = items.filter((item) => item.type !== "title" && item.type !== "text");

    onPatchContent({
      items: [nextTitleItem, nextTextItem, ...restItems],
    });

    onPatchData({
      title: nextHeading,
      bullet: nextBulletEnabled,
      items: nextItems.map((item) => item.text),
    });
  };

  const updateItem = (index: number, value: string) => {
    const nextItems = [...editableItems];
    nextItems[index] = { ...nextItems[index], text: value };
    patchAll({ noteItems: nextItems });
  };

  const removeItem = (index: number) => {
    const nextItems = editableItems.filter((_, itemIndex) => itemIndex !== index);
    patchAll({ noteItems: nextItems.length > 0 ? nextItems : [{ id: createLineId(), text: "" }] });
  };

  const handleItemKeyDown = (index: number) => (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    if (event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();

    const currentValue = editableItems[index]?.text ?? "";
    const selectionStart = event.currentTarget.selectionStart ?? currentValue.length;
    const selectionEnd = event.currentTarget.selectionEnd ?? selectionStart;
    const before = currentValue.slice(0, selectionStart);
    const after = currentValue.slice(selectionEnd);

    const nextItems = [...editableItems];
    nextItems[index] = { ...nextItems[index], text: before };
    nextItems.splice(index + 1, 0, { id: createLineId(), text: after });
    patchAll({ noteItems: nextItems }, { preserveTrailingEmpty: true });
  };

  const addItem = () => {
    patchAll({ noteItems: [...editableItems, { id: createLineId(), text: "" }] }, { preserveTrailingEmpty: true });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = editableItems.findIndex((item) => item.id === active.id);
    const newIndex = editableItems.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    const nextItems = arrayMove(editableItems, oldIndex, newIndex);
    patchAll({ noteItems: nextItems }, { preserveTrailingEmpty: true });
  };

  const widthValue =
    typeof data.noteWidthPct === "number" && Number.isFinite(data.noteWidthPct)
      ? data.noteWidthPct
      : 100;
  const widthPreset = widthValue >= 100 ? "wide" : "standard";
  const noteTextSizePx =
    typeof data.noteTextSizePx === "number" && Number.isFinite(data.noteTextSizePx)
      ? data.noteTextSizePx
      : 14;

  const captureSelection = (event: SyntheticEvent<HTMLDivElement>) => {
    saveSelection(section.id, event.target as EventTarget | null);
  };

  return (
    <div
      className="border-t border-[var(--ui-border)]/60"
      onMouseUpCapture={captureSelection}
      onKeyUpCapture={captureSelection}
    >
      <SectionCommonFields
        section={section}
        disabled={disabled}
        onRenameSection={onRenameSection}
        onToggleVisible={onToggleVisible}
        onPatchData={onPatchData}
      />

      <Inspector2Block block="basic">
        <InspectorField label="見出し">
          <InspectorInput
            type="text"
            value={heading}
            onChange={(event) => patchAll({ heading: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </Inspector2Block>

      <Inspector2Block block="content">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] text-[var(--ui-muted)]">注意文言</span>
          <button
            type="button"
            className="ui-button h-6 px-2 text-[10px]"
            onClick={addItem}
            disabled={disabled}
          >
            + 項目追加
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={editableItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1.5">
              {editableItems.map((item, index) => (
                <SortableNoteRow
                  key={item.id}
                  item={item}
                  index={index}
                  bulletEnabled={bulletEnabled}
                  disabled={disabled}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  onKeyDown={handleItemKeyDown}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <p className="mt-2 text-[11px] text-[var(--ui-muted)]">Enter: 次項目 / Shift+Enter: 改行 / 「※」始まりは箇条書きなし</p>
      </Inspector2Block>

      <Inspector2Block block="display">
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">箇条書き</span>
          <select
            className="ui-input h-7 w-[120px] text-[11px]"
            value={bulletEnabled ? "on" : "off"}
            onChange={(event) => patchAll({ bulletEnabled: event.target.value === "on" })}
            disabled={disabled}
          >
            <option value="on">ON</option>
            <option value="off">OFF</option>
          </select>
        </label>

        <label className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">表示幅</span>
          <select
            className="ui-input h-7 w-[120px] text-[11px]"
            value={widthPreset}
            onChange={(event) => {
              const next = event.target.value === "wide" ? 100 : 85;
              onPatchData({ noteWidthPct: next });
            }}
            disabled={disabled}
          >
            <option value="standard">標準</option>
            <option value="wide">広め</option>
          </select>
        </label>
      </Inspector2Block>

      <Inspector2Block block="design">
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">文字色</span>
          <InspectorInput
            type="color"
            value={String(data.noteTextColor ?? "#111827")}
            onChange={(event) => onPatchData({ noteTextColor: event.target.value })}
            disabled={disabled}
          />
        </label>
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">背景色</span>
          <InspectorInput
            type="color"
            value={String(data.noteBg ?? "#ffffff")}
            onChange={(event) => onPatchData({ noteBg: event.target.value })}
            disabled={disabled}
          />
        </label>
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">枠線色</span>
          <InspectorInput
            type="color"
            value={String(data.noteBorderColor ?? "#e5e7eb")}
            onChange={(event) => onPatchData({ noteBorderColor: event.target.value })}
            disabled={disabled}
          />
        </label>
      </Inspector2Block>

      <Inspector2Block block="details" summary="高度設定">
        <InspectorField label="文字サイズ(px)">
          <InspectorInput
            type="number"
            min={10}
            max={24}
            step={1}
            value={String(Math.max(10, Math.min(24, noteTextSizePx)))}
            onChange={(event) => {
              const next = Number(event.target.value || 14);
              onPatchData({ noteTextSizePx: Math.max(10, Math.min(24, next)) });
            }}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="余白(px)">
          <InspectorInput
            type="number"
            min={8}
            max={40}
            step={1}
            value={String(
              typeof data.notePaddingPx === "number" && Number.isFinite(data.notePaddingPx)
                ? data.notePaddingPx
                : 24
            )}
            onChange={(event) => {
              const next = Number(event.target.value || 24);
              onPatchData({ notePaddingPx: Math.max(8, Math.min(40, next)) });
            }}
            disabled={disabled}
          />
        </InspectorField>
      </Inspector2Block>

      <SectionOptionalBlocksEditor
        section={section}
        disabled={disabled}
        onPatchContent={onPatchContent}
      />

      <SectionAppearanceEditor
        section={section}
        disabled={disabled}
        onPatchData={onPatchData}
      />
    </div>
  );
}
