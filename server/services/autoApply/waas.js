import {
  launchWaasBrowser,
  hasBrowserProfile,
  needsYcLogin,
  isLoggedInOnWaas,
  PROFILE_DIR,
} from './browserSession.js';
import {
  completeWaasProfile,
  submitJobApplication,
  isWaasProfileMarkedComplete,
} from './waasWizard.js';

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
  await page.goto(YC_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('#ycid-input').fill(user);
  await page.locator('#password-input').fill(password);
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.waitForTimeout(4000);

  if (await needsYcLogin(page)) {
    throw new Error('Login falló. Ejecuta: cd server && npm run yc:login');
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
    throw new Error('Sin sesión YC. Ejecuta: cd server && npm run yc:login');
  }

  // Visible por defecto — headless se atasca en skills/captcha
  const headless = process.env.APPLY_HEADLESS === 'true';
  const context = await launchWaasBrowser({ headless });
  const progress = (msg) => {
    console.log(`ApplyOS: ${msg}`);
    onProgress?.(msg);
  };

  try {
    const page = await ensureLoggedIn(context);

    if (!isWaasProfileMarkedComplete()) {
      progress('Completando perfil WaaS (1ª vez, ~2 min)...');
      await completeWaasProfile(page, profile, progress);
    } else {
      progress('Perfil WaaS listo — aplicando al job...');
    }

    progress('Enviando aplicación...');
    return await submitJobApplication(page, applyMeta, {
      coverLetter,
      shortMessage,
      cvBuffer,
    });
  } finally {
    if (!headless) {
      progress('Cierra la ventana de Chrome cuando termines de revisar.');
    }
    await context.close().catch(() => {});
  }
}

export { PROFILE_DIR, hasBrowserProfile };
