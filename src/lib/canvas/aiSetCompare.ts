import type { CanvasLayer } from "@/src/types/canvas";
import { CANVAS_AI_SET_LABELS, type CanvasAiSetType } from "@/src/features/canvas-ai/canvasAiEngine";

export type AiBatchDisplaySummary = {
  batchId: string;
  setType?: CanvasAiSetType;
  baseLabel: string;
  displayLabel: string;
  indexInType: number;
  totalInType: number;
  layerCount: number;
  layerIds: string[];
  firstIndex: number;
};

const getBaseLabel = (layer: CanvasLayer): string => {
  const raw = layer.aiSetLabel?.trim();
  if (raw) return raw;
  const setType = layer.aiSetType as CanvasAiSetType | undefined;
  if (setType && CANVAS_AI_SET_LABELS[setType]) {
    return CANVAS_AI_SET_LABELS[setType];
  }
  return "AIセット";
};

export const buildAiBatchSummaries = (layers: CanvasLayer[]): AiBatchDisplaySummary[] => {
  const batchOrder: string[] = [];
  const summaryMap = new Map<string, {
    batchId: string;
    setType?: CanvasAiSetType;
    baseLabel: string;
    layerCount: number;
    layerIds: string[];
    firstIndex: number;
  }>();

  for (let i = 0; i < layers.length; i += 1) {
    const layer = layers[i];
    if (!layer.insertedByAi || !layer.aiBatchId) continue;
    const batchId = layer.aiBatchId;

    if (!summaryMap.has(batchId)) {
      summaryMap.set(batchId, {
        batchId,
        setType: layer.aiSetType as CanvasAiSetType | undefined,
        baseLabel: getBaseLabel(layer),
        layerCount: 0,
        layerIds: [],
        firstIndex: i,
      });
      batchOrder.push(batchId);
    }

    const summary = summaryMap.get(batchId);
    if (!summary) continue;
    summary.layerCount += 1;
    summary.layerIds.push(layer.id);
  }

  const idsByType = new Map<string, string[]>();
  for (const batchId of batchOrder) {
    const summary = summaryMap.get(batchId);
    if (!summary) continue;
    const key = summary.setType ?? "_unknown";
    const list = idsByType.get(key) ?? [];
    list.push(batchId);
    idsByType.set(key, list);
  }

  const out: AiBatchDisplaySummary[] = [];
  for (const batchId of batchOrder) {
    const summary = summaryMap.get(batchId);
    if (!summary) continue;
    const key = summary.setType ?? "_unknown";
    const list = idsByType.get(key) ?? [];
    const indexInType = Math.max(1, list.indexOf(batchId) + 1);
    const totalInType = Math.max(1, list.length);
    const displayLabel = totalInType > 1
      ? `${summary.baseLabel} ${indexInType}`
      : summary.baseLabel;

    out.push({
      batchId,
      setType: summary.setType,
      baseLabel: summary.baseLabel,
      displayLabel,
      indexInType,
      totalInType,
      layerCount: summary.layerCount,
      layerIds: summary.layerIds,
      firstIndex: summary.firstIndex,
    });
  }

  return out;
};

export const buildAiBatchSummaryMap = (layers: CanvasLayer[]): Map<string, AiBatchDisplaySummary> => {
  return new Map(buildAiBatchSummaries(layers).map((summary) => [summary.batchId, summary]));
};
