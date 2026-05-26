import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  wait,
  clickSaveAndNext,
  clickApply,
  clickSend,
  blastThroughProfileWizard,
  buildOutreachMessage,
  isReachOutModalVisible,
  fillReachOutModal,
} from './pageActions.js';

const PROFILE_DONE_FLAG = path.join(os.homedir(), '.applyos', 'waas-profile-complete');

export function isWaasProfileMarkedComplete() {
  return fs.existsSync(PROFILE_DONE_FLAG);
}

export function markWaasProfileComplete() {
  fs.mkdirSync(path.dirname(PROFILE_DONE_FLAG), { recursive: true });
  fs.writeFileSync(PROFILE_DONE_FLAG, new Date().toISOString());
}

export async function isWaasProfileCompleteOnPage(page) {
  const body = await page.locator('body').innerText().catch(() => '');
  if (/100%\s*complete|profile is 100|your profile is complete|all set|profile looks great/i.test(body)) {
    return true;
  }

  return page.evaluate(() => {
    const stepPaths = ['personal', 'location', 'role', 'experience', 'skills', 'career', 'share'];
    const links = [...document.querySelectorAll('a[href*="/application/"]')];
    const byStep = new Map();
    for (const a of links) {
      const href = a.getAttribute('href') || '';
      const m = href.match(/\/application\/([^/?#]+)/);
      if (!m) continue;
      const key = m[1].toLowerCase();
      if (!stepPaths.includes(key)) continue;
      byStep.set(key, a);
    }
    if (byStep.size < 7) return false;

    const rowDone = (el) => {
      const row =
        el.closest('li') ||
        el.closest('[role="listitem"]') ||
        el.closest('div[class*="nav" i]')?.parentElement ||
        el.parentElement?.parentElement ||
        el.parentElement;
      if (!row) return false;
      const html = row.innerHTML + row.innerText;
      if (/✓|✔|check|complete|done|filled/i.test(html)) return true;
      if (/M9\s*16\.17|M5\s*13|CheckCircle|check-circle/i.test(html)) return true;
      if (row.querySelector('[class*="complete" i], [class*="success" i], [data-state="complete"]')) {
        return true;
      }
      return false;
    };

    return [...byStep.values()].every(rowDone);
  });
}

async function getProfileFromEnv() {
  try {
    const { getStore } = await import('../../db/store.js');
    return (await getStore().getProfile()) || {};
  } catch {
    return { full_name: 'Juan Manuel Martínez', email: process.env.YC_APPLY_EMAIL || '' };
  }
}

async function runProfileWizardIfNeeded(page, profile, onProgress) {
  if (isWaasProfileMarkedComplete()) return;

  const onWizard = /\/application\/(personal|location|role|experience|skills|career|share)/.test(page.url());
  if (!onWizard) {
    await page.goto('https://www.workatastartup.com/application/personal', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await wait(2000);
  }

  if (await isWaasProfileCompleteOnPage(page)) {
    markWaasProfileComplete();
    onProgress?.('Perfil WaaS completo (UI)');
    return;
  }

  onProgress?.('Wizard perfil — Save & next automático...');
  const wizardOk = await blastThroughProfileWizard(page, onProgress, {
    isProfileComplete: () => isWaasProfileCompleteOnPage(page),
  });
  const completeNow = await isWaasProfileCompleteOnPage(page);
  if (completeNow || wizardOk) {
    markWaasProfileComplete();
    onProgress?.(completeNow ? 'Perfil WaaS completo (UI)' : 'Perfil WaaS: wizard salido');
  } else {
    onProgress?.(
      'Aviso: no se confirmó el perfil al 100% en WaaS. Si ya está todo en verde, abrí una vez https://www.workatastartup.com/application/share y guardá; o ejecutá npm run waas:mark-complete en la raíz del repo.',
    );
  }
}

/** Paso 1: página del job (/jobs/123). Paso 2: modal Reach out → Send. */
export async function submitJobApplication(page, applyMeta, {
  coverLetter,
  shortMessage,
  cvBuffer,
  profile: profileIn,
  onProgress,
} = {}) {
  const progress = (msg) => onProgress?.(msg);
  const profile = profileIn || (await getProfileFromEnv());
  const jobId = applyMeta.signup_job_id;
  const jobsUrl = jobId ? `https://www.workatastartup.com/jobs/${jobId}` : null;

  // Solo wizard si el perfil no está marcado
  if (!isWaasProfileMarkedComplete()) {
    await page.goto('https://www.workatastartup.com/application/personal', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    }).catch(() => {});
    await runProfileWizardIfNeeded(page, profile, progress);
  }

  if (!jobsUrl) {
    throw new Error('Sin signup_job_id — no se puede abrir la página del job en WaaS');
  }

  progress(`Abriendo listing del job: ${jobId}`);
  await page.goto(jobsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(3500);

  // --- PASO A: botón Apply en la página del job ---
  progress('Paso 1/2: clic Apply en la oferta...');
  let applied = await clickApply(page, progress);
  if (!applied) {
    const orangeApply = page.locator('button, a').filter({ hasText: /^apply$/i }).first();
    if (await orangeApply.isVisible({ timeout: 5000 }).catch(() => false)) {
      await orangeApply.click({ force: true });
      applied = true;
      progress('✓ Apply (locator naranja)');
    }
  }
  await wait(2500);

  // --- PASO B: modal "Reach out to …" → mensaje 50+ chars → Send ---
  for (let attempt = 0; attempt < 6; attempt++) {
    if (await isReachOutModalVisible(page)) {
      progress('Paso 2/2: modal Reach out — rellenando y Send...');
      await fillReachOutModal(page, { shortMessage, coverLetter, profile }, progress);
      await wait(600);
      await clickSend(page, progress);
      await wait(4000);
    }

    const body = await page.locator('body').innerText().catch(() => '');
    if (/thank you|message sent|application submitted|we received|you.?ve applied|successfully/i.test(body)) {
      return { success: true, url: page.url(), message: '¡Mensaje enviado a la startup!' };
    }

    if (/\/jobs\/\d+/.test(page.url()) && attempt < 3) {
      await clickApply(page, progress);
      await wait(2000);
      continue;
    }

    if (!await isReachOutModalVisible(page)) break;
  }

  // Formularios extra (CV, textarea fuera del modal)
  const message = buildOutreachMessage(shortMessage, coverLetter, profile);
  const textareas = page.locator('textarea:visible');
  const n = await textareas.count();
  for (let t = 0; t < n; t++) {
    const ta = textareas.nth(t);
    const cur = await ta.inputValue().catch(() => '');
    if (cur.trim().length < 50) await ta.fill(message);
  }

  if (cvBuffer?.length) {
    const file = page.locator('input[type="file"]').first();
    if (await file.count() > 0) {
      const tmp = path.join(os.tmpdir(), `applyos-cv-${Date.now()}.pdf`);
      await fs.promises.writeFile(tmp, cvBuffer);
      try {
        await file.setInputFiles(tmp);
        progress('CV adjuntado');
      } finally {
        await fs.promises.unlink(tmp).catch(() => {});
      }
    }
  }

  if (await isReachOutModalVisible(page)) {
    await fillReachOutModal(page, { shortMessage, coverLetter, profile }, progress);
    await clickSend(page, progress);
    await wait(3000);
  }

  const finalBody = await page.locator('body').innerText().catch(() => '');
  if (/thank you|sent|received|applied/i.test(finalBody)) {
    return { success: true, url: page.url(), message: '¡Aplicación enviada!' };
  }

  return {
    success: false,
    url: page.url(),
    message: 'Quedó en el modal o en el job. Revisá Chrome — debería faltar Send tras el mensaje.',
  };
}
