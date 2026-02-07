/**
 * Blob storage client using Vercel Blob.
 * Requires BLOB_READ_WRITE_TOKEN env var.
 */

import { put } from "@vercel/blob";

/**
 * Upload JSON data to Vercel Blob storage.
 * @param pathname - Object path, e.g. "ashby/senior-engineer-2026-02-07T12-00-00Z.json"
 * @param data - Data to serialize as JSON
 * @returns The blob URL where the object was stored
 */
export async function uploadJson(pathname: string, data: unknown): Promise<string> {
  const { url } = await put(pathname, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return url;
}
