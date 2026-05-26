import { getSupabase } from './supabase.js';

const BUCKET = 'cvs';

export async function uploadCvPdf(buffer, originalName) {
  const ext = originalName.toLowerCase().endsWith('.pdf') ? '' : '.pdf';
  const storagePath = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || '.pdf'}`;

  const { error } = await getSupabase().storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) throw new Error(`Error subiendo CV: ${error.message}`);
  return storagePath;
}

export async function downloadCvPdf(storagePath) {
  const { data, error } = await getSupabase().storage
    .from(BUCKET)
    .download(storagePath);

  if (error) throw new Error(`Error descargando CV: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteCvFile(storagePath) {
  if (!storagePath) return;
  const { error } = await getSupabase().storage.from(BUCKET).remove([storagePath]);
  if (error) console.warn('No se pudo borrar archivo de storage:', error.message);
}
