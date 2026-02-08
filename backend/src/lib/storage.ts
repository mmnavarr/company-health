/**
 * Blob storage client using Vercel Blob.
 * Requires BLOB_READ_WRITE_TOKEN env var.
 */

import { put } from "@vercel/blob";

/**
 * Interface for blob storage, enabling dependency injection and testing.
 */
export interface BlobStorage {
  /**
   * Upload JSON data to blob storage.
   * @param pathname - Object path, e.g. "ashby/2026-02-07T12-00-00Z/senior-engineer.json"
   * @param data - Data to serialize as JSON
   * @returns The blob URL where the object was stored
   */
  uploadJson(pathname: string, data: unknown): Promise<string>;
}

/**
 * Vercel Blob storage implementation.
 */
export class VercelBlobStorage implements BlobStorage {
  async uploadJson(pathname: string, data: unknown): Promise<string> {
    const { url } = await put(pathname, JSON.stringify(data, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    return url;
  }
}
