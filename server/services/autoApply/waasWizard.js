import fs from 'fs';
import path from 'path';
import os from 'os';

const PROFILE_DONE_FLAG = path.join(os.homedir(), '.applyos', 'waas-profile-complete');

export function isWaasProfileMarkedComplete() {
  return fs.existsSync(PROFILE_DONE_FLAG);
}

export function markWaasProfileComplete() {
  fs.mkdirSync(path.dirname(PROFILE_DONE_FLAG), { recursive: true });
  fs.writeFileSync(PROFILE_DONE_FLAG, new Date().toISOString());
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function clickContinue(page) {
  const btn = page.getByRole('button', { name: /^continue/i }).first();
  if (!(await btn.isVisible({ timeout: 4000 }).catch(() => false))) return false;
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await btn.click({ force: true });
  await wait(2000);
  return true;
}

async function clickLabel(page, pattern) {
  const label = page.locator('label').filter({ hasText: pattern }).first();
  if (await label.isVisible({ timeout: 2500 }).catch(() => false)) {
    await label.click();
    return true;
  }
  return page.getByText(pattern).first().click({ timeout: 2000 }).then(() => true).catch(() => false);
}

async function fillIfEmpty(page, selector, value) {
  if (!value) return;
  const el = page.locator(selector).first();
  if (!(await el.isVisible({ timeout: 2500 }).catch(() => false))) return;
  if (!(await el.inputValue().catch(() => ''))?.trim()) {
    await el.fill(String(value));
  }
}

/** Rellena skills con teclado (más estable que click en opciones). */
async function fillSkills(page, skills) {
  const control = page.locator('.reactselect__control').first();
  const combo = page.getByRole('combobox').first();

  if (!(await control.isVisible({ timeout: 8000 }).catch(() => false))) {
    console.warn('ApplyOS: no encontró selector de skills');
    return false;
  }

  await control.click({ force: true });
  await wait(400);

  const list = (skills?.length ? skills : ['JavaScript', 'React', 'Node.js', 'Ruby on Rails', 'PostgreSQL'])
    .slice(0, 6);

  for (const skill of list) {
    await combo.click({ force: true }).catch(() => control.click());
    await combo.fill('');
    await page.keyboard.type(skill, { delay: 40 });
    await wait(600);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await wait(450);
  }

  const chips = await page.locator('.reactselect__multi-value__label').count();
  return chips >= 2;
}

async function fillStep(page, step, profile) {
  const url = page.url();

  if (url.includes('/personal') || step === 'personal') {
    const parts = (profile.full_name || 'Juan').split(/\s+/);
    await fillIfEmpty(page, 'input[name="first_name"]', parts[0]);
    await fillIfEmpty(page, 'input[name="last_name"]', parts.slice(1).join(' ') || 'Martinez');
    await fillIfEmpty(page, 'input[name="email"]', profile.email);
    let li = profile.linkedin || '';
    if (li && !li.startsWith('http')) li = `https://${li}`;
    await fillIfEmpty(page, 'input[name="linkedin"]', li);
    const phone = page.locator('input[type="tel"]').first();
    if (await phone.isVisible({ timeout: 1000 }).catch(() => false)) {
      if (!(await phone.inputValue().catch(() => ''))?.trim()) await phone.fill(profile.phone || '');
    }
    await clickLabel(page, /open to new opportunities/i).catch(() => clickLabel(page, /actively looking/i));
    await clickLabel(page, /no affiliation/i);
  }

  if (url.includes('/location') || step === 'location') {
    const city = page.locator('input[name="city_current"]').first();
    if (await city.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (!(await city.inputValue().catch(() => ''))?.trim()) {
        await city.fill('Montevideo, Uruguay');
        await wait(500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
      }
    }
    const locRadios = [
      [/authorized to work in the united states/i, /^yes$/i],
      [/visa sponsorship/i, /^no$/i],
      [/want to work remotely/i, /only want/i],
      [/willing to relocate/i, /^no$/i],
    ];
    for (const [section, answer] of locRadios) {
      const block = page.locator('div, fieldset, section').filter({ hasText: section }).first();
      if (await block.isVisible({ timeout: 800 }).catch(() => false)) {
        await block.getByText(answer).first().click().catch(() => {});
      }
    }
    await clickLabel(page, /only want to work remotely/i).catch(() => clickLabel(page, /open to working remotely/i));
  }

  if (url.includes('/role') || step === 'role') {
    await clickLabel(page, /^engineering/i);
    let gh = profile.github || '';
    if (gh && !gh.startsWith('http')) gh = `https://${gh}`;
    await fillIfEmpty(page, 'input[name="github"]', gh);
    await clickLabel(page, /in_school|currently in school/i).catch(() => {});
    await clickLabel(page, /^no$/i);
  }

  if (url.includes('/experience') || step === 'experience') {
    const j = profile.work_experience?.[0];
    if (j) {
      await fillIfEmpty(page, '#downshift-0-input', j.company);
      await fillIfEmpty(page, '#downshift-1-input', j.title);
    }
    const summary = page.locator('textarea[name="summary"]').first();
    if (await summary.isVisible({ timeout: 1000 }).catch(() => false)) {
      const cur = await summary.inputValue().catch(() => '');
      if (!cur?.trim()) await summary.fill((j?.description || profile.summary || '').slice(0, 500));
    }
  }

  if (url.includes('/skills') || step === 'skills') {
    const ok = await fillSkills(page, profile.skills);
    if (!ok) throw new Error('Skills: elegí al menos 2 tecnologías. Ejecuta: cd server && npm run waas:login y completa Skills manualmente una vez.');
  }

  if (url.includes('/career') || step === 'career') {
    await fillSkills(page, ['Software Engineering', 'Full Stack']);
  }

  if (url.includes('/share') || step === 'share') {
    await fillSkills(page, ['English', 'Spanish']);
  }
}

/** Avanza el wizard desde donde esté el usuario (máx 20 pasos). */
export async function completeWaasProfile(page, profile, onProgress) {
  if (isWaasProfileMarkedComplete()) {
    onProgress?.('Perfil WaaS ya estaba completo');
    return;
  }

  await page.goto('https://www.workatastartup.com/application/personal', {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  await wait(1500);

  for (let i = 0; i < 20; i++) {
    const url = page.url();
    const step = url.split('/application/')[1]?.split('?')[0] || 'unknown';
    onProgress?.(`Paso WaaS: ${step}`);

    await fillStep(page, step, profile);

    if (url.includes('/share') || url.includes('/application/preview')) {
      markWaasProfileComplete();
      onProgress?.('Perfil WaaS completado');
      return;
    }

    const continued = await clickContinue(page);
    if (!continued) {
      if (url.includes('/skills')) {
        throw new Error(
          'Atascado en Skills. Abre Chrome: cd server && npm run waas:login — completa Skills y pulsa ENTER.',
        );
      }
      break;
    }
  }

  const body = await page.locator('body').innerText().catch(() => '');
  if (/100%\s*complete|profile is 100/i.test(body)) {
    markWaasProfileComplete();
  }
}

export async function submitJobApplication(page, applyMeta, { coverLetter, shortMessage, cvBuffer }) {
  const jobId = applyMeta.signup_job_id;
  const jobsUrl = jobId ? `https://www.workatastartup.com/jobs/${jobId}` : null;
  const applyUrl = applyMeta.apply_url
    || `https://www.workatastartup.com/application?signup_job_id=${jobId}`;

  if (jobsUrl) {
    await page.goto(jobsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(2000);

    const applyBtn = page.locator('button, a').filter({ hasText: /^apply$/i }).first();
    if (await applyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await applyBtn.click();
      await wait(3000);
    }
  }

  if (!page.url().includes('/application') && !page.url().includes('jobs')) {
    await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(2000);
  }

  const message = (shortMessage || coverLetter || '').slice(0, 2000);

  for (let i = 0; i < 15; i++) {
    const textareas = page.locator('textarea:visible');
    const n = await textareas.count();
    for (let t = 0; t < n; t++) {
      const ta = textareas.nth(t);
      if (!(await ta.inputValue().catch(() => ''))?.trim() && message) {
        await ta.fill(message);
      }
    }

    if (cvBuffer?.length) {
      const file = page.locator('input[type="file"]').first();
      if (await file.count() > 0) {
        const tmp = path.join(os.tmpdir(), `applyos-cv-${Date.now()}.pdf`);
        await fs.promises.writeFile(tmp, cvBuffer);
        try {
          await file.setInputFiles(tmp);
        } finally {
          await fs.promises.unlink(tmp).catch(() => {});
        }
      }
    }

    const body = await page.locator('body').innerText().catch(() => '');
    if (/thank you|application submitted|successfully applied|we received|you.?ve applied/i.test(body)) {
      return { success: true, url: page.url(), message: '¡Aplicación enviada!' };
    }

    const submit = page.getByRole('button', { name: /submit|send|apply now|confirm application/i }).first();
    if (await submit.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submit.click();
      await wait(4000);
      const after = await page.locator('body').innerText().catch(() => '');
      if (/thank you|submitted|received/i.test(after)) {
        return { success: true, url: page.url(), message: '¡Aplicación enviada!' };
      }
    }

    if (await clickContinue(page)) continue;
    break;
  }

  return {
    success: false,
    url: page.url(),
    message: 'No se confirmó el envío. Revisa Chrome si quedó abierto o usa «Aplicar en YC».',
  };
}
