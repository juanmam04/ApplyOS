import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const d = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(d, '../.env') });
dotenv.config({ path: path.join(d, '../.env.local'), override: true });

const { initStore, getStore } = await import('../db/store.js');
await initStore();
await getStore().setScannerState({ is_scanning: false, scan_started_at: null });
console.log('✅ Scanner desbloqueado');
