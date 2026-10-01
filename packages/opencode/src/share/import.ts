import { Document } from "./export"

/** Validate an offline document for read-only viewing; never insert it into live sessions. */
export function read(input: string | unknown) {
  return Document.parse(typeof input === "string" ? JSON.parse(input) : input)
}

export * as SessionImport from "./import"
