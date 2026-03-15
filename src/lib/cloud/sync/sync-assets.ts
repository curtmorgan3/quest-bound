/**
 * Asset and font sync: base64 ↔ Blob conversion, Supabase Storage upload/download,
 * and memoizedAssets cache updates after pull.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { memoizedAssets } from '@/stores/db/memoization-cache';

const ASSETS_BUCKET = 'assets';
const FONTS_BUCKET = 'fonts';

/** Check if a string is a base64 data URL (data:...;base64,...). */
export function isDataUrl(value: string): boolean {
  return typeof value === 'string' && value.startsWith('data:') && value.includes(';base64,');
}

/**
 * Convert a base64 data URL to a Blob (for upload).
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) throw new Error('Invalid data URL');
  const header = dataUrl.slice(0, commaIndex);
  const base64 = dataUrl.slice(commaIndex + 1);
  const mimeMatch = header.match(/^data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Convert a Blob to a base64 data URL (for storing in Dexie after download).
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Derive file extension from data URL or MIME (e.g. image/png -> png). */
function getExtensionFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^/]+)\/([^;+]+)/);
  if (match) return match[2].toLowerCase();
  return 'bin';
}

/** Storage path: {userId}/{entityId}.{ext} */
function storagePath(userId: string, entityId: string, ext: string): string {
  return `${userId}/${entityId}.${ext}`;
}

/**
 * Upload a single asset (base64 data URL) to Supabase Storage. Returns the storage path.
 */
export async function uploadAssetToStorage(
  client: SupabaseClient,
  userId: string,
  assetId: string,
  dataUrl: string,
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const ext = getExtensionFromDataUrl(dataUrl);
  const path = storagePath(userId, assetId, ext);
  const { error } = await client.storage.from(ASSETS_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type,
  });
  if (error) throw error;
  return path;
}

/**
 * Upload a single font (base64 data URL) to Supabase Storage. Returns the storage path.
 */
export async function uploadFontToStorage(
  client: SupabaseClient,
  userId: string,
  fontId: string,
  dataUrl: string,
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const ext = getExtensionFromDataUrl(dataUrl);
  const path = storagePath(userId, fontId, ext);
  const { error } = await client.storage.from(FONTS_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type,
  });
  if (error) throw error;
  return path;
}

/**
 * Download a file from storage and return as base64 data URL.
 */
export async function downloadFromStorage(
  client: SupabaseClient,
  bucket: string,
  path: string,
): Promise<string> {
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error) throw error;
  if (!data) throw new Error('No data returned from storage');
  return blobToDataUrl(data);
}

/**
 * Prepare asset rows for push: upload base64 assets to storage, return rows with storage_path set and data null.
 * Rows are in remote shape (snake_case). Mutates and returns the same array with storage_path/data updated.
 */
export async function uploadAssetsForPush(
  client: SupabaseClient,
  userId: string,
  remoteRows: Record<string, unknown>[],
): Promise<void> {
  for (const row of remoteRows) {
    const data = row.data as string | undefined;
    if (!data || !isDataUrl(data)) continue;
    const id = row.id as string;
    try {
      const path = await uploadAssetToStorage(client, userId, id, data);
      row.storage_path = path;
      row.data = null;
    } catch (err) {
      throw err;
    }
  }
}

/**
 * Prepare font rows for push: upload base64 fonts to storage, return rows with storage_path set and data null.
 */
export async function uploadFontsForPush(
  client: SupabaseClient,
  userId: string,
  remoteRows: Record<string, unknown>[],
): Promise<void> {
  for (const row of remoteRows) {
    const data = row.data as string | undefined;
    if (!data || !isDataUrl(data)) continue;
    const id = row.id as string;
    try {
      const path = await uploadFontToStorage(client, userId, id, data);
      row.storage_path = path;
      row.data = null;
    } catch (err) {
      throw err;
    }
  }
}

/**
 * Resolve remote asset rows: download from storage where storage_path is set, fill data (camelCase for local).
 * Returns rows ready for local merge and a list of { id, data } for memoizedAssets.
 */
export async function resolveAssetRowsForPull(
  client: SupabaseClient,
  remoteRows: Record<string, unknown>[],
): Promise<{ rows: Record<string, unknown>[]; downloaded: { id: string; data: string }[] }> {
  const downloaded: { id: string; data: string }[] = [];
  const rows = remoteRows.map((r) => ({ ...r }));

  for (const row of rows) {
    const storagePathVal = row.storage_path as string | undefined;
    if (!storagePathVal) continue;
    try {
      const dataUrl = await downloadFromStorage(client, ASSETS_BUCKET, storagePathVal);
      row.data = dataUrl;
      const id = row.id as string;
      if (id) downloaded.push({ id, data: dataUrl });
    } catch (err) {
      console.warn('Failed to download asset from storage:', storagePathVal, err);
    }
  }

  return { rows, downloaded };
}

/**
 * Resolve remote font rows: download from storage where storage_path is set, fill data.
 */
export async function resolveFontRowsForPull(
  client: SupabaseClient,
  remoteRows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const rows = remoteRows.map((r) => ({ ...r }));

  for (const row of rows) {
    const storagePathVal = row.storage_path as string | undefined;
    if (!storagePathVal) continue;
    try {
      const dataUrl = await downloadFromStorage(client, FONTS_BUCKET, storagePathVal);
      row.data = dataUrl;
    } catch (err) {
      console.warn('Failed to download font from storage:', storagePathVal, err);
    }
  }

  return rows;
}

/**
 * Update memoizedAssets cache after pulling and merging assets (call with the downloaded list).
 */
export function updateMemoizedAssetsForRecords(entries: { id: string; data: string }[]): void {
  for (const { id, data } of entries) {
    memoizedAssets[id] = data;
  }
}
