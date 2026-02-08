import { createHash } from "node:crypto";

/**
 * Hash content using SHA-256
 * @param content - The content to hash
 * @returns The SHA-256 hash of the content
 */
export function hashContent(content?: string): string {
  return createHash("sha256")
    .update(content ?? "")
    .digest("hex");
}

/**
 * Slugify by replacing non-alphanumeric characters with hyphens and removes leading/trailing hyphens.
 * @param text - The text to slugify
 * @returns The slugified text
 */
export function slugify(text?: string): string {
  return (text ?? "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
