import type { ProjectState } from "@/src/types/project";
import type { Table } from "dexie";

type ProjectRecord = {
  id: string;
  data: ProjectState;
  updatedAt: number;
};

type SnapshotRecord = {
  id: string;
  projectId: string;
  data: ProjectState;
  createdAt: number;
};

type Db = {
  projects: {
    get: (id: string) => Promise<ProjectRecord | undefined>;
    put: (record: ProjectRecord) => Promise<string>;
  };
  snapshots: {
    put: (record: SnapshotRecord) => Promise<string>;
  };
};

let dbInstance: Db | null = null;

export const getDb = async (): Promise<Db> => {
  if (typeof window === "undefined") {
    throw new Error("db is client-only");
  }

  if (dbInstance) {
    return dbInstance;
  }

  const { default: Dexie } = await import("dexie");

  class CampaignLpDb extends Dexie {
    projects!: Table<ProjectRecord, string>;
    snapshots!: Table<SnapshotRecord, string>;

    constructor() {
      super("campaign-lp-studio");
      this.version(1).stores({
        projects: "id, updatedAt",
        snapshots: "id, projectId, createdAt",
      });
    }
  }

  dbInstance = new CampaignLpDb();
  return dbInstance;
};

export type { Db, ProjectRecord, SnapshotRecord };
