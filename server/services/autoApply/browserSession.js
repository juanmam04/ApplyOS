import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';

export const PROFILE_DIR = path.join(os.homedir(), '.applyos', 'waas-browser', 'profile');
const LEGACY_STATE = path.join(os.homedir(), '.applyos', 'waas-browser', 'state.json');

export function hasBrowserProfile() {
  return fs.existsSync(PROFILE_DIR) && fs.readdirSync(PROFILE_DIR).length > 0;
}

export async function launchWaasBrowser({ headless = false, slowMo = 0 } = {}) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    slowMo: slowMo || (process.env.APPLY_SLOW_MO ? parseInt(process.env.APPLY_SLOW_MO, 10) : 0),
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });

  if (fs.existsSync(LEGACY_STATE)) {
    try {
      const legacy = await chromium.launch({ headless: true });
      const tmp = await legacy.newContext({ storageState: LEGACY_STATE });
      const cookies = await tmp.cookies();
      await context.addCookies(cookies);
      await legacy.close();
    } catch {
      /* ignore migration errors */
    }
  }

  return context;
}

export async function needsYcLogin(page) {
  const url = page.url();
  if (url.includes('authenticate') || url.includes('sign_in')) return true;
  if (await page.locator('#ycid-input').isVisible({ timeout: 2000 }).catch(() => false)) return true;
  return false;
}

/** True si estamos en account.yc y NO hay formulario de login (sesión ya activa). */
export async function isYcAccountLoggedInView(page) {
  const url = page.url();
  if (!/account\.ycombinator\.com/i.test(url)) return false;
  if (url.includes('authenticate') || url.includes('sign_in')) return false;
  const loginVisible = await page.locator('#ycid-input').isVisible({ timeout: 2500 }).catch(() => false);
  return !loginVisible;
}

export async function isLoggedInOnWaas(page) {
  await page.goto('https://www.workatastartup.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (await needsYcLogin(page)) return false;
  const signIn = await page.getByRole('link', { name: /sign in/i }).first()
    .isVisible({ timeout: 2000 }).catch(() => false);
  return !signIn;
}
