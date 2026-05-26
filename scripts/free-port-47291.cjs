/**
 * Libera el puerto 47291 (Windows / macOS / Linux).
 * Se ejecuta automáticamente antes de `npm run dev` vía script `predev`.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { pathToFileURL } = require('url');

const PORT = parseInt(process.env.PORT || '47291', 10);
const root = path.join(__dirname, '..');
const modUrl = pathToFileURL(path.join(root, 'server/utils/freePort.js')).href;

const result = spawnSync(
  process.execPath,
  ['--input-type=module', '-e', `import { freePort } from ${JSON.stringify(modUrl)}; await freePort(${PORT});`],
  { cwd: root, stdio: 'inherit' },
);

process.exit(result.status === 0 ? 0 : result.status ?? 1);
