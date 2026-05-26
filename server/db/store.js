import { testSupabaseConnection } from './supabase.js';
import { supabaseStore } from './supabaseStore.js';
import { runMigrations } from './migrate.js';

let store = null;

function needsMigration(err) {
  const msg = err?.message || '';
  return (msg.includes('profile') || msg.includes('opportunities') || msg.includes('scanner_state'))
    && (msg.includes('schema cache') || msg.includes('does not exist'));
}

export async function initStore() {
  try {
    await testSupabaseConnection();
  } catch (err) {
    if (needsMigration(err)) {
      console.log('📦 Tablas no encontradas — creando schema en Supabase...');
      await runMigrations();
      await testSupabaseConnection();
    } else {
      throw err;
    }
  }
  store = supabaseStore;
  console.log('✅ Supabase conectado');
  return store;
}

export function getStore() {
  if (!store) throw new Error('Store no inicializado');
  return store;
}
