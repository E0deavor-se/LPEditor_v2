import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";

type EnvLoadResult = {
  projectRoot: string;
  envLocalExists: boolean;
  hasFalKey: boolean;
};

let cached: EnvLoadResult | null = null;

const hasNextProjectMarker = (dirPath: string) => {
  return (
    existsSync(join(dirPath, "next.config.ts")) ||
    existsSync(join(dirPath, "next.config.js")) ||
    existsSync(join(dirPath, "package.json"))
  );
};

const findNextProjectRoot = (): string => {
  const cwd = resolve(process.cwd());
  const direct = cwd;
  const nested = resolve(cwd, "lp-editor");

  if (hasNextProjectMarker(direct) && existsSync(join(direct, "app"))) {
    return direct;
  }

  if (hasNextProjectMarker(nested) && existsSync(join(nested, "app"))) {
    return nested;
  }

  let cursor = direct;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(cursor, "app")) && hasNextProjectMarker(cursor)) {
      return cursor;
    }
    const parent = dirname(cursor);
    if (parent === cursor) {
      break;
    }
    cursor = parent;
  }

  return direct;
};

export const ensureServerEnvLoaded = (): EnvLoadResult => {
  if (cached) {
    return cached;
  }

  const projectRoot = findNextProjectRoot();
  loadEnvConfig(projectRoot, process.env.NODE_ENV !== "production", {
    info: () => {},
    error: () => {},
  });

  cached = {
    projectRoot,
    envLocalExists: existsSync(join(projectRoot, ".env.local")),
    hasFalKey: Boolean(process.env.FAL_KEY && process.env.FAL_KEY.trim().length > 0),
  };

  return cached;
};
