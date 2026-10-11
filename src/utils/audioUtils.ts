import { supabase } from '../api/supabaseClient';

/**
 * Format any audio URL safely.
 * Handles raw base64 (without data: prefix), data URLs, blob URLs, and external HTTP(S) URLs.
 */
export const formatAudioSource = (url?: string | null): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Already a valid web URL or Data URL or Blob URL
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:audio/')
  ) {
    return trimmed;
  }

  // If starts with generic data: but not data:audio/, pass through
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Raw base64 string missing the data URI prefix (e.g. pasted or sanitized from storage)
  // Check for typical base64 characters
  return `data:audio/mpeg;base64,${trimmed}`;
};

/**
 * Robust audio uploader that attempts Supabase Storage first,
 * and gracefully falls back to optimized Base64 Data URL if storage buckets
 * are not yet provisioned in the Supabase project.
 */
export const uploadAudioFile = async (
  file: File,
  preferredBucket: string = 'pasada-media'
): Promise<{ url: string; isFallback: boolean; error?: string }> => {
  if (!file) {
    throw new Error('No audio file provided.');
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `audio/${Date.now()}-${cleanName}`;
  const contentType = file.type || 'audio/mpeg';

  // Candidate storage buckets in order of preference
  const bucketsToTry = Array.from(new Set([preferredBucket, 'pasada-media', 'tourist-audio', 'audio']));

  for (const bucket of bucketsToTry) {
    try {
      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: true,
          contentType,
        });

      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        if (publicUrl) {
          return { url: publicUrl, isFallback: false };
        }
      }
    } catch {
      // Continue to next bucket attempt
    }
  }

  // If Supabase Storage upload is unavailable (no public bucket configured yet),
  // read as Data URL with appropriate audio MIME type so it can still be saved & played
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ url: result, isFallback: true });
    };
    reader.onerror = (err) => {
      reject(new Error('Failed to read audio file: ' + (err || 'Unknown error')));
    };
    reader.readAsDataURL(file);
  });
};
