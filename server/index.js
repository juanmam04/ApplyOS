import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import profileRoutes from './routes/profile.js';
import cvRoutes from './routes/cv.js';
import jobsRoutes from './routes/jobs.js';
import interviewRoutes from './routes/interview.js';
import generateRoutes from './routes/generate.js';
import startupsRoutes from './routes/startups.js';
import opportunitiesRoutes from './routes/opportunities.js';
import settingsRoutes from './routes/settings.js';
import { startScannerWorker } from './services/scannerWorker.js';
import { initStore, getStore } from './db/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local'), override: true });

const app = express();
const PORT = parseInt(process.env.PORT || '47291', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/profile', profileRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/startups', startupsRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

app.get('/api/health', (_req, res) => {
  const store = getStore();
  res.json({
    status: 'ok',
    storage: store.mode,
    ai: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

async function start() {
  await initStore();
  startScannerWorker();

  const server = app.listen(PORT, () => {
    console.log(`ApplyOS server → http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Puerto ${PORT} en uso. Ejecuta: lsof -ti :${PORT} | xargs kill -9\n`);
      process.exit(1);
    }
    throw err;
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('\n❌ Error al iniciar:', err.message);
  if (err.message.includes('SUPABASE')) {
    console.error('   Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en server/.env.local');
    console.error('   Ejecuta supabase/schema.sql en tu proyecto Supabase\n');
  }
  process.exit(1);
});
