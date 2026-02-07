/**
 * Supabase Object Storage client using Bun's built-in S3 support.
 * Connects via the S3-compatible endpoint.
 */

import { S3Client } from "bun";

/**
 * Initialize a new S3 client for the given bucket.
 * @param bucket - The name of the bucket to use
 * @returns A new S3 client for the given bucket
 */
export function initS3Client(bucket: string): S3Client {
  if (!process.env.S3_ENDPOINT) {
    throw new Error("S3_ENDPOINT must be set");
  }
  if (!process.env.S3_REGION) {
    throw new Error("S3_REGION must be set");
  }
  if (!process.env.S3_ACCESS_KEY_ID) {
    throw new Error("S3_ACCESS_KEY_ID must be set");
  }
  if (!process.env.S3_SECRET_ACCESS_KEY) {
    throw new Error("S3_SECRET_ACCESS_KEY must be set");
  }
  if (!bucket) {
    throw new Error("Bucket must be set");
  }
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    bucket: bucket,
  });
}

/**
 * Upload JSON data to Supabase Object Storage.
 * @param s3 - The S3 client to use, should specify the bucket in the client initialization
 * @param key - Object key (path within bucket), e.g. "raw/ashby/rain/2026-02-07T12-00-00Z.json"
 * @param data - Data to serialize as JSON
 * @returns The full S3 key where the object was stored
 */
export async function uploadJson(s3: S3Client, key: string, data: unknown): Promise<string> {
  await s3.write(key, JSON.stringify(data, null, 2), {
    type: "application/json",
  });
  return key;
}
