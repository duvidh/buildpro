import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for Storage uploads.
 *
 * Uses the SERVICE ROLE key so uploads bypass Storage RLS — never expose this
 * client (or the key) to the browser. Lazily constructed so the build phase
 * (which runs without env vars) doesn't throw.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL      e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY     from Supabase dashboard → Project Settings → API
 */

// Single public bucket holding all app uploads. Create it in the Supabase
// dashboard (Storage → New bucket → name "uploads" → Public).
export const STORAGE_BUCKET = "uploads";

let _client: SupabaseClient | null = null;

function getStorageClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase storage is not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!_client) {
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

/**
 * Upload a file to the storage bucket and return its public URL.
 * Throws on failure (callers should wrap in try/catch).
 */
export async function uploadToStorage(
  path: string,
  file: File,
): Promise<string> {
  const client = getStorageClient();

  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }

  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a previously-uploaded object by its public URL. Best-effort —
 * resolves silently if the URL isn't a recognised storage object.
 */
export async function deleteFromStorage(publicUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return; // not one of ours (e.g. legacy Vercel Blob URL)
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
  if (!path) return;
  const client = getStorageClient();
  await client.storage.from(STORAGE_BUCKET).remove([path]);
}
