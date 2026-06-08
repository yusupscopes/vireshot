export type FileCollection = { [path: string]: string };

export function parseFileCollection(value: unknown): FileCollection | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  for (const [key, val] of Object.entries(value)) {
    if (typeof key !== "string" || typeof val !== "string") {
      return null;
    }
  }
  return value as FileCollection;
}
