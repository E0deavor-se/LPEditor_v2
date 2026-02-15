export type CsvImportSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateIdCount: number;
  duplicateRowCount: number;
  missingRequiredHeaders: string[];
  headerOrderValid: boolean;
};

export type CsvLabelStat = {
  column: string;
  truthyCount: number;
  falseyCount: number;
  totalCount: number;
};

export type CsvDuplicateEntry = {
  storeId: string;
  count: number;
  sampleName: string;
  sampleAddress: string;
  rows: Record<string, string>[];
};

export type CsvImportPreview = {
  summary: CsvImportSummary;
  labelStats: CsvLabelStat[];
  duplicates: CsvDuplicateEntry[];
  previewHeaders: string[];
  previewRows: string[][];
  invalidRowIndices: number[];
};

type BuildCsvImportPreviewOptions = {
  headers: string[];
  rows: Record<string, string>[];
  requiredHeaders: string[];
  previewSize?: number;
  previewHeaders?: string[];
  isTruthy: (value: string) => boolean;
};

export const buildCsvImportPreview = ({
  headers,
  rows,
  requiredHeaders,
  previewSize = 12,
  previewHeaders,
  isTruthy,
}: BuildCsvImportPreviewOptions): CsvImportPreview => {
  const missingRequiredHeaders = requiredHeaders.filter(
    (header) => !headers.includes(header)
  );
  const headerOrderValid = requiredHeaders.every(
    (header, index) => headers[index] === header
  );
  const isValidatable = missingRequiredHeaders.length === 0 && headerOrderValid;
  const invalidRowIndices: number[] = [];
  let validRows = 0;
  let invalidRows = 0;

  const storeIdKey = requiredHeaders[0] ?? "";
  const storeNameKey = requiredHeaders[1] ?? "";
  const addressKey = requiredHeaders[3] ?? "";

  if (isValidatable) {
    rows.forEach((row, index) => {
      const isRowValid = requiredHeaders.every((header) => {
        const value = String(row[header] ?? "").trim();
        return value.length > 0;
      });
      if (isRowValid) {
        validRows += 1;
      } else {
        invalidRows += 1;
        invalidRowIndices.push(index);
      }
    });
  } else {
    invalidRows = rows.length;
  }

  const extraColumns = headers.slice(requiredHeaders.length);
  const labelStats = extraColumns.map((column) => {
    let truthyCount = 0;
    let falseyCount = 0;
    let totalCount = 0;
    rows.forEach((row) => {
      const rawValue = String(row[column] ?? "").trim();
      if (!rawValue) {
        falseyCount += 1;
        totalCount += 1;
        return;
      }
      totalCount += 1;
      if (isTruthy(rawValue)) {
        truthyCount += 1;
      } else {
        falseyCount += 1;
      }
    });
    return {
      column,
      truthyCount,
      falseyCount,
      totalCount,
    };
  });

  const idMap = new Map<string, Record<string, string>[]>();
  rows.forEach((row) => {
    const id = String(row[storeIdKey] ?? "").trim();
    if (!id) {
      return;
    }
    const existing = idMap.get(id);
    if (existing) {
      existing.push(row);
    } else {
      idMap.set(id, [row]);
    }
  });

  const duplicates: CsvDuplicateEntry[] = Array.from(idMap.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([storeId, entries]) => {
      const sample = entries[0] ?? {};
      return {
        storeId,
        count: entries.length,
        sampleName: storeNameKey ? String(sample[storeNameKey] ?? "") : "",
        sampleAddress: addressKey ? String(sample[addressKey] ?? "") : "",
        rows: entries,
      };
    });

  const duplicateIdCount = duplicates.length;
  const duplicateRowCount = duplicates.reduce(
    (sum, entry) => sum + entry.count,
    0
  );

  const resolvedPreviewHeaders =
    Array.isArray(previewHeaders) && previewHeaders.length > 0
      ? previewHeaders
      : headers;

  return {
    summary: {
      totalRows: rows.length,
      validRows,
      invalidRows,
      duplicateIdCount,
      duplicateRowCount,
      missingRequiredHeaders,
      headerOrderValid,
    },
    labelStats,
    duplicates,
    previewHeaders: resolvedPreviewHeaders,
    previewRows: rows
      .slice(0, previewSize)
      .map((row) => resolvedPreviewHeaders.map((header) => row[header] ?? "")),
    invalidRowIndices,
  };
};
