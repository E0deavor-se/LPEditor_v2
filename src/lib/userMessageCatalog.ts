import type { AiAssetGenerationStatus } from "@/src/features/ai-assets/types";
import type { CreativeJobStatus } from "@/src/features/creative/types/job";

export const getAiGenerationStatusLabel = (
  status: AiAssetGenerationStatus | CreativeJobStatus,
): string => {
  switch (status) {
    case "queued":
      return "生成を開始しています";
    case "running":
      return "画像を生成しています";
    case "succeeded":
      return "生成が完了しました";
    case "failed":
      return "生成に失敗しました";
    default:
      return "待機中";
  }
};

export const buildAiAssetErrorMessage = (kind: "start" | "bind" | "preset-save" | "preset-remove" | "regenerate"): string => {
  switch (kind) {
    case "bind":
      return "画像の設定に失敗しました。もう一度お試しください。";
    case "preset-save":
      return "既定値を保存できませんでした。";
    case "preset-remove":
      return "既定値を解除できませんでした。";
    case "regenerate":
      return "再生成を開始できませんでした。";
    case "start":
    default:
      return "画像生成を開始できませんでした。";
  }
};

export const buildCreativeGenerationErrorMessage = (
  kind: "start" | "job-not-found" | "poll-timeout" | "regenerate" | "variant-missing",
): string => {
  switch (kind) {
    case "job-not-found":
      return "生成状況を確認できませんでした。時間をおいてもう一度お試しください。";
    case "poll-timeout":
      return "生成に時間がかかっています。しばらく待ってから結果をご確認ください。";
    case "regenerate":
      return "再生成を開始できませんでした。";
    case "variant-missing":
      return "再生成結果を受け取れませんでした。";
    case "start":
    default:
      return "生成を開始できませんでした。";
  }
};

export const buildCreativeActionErrorMessage = (
  kind: "export" | "publish" | "hero-section-missing",
): string => {
  switch (kind) {
    case "publish":
      return "LPへの反映に失敗しました。";
    case "hero-section-missing":
      return "反映先のメインビジュアルが見つかりませんでした。";
    case "export":
    default:
      return "書き出しに失敗しました。";
  }
};

export const buildCampaignDirectionHintMessage = (params: {
  tone: string;
  style: string;
}): string => {
  return `Campaignの生成方針を初期設定に反映しました: トーン ${params.tone} / デザイン ${params.style}`;
};

export const buildPresetUsageLines = (params: {
  presetFields: string[];
  manualFields: string[];
}): string[] => {
  const lines: string[] = [];
  if (params.presetFields.length > 0) {
    lines.push(`保存済みの既定値を使用中: ${params.presetFields.join("・")}`);
  }
  if (params.manualFields.length > 0) {
    lines.push(`今回のみ変更: ${params.manualFields.join("・")}`);
  }
  if (lines.length === 0) {
    lines.push("この対象には保存済みの既定値があります。");
  }
  return lines;
};

export const buildExportWarningMessage = (
  key:
    | "default-footer-asset-fetch-failed"
    | "asset-data-empty"
    | "asset-data-invalid"
    | "asset-processing-failed"
    | "external-asset-fetch-failed"
    | "export-css-empty"
    | "export-css-fetch-failed"
    | "dist-generation-failed"
    | "zip-generation-failed"
    | "canvas-asset-data-empty"
    | "canvas-asset-data-invalid"
    | "canvas-asset-fetch-failed",
): string => {
  switch (key) {
    case "default-footer-asset-fetch-failed":
      return "フッターの既定画像を取得できませんでした";
    case "asset-data-empty":
      return "画像データが空です";
    case "asset-data-invalid":
      return "画像データを読み取れませんでした";
    case "asset-processing-failed":
      return "画像を読み込めませんでした";
    case "external-asset-fetch-failed":
      return "外部画像を取得できませんでした";
    case "export-css-empty":
      return "書き出し用スタイルを取得できなかったため、既定スタイルで出力しました";
    case "export-css-fetch-failed":
      return "書き出し用スタイルを取得できませんでした";
    case "dist-generation-failed":
      return "公開用データを作成できませんでした";
    case "zip-generation-failed":
      return "書き出しデータの作成に失敗したため、簡易データで保存しました";
    case "canvas-asset-data-empty":
      return "Canvas で使用中の画像データが空です";
    case "canvas-asset-data-invalid":
      return "Canvas で使用中の画像データを読み取れませんでした";
    case "canvas-asset-fetch-failed":
      return "Canvas で使用中の画像を取得できませんでした";
    default:
      return "問題が見つかりました";
  }
};

export const buildExportHintMessage = (
  key:
    | "asset-reselect"
    | "asset-set-hero"
    | "asset-set-section"
    | "ai-rebind"
    | "ai-regenerate"
    | "rerun-export"
    | "set-image-before-export",
): string => {
  switch (key) {
    case "asset-set-hero":
      return "メインビジュアルに画像を設定してください";
    case "asset-set-section":
      return "このセクションに画像を設定してください";
    case "ai-rebind":
      return "画像を選び直して設定し直してください";
    case "ai-regenerate":
      return "該当セクションで再生成するか、別の画像を選んでください";
    case "rerun-export":
      return "設定を確認してから、もう一度書き出してください";
    case "set-image-before-export":
      return "画像を設定してから、もう一度書き出してください";
    case "asset-reselect":
    default:
      return "画像を設定し直してください";
  }
};

export const buildSaveStatusMessage = (
  key:
    | "zip-exporting"
    | "zip-exported"
    | "zip-exported-with-warnings"
    | "canvas-zip-exporting"
    | "canvas-zip-exported"
    | "project-downloading"
    | "project-downloaded"
    | "project-loading"
    | "project-loaded"
    | "zip-loading"
    | "zip-loaded"
    | "image-exporting"
    | "image-exported"
    | "image-export-failed"
    | "html-exporting"
    | "html-exported",
  params?: { warningCount?: number; infoCount?: number },
): string => {
  switch (key) {
    case "zip-exporting":
      return "ZIPを書き出しています…";
    case "zip-exported":
      return "ZIPを書き出しました";
    case "zip-exported-with-warnings":
      return `ZIPを書き出しました（要確認 ${params?.warningCount ?? 0} 件 / 参考 ${params?.infoCount ?? 0} 件）`;
    case "canvas-zip-exporting":
      return "Canvas ZIPを書き出しています…";
    case "canvas-zip-exported":
      return "Canvas ZIPを書き出しました";
    case "project-downloading":
      return "プロジェクトをダウンロードしています…";
    case "project-downloaded":
      return "プロジェクトをダウンロードしました";
    case "project-loading":
      return "プロジェクトを読み込んでいます…";
    case "project-loaded":
      return "プロジェクトを読み込みました";
    case "zip-loading":
      return "ZIPを読み込んでいます…";
    case "zip-loaded":
      return "ZIPを読み込みました";
    case "image-exporting":
      return "画像を書き出しています…";
    case "image-exported":
      return "画像を書き出しました";
    case "image-export-failed":
      return "画像を書き出せませんでした";
    case "html-exporting":
      return "HTMLを書き出しています…";
    case "html-exported":
      return "HTMLを書き出しました";
    default:
      return "処理が完了しました";
  }
};
