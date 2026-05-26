import {
  launchWaasBrowser,
  hasBrowserProfile,
  needsYcLogin,
  isLoggedInOnWaas,
  isYcAccountLoggedInView,
  PROFILE_DIR,
} from './browserSession.js';
import { submitJobApplication } from './waasWizard.js';

const YC_LOGIN_URL = 'https://account.ycombinator.com/';

function getCredentials() {
  const user = (process.env.YC_APPLY_USERNAME || process.env.YC_APPLY_EMAIL || '').trim();
  const password = process.env.YC_APPLY_PASSWORD?.trim();
  if (!user || !password) {
    throw new Error('Configura YC_APPLY_USERNAME y YC_APPLY_PASSWORD en server/.env.local');
  }
  return { user, password };
}

async function ensureLoggedIn(context) {
  const page = context.pages()[0] || await context.newPage();

  if (await isLoggedInOnWaas(page)) {
    await page.goto('https://account.ycombinator.com/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    if (!(await needsYcLogin(page))) return page;
  }

  const { user, password } = getCredentials();
  await page.goto(YC_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  // Ya logueado: YC muestra el panel de cuenta / "mi usuario" sin #ycid-input
  if (await isYcAccountLoggedInView(page)) {
    await page.goto('https://www.workatastartup.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!(await needsYcLogin(page))) return page;
  }

  const loginField = page.locator('#ycid-input');
  const hasForm = await loginField.isVisible({ timeout: 8000 }).catch(() => false);
  if (!hasForm) {
    if (await needsYcLogin(page)) {
      throw new Error(
        'No aparece el formulario de login de YC. Abrí npm run yc:login, iniciá sesión en la ventana de Playwright y no cierres hasta «Sesión guardada».',
      );
    }
    await page.goto('https://www.workatastartup.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (await needsYcLogin(page)) {
      throw new Error(
        'Sesión incompleta en Work at a Startup (p. ej. OAuth). Ejecutá: npm run yc:login y completá el flujo hasta «Sesión guardada».',
      );
    }
    return page;
  }

  await loginField.fill(user, { timeout: 15000 });
  await page.locator('#password-input').fill(password, { timeout: 15000 });
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.waitForTimeout(4000);

  if (await needsYcLogin(page)) {
    throw new Error('Login falló. Ejecuta: npm run yc:login (en la carpeta ApplyOS)');
  }

  await page.goto('https://www.workatastartup.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  return page;
}

export async function applyViaWaas({
  applyMeta,
  profile,
  cvBuffer,
  coverLetter,
  shortMessage,
  onProgress,
}) {
  if (process.env.APPLY_DRY_RUN === 'true') {
    return { success: true, dryRun: true, message: 'Dry run', url: applyMeta.apply_url };
  }

  if (!hasBrowserProfile()) {
    throw new Error('Sin sesión YC. Ejecuta: npm run yc:login (en la carpeta ApplyOS)');
  }

  // Siempre visible al aplicar — headless no hace clic bien en WaaS
  const headless = false;
  const context = await launchWaasBrowser({
    headless,
    slowMo: parseInt(process.env.APPLY_SLOW_MO || '80', 10),
  });
  const progress = (msg) => {
    console.log(`ApplyOS: ${msg}`);
    onProgress?.(msg);
  };

  try {
    const page = await ensureLoggedIn(context);

    progress('Abriendo formulario del job y aplicando...');
    const result = await submitJobApplication(page, applyMeta, {
      coverLetter,
      shortMessage,
      cvBuffer,
      profile,
      onProgress: progress,
    });

    if (!result.success && process.env.APPLY_KEEP_OPEN !== 'false') {
      progress('Chrome queda abierto 45s por si hay que pulsar algo manualmente...');
      await page.waitForTimeout(45000).catch(() => {});
    }

    return result;
  } finally {
    if (process.env.APPLY_KEEP_OPEN === 'true') {
      progress('APPLY_KEEP_OPEN=true — cierra Chrome manualmente.');
    } else {
      await context.close().catch(() => {});
    }
  }
}

export { PROFILE_DIR, hasBrowserProfile };
