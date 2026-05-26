import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Falta DATABASE_URL en server/.env.local');
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const files = ['schema.sql', 'opportunities.sql'].map(f =>
    path.join(__dirname, '../../supabase', f)
  );

  for (const schemaPath of files) {
    if (!fs.existsSync(schemaPath)) continue;
    const sql = fs.readFileSync(schemaPath, 'utf8');
    for (const stmt of splitSqlStatements(sql)) {
      const s = stmt.trim();
      if (!s || s.startsWith('--')) continue;
      try {
        await client.query(s);
      } catch (err) {
        if (err.message.includes('already exists') || err.code === '42P07') continue;
        throw err;
      }
    }
  }

  await client.end();
  console.log('✅ Tablas ApplyOS creadas en Supabase');
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue;

    if (line.includes('$$')) {
      const count = (line.match(/\$\$/g) || []).length;
      if (count % 2 === 1) inDollarQuote = !inDollarQuote;
    }

    current += line + '\n';

    if (!inDollarQuote && line.trim().endsWith(';')) {
      statements.push(current);
      current = '';
    }
  }

  if (current.trim()) statements.push(current);
  return statements;
}

// CLI: node db/migrate.js
if (process.argv[1]?.includes('migrate')) {
  const root = path.join(__dirname, '..');
  dotenv.config({ path: path.join(root, '.env') });
  dotenv.config({ path: path.join(root, '.env.local'), override: true });

  runMigrations().catch((err) => {
    console.error('❌ Migración fallida:', err.message);
    process.exit(1);
  });
}
