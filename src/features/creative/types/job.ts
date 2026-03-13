export type CreativeJobStatus = "idle" | "queued" | "running" | "succeeded" | "failed";

export type CreativeJob = {
  jobId: string;
  status: CreativeJobStatus;
  progress: number;
  message?: string;
};
