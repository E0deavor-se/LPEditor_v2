import type { ProjectState } from "../types/project";
import type { Table } from "dexie";

type ProjectRecord = {
  id: string;
  data: ProjectState;
  updatedAt: number;
};

type LpDb = {
  projects: {
    put: (record: ProjectRecord) => Promise<string>;
    count: () => Promise<number>;
  };
};

let dbInstance: LpDb | null = null;

export const getLpDb = async (): Promise<LpDb> => {
  if (typeof window === "undefined") {
    throw new Error("lpDb is client-only");
  }

  if (dbInstance) {
    return dbInstance;
  }

  const { default: Dexie } = await import("dexie");

  class LpDbImpl extends Dexie {
    projects!: Table<ProjectRecord, string>;

    constructor() {
      super("campaign-lp-studio");
      this.version(1).stores({
        projects: "id, updatedAt",
      });
    }
  }

  dbInstance = new LpDbImpl();
  return dbInstance;
};

export type { ProjectRecord, LpDb };
