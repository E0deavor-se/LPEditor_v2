"use client";

import type { SyntheticEvent } from "react";
import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import SectionAppearanceEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionAppearanceEditor";
import { useTextSelection } from "@/src/components/editor/TextSelectionContext";
import type { ContentItem, SectionBase } from "@/src/types/project";

type RankingColumn = { key: string; label: string };

type RankingRow = {
  id: string;
  rank: string;
  values: string[];
};

type RankingTableEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  onPatchContent: (patch: { items?: ContentItem[] }) => void;
};

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const reorderArray = <T,>(arr: T[], from: number, to: number) => {
  if (to < 0 || to >= arr.length) {
    return arr;
  }
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  if (!moved) {
    return arr;
  }
  next.splice(to, 0, moved);
  return next;
};

const normalizeRow = (row: unknown, index: number, columnCount: number): RankingRow => {
  if (Array.isArray(row)) {
    const values = row.map((value) => String(value ?? ""));
    return {
      id: `rank_${index + 1}`,
      rank: String(index + 1),
      values: values
        .slice(0, columnCount)
        .concat(Array(Math.max(0, columnCount - values.length)).fill("")),
    };
  }

  const entry = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const rawValues = Array.isArray(entry.values)
    ? entry.values.map((value) => String(value ?? ""))
    : [
        String(entry.product ?? entry.label ?? ""),
        String(entry.description ?? entry.value ?? ""),
      ];

  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : createId("row"),
    rank: String(entry.rank ?? index + 1),
    values: rawValues
      .slice(0, columnCount)
      .concat(Array(Math.max(0, columnCount - rawValues.length)).fill("")),
  };
};

const rowToStored = (row: RankingRow) => ({
  id: row.id,
  rank: row.rank,
  values: row.values,
});

export default function RankingTableEditor({
  section,
  disabled,
  onPatchData,
  onPatchContent,
}: RankingTableEditorProps) {
  const { saveSelection } = useTextSelection();
  const data = section.data as Record<string, unknown>;
  const items = (section.content?.items ?? []) as ContentItem[];
  const titleItem = items.find((item) => item.type === "title");

  const columns: RankingColumn[] = Array.isArray(data.columns)
    ? (data.columns as Array<{ key?: string; label?: string }>).map((col, i) => ({
        key: col.key || `col_${i + 1}`,
        label: col.label || `列${i + 1}`,
      }))
    : [
        { key: "amount", label: "決済金額" },
        { key: "count", label: "品数" },
      ];

  const rows: RankingRow[] = Array.isArray(data.rows)
    ? (data.rows as unknown[]).map((row, i) => normalizeRow(row, i, columns.length))
    : [];

  const patchRows = (nextRows: RankingRow[]) => {
    onPatchData({ rows: nextRows.map((row) => rowToStored(row)) });
  };

  const patchRow = (index: number, patch: Partial<RankingRow>) => {
    patchRows(rows.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry)));
  };

  const patchColumns = (nextColumns: RankingColumn[]) => {
    const safeColumns = nextColumns.length > 0
      ? nextColumns
      : [{ key: "amount", label: "決済金額" }];
    onPatchData({ columns: safeColumns });
    patchRows(
      rows.map((row) => ({
        ...row,
        values: row.values
          .slice(0, safeColumns.length)
          .concat(Array(Math.max(0, safeColumns.length - row.values.length)).fill("")),
      }))
    );
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
      <InspectorSection title="ランキング情報">
        <InspectorField label="タイトル">
          <InspectorInput
            type="text"
            value={titleItem && titleItem.type === "title" ? titleItem.text : String(data.title ?? "")}
            onChange={(event) => {
              const nextTitle = event.target.value;
              onPatchData({ title: nextTitle });
              if (titleItem && titleItem.type === "title") {
                onPatchContent({
                  items: items.map((item) =>
                    item.id === titleItem.id && item.type === "title"
                      ? { ...item, text: nextTitle }
                      : item
                  ),
                });
              }
            }}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="集計期間">
          <InspectorInput
            type="text"
            value={String(data.period ?? "")}
            onChange={(event) => onPatchData({ period: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="時点">
          <InspectorInput
            type="text"
            value={String(data.date ?? "")}
            onChange={(event) => onPatchData({ date: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <label className="ui-field">
          <span className="ui-field-label">注記</span>
          <textarea
            className="ui-textarea min-h-[90px] text-[12px]"
            value={Array.isArray(data.notes) ? (data.notes as string[]).join("\n") : ""}
            onChange={(event) => {
              const next = event.target.value
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
              onPatchData({ notes: next });
            }}
            disabled={disabled}
          />
        </label>
      </InspectorSection>

      <InspectorSection title="列">
        <button
          type="button"
          className="ui-button h-7 px-2 text-[11px]"
          onClick={() => {
            patchColumns([
              ...columns,
              { key: `col_${columns.length + 1}`, label: `列${columns.length + 1}` },
            ]);
          }}
          disabled={disabled}
        >
          列を追加
        </button>

        <div className="mt-2 space-y-2">
          {columns.map((column, columnIndex) => (
            <div key={column.key} className="rounded-md border border-[var(--ui-border)]/60 p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] text-[var(--ui-muted)]">列 {columnIndex + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="ui-button h-6 w-6 px-0"
                    onClick={() => patchColumns(reorderArray(columns, columnIndex, columnIndex - 1))}
                    disabled={disabled || columnIndex === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="ui-button h-6 w-6 px-0"
                    onClick={() => patchColumns(reorderArray(columns, columnIndex, columnIndex + 1))}
                    disabled={disabled || columnIndex >= columns.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="ui-button h-6 w-6 px-0"
                    onClick={() => patchColumns(columns.filter((_, i) => i !== columnIndex))}
                    disabled={disabled || columns.length <= 1}
                  >
                    ×
                  </button>
                </div>
              </div>
              <InspectorField label="列ラベル">
                <InspectorInput
                  type="text"
                  value={column.label}
                  onChange={(event) =>
                    patchColumns(
                      columns.map((entry, i) =>
                        i === columnIndex ? { ...entry, label: event.target.value } : entry
                      )
                    )
                  }
                  disabled={disabled}
                />
              </InspectorField>
            </div>
          ))}
        </div>
      </InspectorSection>

      <InspectorSection title="行">
        <button
          type="button"
          className="ui-button h-7 px-2 text-[11px]"
          onClick={() =>
            patchRows([
              ...rows,
              {
                id: createId("row"),
                rank: String(rows.length + 1),
                values: Array(columns.length).fill(""),
              },
            ])
          }
          disabled={disabled}
        >
          行を追加
        </button>

        <div className="mt-2 space-y-2">
          {rows.length === 0 ? (
            <div className="text-[11px] text-[var(--ui-muted)]">行がありません。</div>
          ) : (
            rows.map((row, rowIndex) => (
              <div key={row.id} className="rounded-md border border-[var(--ui-border)]/60 p-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-[var(--ui-muted)]">行 {rowIndex + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="ui-button h-6 w-6 px-0"
                      onClick={() => patchRows(reorderArray(rows, rowIndex, rowIndex - 1))}
                      disabled={disabled || rowIndex === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ui-button h-6 w-6 px-0"
                      onClick={() => patchRows(reorderArray(rows, rowIndex, rowIndex + 1))}
                      disabled={disabled || rowIndex >= rows.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="ui-button h-6 w-6 px-0"
                      onClick={() => patchRows(rows.filter((_entry, i) => i !== rowIndex))}
                      disabled={disabled}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <InspectorField label="順位">
                  <InspectorInput
                    type="text"
                    value={row.rank}
                    onChange={(event) => patchRow(rowIndex, { rank: event.target.value })}
                    disabled={disabled}
                  />
                </InspectorField>

                {columns.map((column, colIndex) => (
                  <InspectorField key={`${row.id}-${column.key}`} label={column.label || `列${colIndex + 1}`}>
                    <InspectorInput
                      type="text"
                      value={row.values[colIndex] ?? ""}
                      onChange={(event) => {
                        const nextValues = [...row.values];
                        nextValues[colIndex] = event.target.value;
                        patchRow(rowIndex, { values: nextValues });
                      }}
                      disabled={disabled}
                    />
                  </InspectorField>
                ))}
              </div>
            ))
          )}
        </div>
      </InspectorSection>

      <SectionAppearanceEditor
        section={section}
        disabled={disabled}
        onPatchData={onPatchData}
      />
    </div>
  );
}
