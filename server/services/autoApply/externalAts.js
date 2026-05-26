import { chromium } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';

async function fillIfVisible(page, selectors, value) {
  if (!value) return false;
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1200 }).catch(() => false)) {
      await el.fill(String(value));
      return true;
    }
  }
  return false;
}

export async function applyViaExternalAts({
  applyMeta,
  profile,
  cvBuffer,
  cvFilename,
  coverLetter,
  shortMessage,
}) {
  if (process.env.APPLY_DRY_RUN === 'true') {
    return { success: true, dryRun: true, url: applyMeta.apply_url };
  }

  if (!applyMeta.apply_url) {
    throw new Error('Esta oferta usa un formulario externo sin URL detectada — aplica manualmente');
  }

  const browser = await chromium.launch({
    headless: process.env.APPLY_HEADLESS !== 'false',
  });
  const page = await browser.newPage();

  try {
    await page.goto(applyMeta.apply_url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    const name = profile.full_name || '';
    const parts = name.split(/\s+/);
    await fillIfVisible(page, ['#first_name', 'input[name="first_name"]'], parts[0]);
    await fillIfVisible(page, ['#last_name', 'input[name="last_name"]'], parts.slice(1).join(' '));
    await fillIfVisible(page, ['input[type="email"]', '#email'], profile.email);
    await fillIfVisible(page, ['input[type="tel"]', '#phone'], profile.phone);
    await fillIfVisible(page, ['#job_application_answers_attributes_0_text_value', 'textarea'], coverLetter || shortMessage);

    const fileInput = page.locator('input[type="file"]').first();
    if (cvBuffer?.length && await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tmp = path.join(os.tmpdir(), `applyos-${Date.now()}.pdf`);
      await fs.promises.writeFile(tmp, cvBuffer);
      try {
        await fileInput.setInputFiles(tmp);
      } finally {
        await fs.promises.unlink(tmp).catch(() => {});
      }
    }

    const submit = page.locator('button:has-text("Submit"), input[type="submit"], #submit_app').first();
    if (await submit.isVisible({ timeout: 4000 }).catch(() => false)) {
      await submit.click();
      await page.waitForTimeout(3000);
    }

    const text = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    const success = /thank you|application received|submitted/i.test(text);

    return {
      success,
      url: page.url(),
      message: success ? 'Aplicación enviada' : 'Formulario completado — confirma en la web del ATS',
      provider: applyMeta.provider,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
