"use client";

import { useEffect, useMemo, useState, type KeyboardEvent, type SyntheticEvent } from "react";
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
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Inspector2Block from "@/src/components/layout-v2/inspector/Inspector2Block";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorSelect from "@/src/components/inspector/InspectorSelect";
import InspectorColorInput from "@/src/components/inspector/InspectorColorInput";
import InspectorTextarea from "@/src/components/inspector/InspectorTextarea";
import SectionAppearanceEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionAppearanceEditor";
import { useTextSelection } from "@/src/components/editor/TextSelectionContext";
import { autoGrowTextarea } from "@/src/lib/editor/textareaAutoGrow";
import type { SectionBase } from "@/src/types/project";

type TabData = {
  id: string;
  label: string;
  contentTitle: string;
  notes: string[];
};

type TabStyle = {
  variant: "simple" | "sticky" | "underline" | "popout";
  showBorder: boolean;
  inactiveBg: string;
  activeBg: string;
  contentBg: string;
};

type TabbedNotesEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  onRenameSection?: (name: string) => void;
  onToggleVisible?: () => void;
};

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const TAB_VARIANTS: Array<{ id: TabStyle["variant"]; label: string }> = [
  { id: "simple", label: "シンプル" },
  { id: "sticky", label: "スティッキー" },
  { id: "underline", label: "アンダーライン" },
  { id: "popout", label: "ポップアウト" },
];

const isTabVariant = (value: unknown): value is TabStyle["variant"] =>
  value === "simple" || value === "sticky" || value === "underline" || value === "popout";

const normalizeTab = (value: unknown, index: number): TabData => {
  const entry = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const legacyItems = Array.isArray(entry.items) ? entry.items : [];
  const legacyFootnote = typeof entry.footnote === "string" ? entry.footnote : "";
  const notes = Array.isArray(entry.notes)
    ? entry.notes.map((note) => String(note ?? "").replace(/\r/g, ""))
    : [
        ...legacyItems.map((item) => {
          const noteEntry = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return String(noteEntry.text ?? "").replace(/\r/g, "");
        }),
        legacyFootnote,
      ].filter((note) => note.trim().length > 0);
  return {
    id: typeof entry.id === "string" && entry.id.trim() ? entry.id : `tab_${index + 1}`,
    label:
      typeof entry.label === "string" && entry.label.trim()
        ? entry.label
        : String(entry.labelTop ?? entry.labelBottom ?? `タブ${index + 1}`),
    contentTitle:
      typeof entry.contentTitle === "string" && entry.contentTitle.trim().length > 0
        ? entry.contentTitle
        : String(entry.intro ?? ""),
    notes,
  };
};

const normalizeNotes = (notes: string[]) => {
  const next = notes.map((note) => note.replace(/\r/g, ""));
  while (next.length > 1 && next[next.length - 1].trim() === "") {
    next.pop();
  }
  return next;
};

const isNoBullet = (value: string) => value.trim().startsWith("※");

const resizeTextarea = (element: HTMLTextAreaElement | null) =>
  autoGrowTextarea(element, 44);

type SortableTabRowProps = {
  tab: TabData;
  index: number;
  selected: boolean;
  disabled: boolean;
  onSelect: (index: number) => void;
  onRename: (index: number, label: string) => void;
  onRemove: (index: number) => void;
};

function SortableTabRow({ tab, index, selected, disabled, onSelect, onRename, onRemove }: SortableTabRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className={`flex items-center gap-1.5 rounded border px-1.5 py-1 ${selected ? "border-[var(--ui-accent)]/60 bg-[var(--ui-panel)]/65" : "border-[var(--ui-border)]/50"}`}
    >
      <button
        type="button"
        className="inline-flex h-6 w-3 cursor-grab items-center justify-center text-[11px] text-[var(--ui-muted)]"
        disabled={disabled}
        title="ドラッグして並び替え"
        aria-label="ドラッグして並び替え"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <button
        type="button"
        className="ui-button h-6 px-1.5 text-[10px]"
        onClick={() => onSelect(index)}
        disabled={disabled}
      >
        編集
      </button>
      <InspectorInput
        type="text"
        value={tab.label}
        onChange={(event) => onRename(index, event.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        className="ui-button h-6 w-6 px-0 text-[12px]"
        onClick={() => onRemove(index)}
        disabled={disabled}
      >
        ×
      </button>
    </div>
  );
}

export default function TabbedNotesEditor({
  section,
  disabled,
  onPatchData,
  onRenameSection,
  onToggleVisible,
}: TabbedNotesEditorProps) {
  const { saveSelection } = useTextSelection();
  const data = section.data as Record<string, unknown>;
  const tabs = useMemo(
    () => (Array.isArray(data.tabs) ? data.tabs : []).map((entry, index) => normalizeTab(entry, index)),
    [data.tabs]
  );
  const initialTabIndexRaw =
    typeof data.initialTabIndex === "number" && Number.isFinite(data.initialTabIndex)
      ? Math.floor(data.initialTabIndex)
      : 0;
  const initialTabIndex = tabs.length === 0 ? 0 : clamp(initialTabIndexRaw, 0, tabs.length - 1);
  const [editingTabIndex, setEditingTabIndex] = useState(initialTabIndex);
  const safeEditingTabIndex = tabs.length === 0 ? 0 : clamp(editingTabIndex, 0, tabs.length - 1);

  useEffect(() => {
    const areas = document.querySelectorAll<HTMLTextAreaElement>("[data-tab-note-item]");
    areas.forEach((area) => resizeTextarea(area));
  }, [safeEditingTabIndex, tabs]);

  const rawTabStyle = data.tabStyle && typeof data.tabStyle === "object"
    ? (data.tabStyle as Record<string, unknown>)
    : {};
  const tabStyle: TabStyle = {
    variant: isTabVariant(rawTabStyle.variant) ? rawTabStyle.variant : "simple",
    showBorder: rawTabStyle.showBorder !== false,
    inactiveBg: typeof rawTabStyle.inactiveBg === "string" ? rawTabStyle.inactiveBg : "#DDDDDD",
    activeBg: typeof rawTabStyle.activeBg === "string" ? rawTabStyle.activeBg : "#000000",
    contentBg: typeof rawTabStyle.contentBg === "string" ? rawTabStyle.contentBg : "#FFFFFF",
  };
  const selectedTab = tabs[safeEditingTabIndex];

  const patchTabs = (nextTabs: TabData[], nextInitialTabIndex?: number) => {
    if (nextTabs.length === 0) {
      onPatchData({ tabs: [], initialTabIndex: 0 });
      return;
    }
    const initial =
      typeof nextInitialTabIndex === "number"
        ? clamp(nextInitialTabIndex, 0, nextTabs.length - 1)
        : clamp(initialTabIndex, 0, nextTabs.length - 1);
    onPatchData({
      tabs: nextTabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        contentTitle: tab.contentTitle,
        notes: normalizeNotes(tab.notes),
      })),
      initialTabIndex: initial,
    });
  };

  const patchTabStyle = (patch: Partial<TabStyle>) => {
    onPatchData({ tabStyle: { ...tabStyle, ...patch } });
  };

  const renderColorField = (label: string, key: "inactiveBg" | "activeBg" | "contentBg") => (
    <InspectorField label={label}>
      <div className="flex items-center gap-2">
        <InspectorColorInput
          value={tabStyle[key]}
          onChange={(event) => patchTabStyle({ [key]: event.target.value })}
          disabled={disabled}
        />
        <InspectorInput
          type="text"
          value={tabStyle[key]}
          onChange={(event) => patchTabStyle({ [key]: event.target.value })}
          disabled={disabled}
        />
      </div>
    </InspectorField>
  );

  const updateTab = (index: number, patch: Partial<TabData>, nextInitialTabIndex?: number) => {
    const nextTabs = tabs.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry));
    patchTabs(nextTabs, nextInitialTabIndex);
  };

  const addTab = () => {
    const nextTabs = [
      ...tabs,
      {
        id: createId("tab"),
        label: `タブ${tabs.length + 1}`,
        contentTitle: "",
        notes: [""],
      },
    ];
    patchTabs(nextTabs);
    setEditingTabIndex(nextTabs.length - 1);
  };

  const removeTab = (index: number) => {
    if (tabs.length <= 1) {
      return;
    }
    const nextTabs = tabs.filter((_tab, tabIndex) => tabIndex !== index);
    const nextEditing = clamp(editingTabIndex >= index ? editingTabIndex - 1 : editingTabIndex, 0, nextTabs.length - 1);
    setEditingTabIndex(nextEditing);
    const nextInitial =
      initialTabIndex === index
        ? nextEditing
        : initialTabIndex > index
        ? initialTabIndex - 1
        : initialTabIndex;
    patchTabs(nextTabs, nextInitial);
  };

  const updateNote = (tabIndex: number, noteIndex: number, value: string) => {
    const tab = tabs[tabIndex];
    if (!tab) {
      return;
    }
    const nextNotes = [...tab.notes];
    nextNotes[noteIndex] = value;
    updateTab(tabIndex, { notes: nextNotes });
  };

  const addNote = (tabIndex: number) => {
    const tab = tabs[tabIndex];
    if (!tab) {
      return;
    }
    updateTab(tabIndex, { notes: [...tab.notes, ""] });
  };

  const removeNote = (tabIndex: number, noteIndex: number) => {
    const tab = tabs[tabIndex];
    if (!tab) {
      return;
    }
    const nextNotes = tab.notes.filter((_note, index) => index !== noteIndex);
    updateTab(tabIndex, { notes: nextNotes.length > 0 ? nextNotes : [""] });
  };

  const handleNoteKeyDown = (tabIndex: number, noteIndex: number) => (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    const tab = tabs[tabIndex];
    if (!tab) {
      return;
    }
    const currentValue = tab.notes[noteIndex] ?? "";
    const start = event.currentTarget.selectionStart ?? currentValue.length;
    const end = event.currentTarget.selectionEnd ?? start;
    const before = currentValue.slice(0, start);
    const after = currentValue.slice(end);
    const nextNotes = [...tab.notes];
    nextNotes[noteIndex] = before;
    nextNotes.splice(noteIndex + 1, 0, after);
    updateTab(tabIndex, { notes: nextNotes });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
    const newIndex = tabs.findIndex((tab) => tab.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    const nextTabs = arrayMove(tabs, oldIndex, newIndex);
    const nextEditing =
      editingTabIndex === oldIndex
        ? newIndex
        : editingTabIndex === newIndex
        ? oldIndex
        : editingTabIndex;
    const nextInitial =
      initialTabIndex === oldIndex
        ? newIndex
        : initialTabIndex === newIndex
        ? oldIndex
        : initialTabIndex;
    setEditingTabIndex(nextEditing);
    patchTabs(nextTabs, nextInitial);
  };

  const captureSelection = (event: SyntheticEvent<HTMLDivElement>) => {
    saveSelection(section.id, event.target as EventTarget | null);
  };

  return (
    <div
      className="border-t border-[var(--ui-border)]/60"
      onMouseUpCapture={captureSelection}
      onKeyUpCapture={captureSelection}
    >
      <Inspector2Block block="basic">
        <InspectorField label="セクション名">
          <InspectorInput
            type="text"
            value={String(section.name ?? "")}
            onChange={(event) => onRenameSection?.(event.target.value)}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="初期表示タブ">
          <InspectorSelect
            value={String(initialTabIndex)}
            onChange={(event) => onPatchData({ initialTabIndex: Number(event.target.value || 0) })}
            disabled={disabled || tabs.length === 0}
          >
            {tabs.map((tab, index) => (
              <option key={tab.id} value={String(index)}>
                {tab.label || `タブ${index + 1}`}
              </option>
            ))}
          </InspectorSelect>
        </InspectorField>

        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">表示</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={section.visible !== false}
            onChange={() => onToggleVisible?.()}
            disabled={disabled || !onToggleVisible}
          />
        </label>
      </Inspector2Block>

      <Inspector2Block block="content" summary="タブ管理">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] text-[var(--ui-muted)]">タブ一覧</span>
          <button
            type="button"
            className="ui-button h-6 px-2 text-[10px]"
            onClick={addTab}
            disabled={disabled}
          >
            + タブ追加
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tabs.map((tab) => tab.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {tabs.map((tab, index) => (
                <SortableTabRow
                  key={tab.id}
                  tab={tab}
                  index={index}
                  selected={index === safeEditingTabIndex}
                  disabled={disabled}
                  onSelect={setEditingTabIndex}
                  onRename={(tabIndex, label) => updateTab(tabIndex, { label })}
                  onRemove={removeTab}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </Inspector2Block>

      <Inspector2Block block="details" summary="タブ内容">
        {!selectedTab ? (
          <div className="text-[11px] text-[var(--ui-muted)]">タブがありません。</div>
        ) : (
          <>
            <InspectorField label="タイトル">
              <InspectorInput
                type="text"
                value={selectedTab.contentTitle}
                onChange={(event) => updateTab(safeEditingTabIndex, { contentTitle: event.target.value })}
                disabled={disabled}
              />
            </InspectorField>

            <div className="space-y-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] text-[var(--ui-muted)]">注意文言</span>
                <button
                  type="button"
                  className="ui-button h-6 px-2 text-[10px]"
                  onClick={() => addNote(safeEditingTabIndex)}
                  disabled={disabled}
                >
                  + 項目追加
                </button>
              </div>

              {(selectedTab.notes.length > 0 ? selectedTab.notes : [""]).map((note, noteIndex) => (
                <div key={`${selectedTab.id}_${noteIndex}`} className="flex items-start gap-1.5 rounded-sm py-0.5">
                  <span className="mt-1.5 flex h-5 w-2.5 flex-shrink-0 items-start justify-center">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{
                        background: !isNoBullet(note) ? "currentColor" : "transparent",
                        opacity: !isNoBullet(note) ? 0.9 : 0,
                      }}
                    />
                  </span>
                  <InspectorTextarea
                    data-tab-note-item={noteIndex}
                    rows={2}
                    value={note}
                    onChange={(event) => updateNote(safeEditingTabIndex, noteIndex, event.target.value)}
                    onInput={(event) => resizeTextarea(event.currentTarget)}
                    onKeyDown={handleNoteKeyDown(safeEditingTabIndex, noteIndex)}
                    disabled={disabled}
                    className="min-h-[44px] resize-none overflow-hidden border-[var(--ui-border)]/40 bg-transparent px-1.5 py-1 text-[12px] leading-5"
                    placeholder="Enter: 次項目 / Shift+Enter: 改行"
                  />
                  <button
                    type="button"
                    className="ui-button mt-1 h-6 w-6 px-0 text-[13px] leading-none"
                    onClick={() => removeNote(safeEditingTabIndex, noteIndex)}
                    disabled={disabled}
                    title="項目削除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-2 text-[11px] text-[var(--ui-muted)]">Enter: 次項目 / Shift+Enter: 改行 / 「※」始まりは箇条書きなし</p>
          </>
        )}
      </Inspector2Block>

      <Inspector2Block block="display">
        <InspectorField label="タブスタイル">
          <InspectorSelect
            value={tabStyle.variant}
            onChange={(event) => {
              if (!isTabVariant(event.target.value)) {
                return;
              }
              patchTabStyle({ variant: event.target.value });
            }}
            disabled={disabled}
          >
            {TAB_VARIANTS.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label}
              </option>
            ))}
          </InspectorSelect>
        </InspectorField>

        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">枠線表示</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={tabStyle.showBorder}
            onChange={(event) => patchTabStyle({ showBorder: event.target.checked })}
            disabled={disabled}
          />
        </label>
      </Inspector2Block>

      <Inspector2Block block="design">
        {renderColorField("タブ背景色", "inactiveBg")}
        {renderColorField("アクティブ色", "activeBg")}
        {renderColorField("コンテンツ背景", "contentBg")}
      </Inspector2Block>

      <Inspector2Block block="details" summary="互換性メモ">
        <div className="text-[11px] text-[var(--ui-muted)]">旧データ（labelTop/items）を開いた場合も、新モデル（label/contentTitle/notes）として保存されます。</div>
      </Inspector2Block>

      <SectionAppearanceEditor
        section={section}
        disabled={disabled}
        onPatchData={onPatchData}
      />
    </div>
  );
}
