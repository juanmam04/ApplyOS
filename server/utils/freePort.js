import { execSync } from 'child_process';
import net from 'net';

const DEFAULT_PORT = parseInt(process.env.PORT || '47291', 10);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isPortFree(port = DEFAULT_PORT) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

function getPidsOnPort(port) {
  if (process.platform === 'win32') {
    try {
      const out = execSync(
        `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
      );
      return out
        .trim()
        .split(/\s+/)
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n) && n > 0);
    } catch {
      return [];
    }
  }
  try {
    const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true`, {
      encoding: 'utf8',
      shell: '/bin/sh',
    });
    return out
      .trim()
      .split('\n')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Libera el puerto matando listeners ajenos a `excludePids` (p. ej. el wrapper dev).
 */
export async function freePort(port = DEFAULT_PORT, excludePids = []) {
  const exclude = new Set(excludePids.filter((p) => Number.isFinite(p) && p > 0));
  let pids = getPidsOnPort(port).filter((pid) => !exclude.has(pid));

  if (pids.length === 0) {
    if (await isPortFree(port)) return { freed: false, port };
    await delay(300);
    pids = getPidsOnPort(port).filter((pid) => !exclude.has(pid));
    if (pids.length === 0 && (await isPortFree(port))) return { freed: false, port };
  }

  for (const pid of pids) {
    killPid(pid);
  }

  await delay(500);
  return { freed: pids.length > 0, port, killed: pids };
}
