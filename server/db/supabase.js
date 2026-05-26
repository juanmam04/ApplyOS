import { createClient } from '@supabase/supabase-js';

let supabase = null;

export function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      throw new Error(
        'Faltan SUPABASE_URL y SUPABASE_SECRET_KEY en server/.env.local'
      );
    }

    supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

export async function testSupabaseConnection() {
  const { error } = await getSupabase().from('profile').select('id').limit(1);
  if (error) throw error;
}
