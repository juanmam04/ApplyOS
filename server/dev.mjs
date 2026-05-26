/**
 * Dev server con reinicio secuencial (evita la tormenta de `node --watch` en Windows).
 * Mata el hijo → libera 47291 → arranca de nuevo. Un solo proceso escucha a la vez.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { freePort } from './utils/freePort.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '47291', 10);
const DEBOUNCE_MS = 1400;
const KILL_TIMEOUT_MS = 3500;

let child = null;
let restartTimer = null;
let starting = false;
let shuttingDown = false;

const WATCH_ROOTS = [
  path.join(__dirname, 'index.js'),
  path.join(__dirname, 'routes'),
  path.join(__dirname, 'services'),
  path.join(__dirname, 'db'),
  path.join(__dirname, 'utils'),
];

function shouldIgnore(name) {
  if (!name || typeof name !== 'string') return true;
  const base = path.basename(name);
  if (base.startsWith('.') || name.includes('node_modules')) return true;
  if (!base.endsWith('.js') && !base.endsWith('.json') && !base.endsWith('.mjs')) return true;
  return false;
}

async function stopChild() {
  if (!child) return;
  const proc = child;
  const pid = proc.pid;
  child = null;

  if (!pid) return;

  try {
    proc.kill('SIGTERM');
  } catch {
    return;
  }

  await Promise.race([
    new Promise((resolve) => proc.once('exit', resolve)),
    delay(KILL_TIMEOUT_MS),
  ]);

  if (!proc.killed && proc.exitCode === null) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* ya murió */
    }
    await delay(250);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startChild() {
  if (starting || shuttingDown) return;
  starting = true;
  try {
    await stopChild();
    await freePort(PORT, [process.pid]);
    await delay(200);

    child = spawn(process.execPath, ['index.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env, APPLYOS_DEV_CHILD: '1' },
    });

    child.on('exit', (code, signal) => {
      child = null;
      if (shuttingDown) return;
      if (signal === 'SIGTERM' || signal === 'SIGKILL') return;
      if (code !== 0 && !restartTimer) {
        console.error(`\n❌ Servidor detenido (código ${code ?? signal ?? '?'}). Esperando cambios o Ctrl+C.\n`);
      }
    });
  } finally {
    starting = false;
  }
}

function scheduleRestart(label) {
  if (shuttingDown) return;
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(async () => {
    restartTimer = null;
    console.log(`\n↻ Reiniciando servidor (${label})…\n`);
    await startChild();
  }, DEBOUNCE_MS);
}

function watchPath(target) {
  if (!fs.existsSync(target)) return;
  const recursive = fs.statSync(target).isDirectory();
  fs.watch(target, { recursive }, (_event, filename) => {
    if (shouldIgnore(filename)) return;
    scheduleRestart(filename || path.basename(target));
  });
}

async function shutdown() {
  shuttingDown = true;
  if (restartTimer) clearTimeout(restartTimer);
  await stopChild();
  process.exit(0);
}

console.log('ApplyOS dev — reinicio controlado (Ctrl+C para salir)\n');
await startChild();
for (const target of WATCH_ROOTS) {
  watchPath(target);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
