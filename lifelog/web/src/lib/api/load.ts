import { readFileSync } from "node:fs";
import path from "node:path";
import type { ZodType } from "zod";

export class ShowcaseNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShowcaseNotFound";
  }
}

const DATA_ROOT = path.join(process.cwd(), "showcase-data");

export function showcasePath(rel: string): string {
  return path.join(DATA_ROOT, rel);
}

export function loadJson<T>(rel: string, schema: ZodType<T>): T {
  const file = showcasePath(rel);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read showcase-data/${rel}: ${message}`);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 8)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`showcase-data/${rel} does not match the contract: ${detail}`);
  }
  return parsed.data;
}
