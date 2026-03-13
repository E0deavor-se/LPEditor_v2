export type CreativeExportFormat = "png" | "webp";

export type CreativeExportStatus = "idle" | "exporting" | "success" | "failed";
export type CreativePublishStatus = "idle" | "publishing" | "success" | "failed";

export type CreativeExportResult = {
  format: CreativeExportFormat;
  downloadUrl: string;
};
