/** Clics robustos en WaaS — DOM + Playwright (los botones suelen ser <button> con texto partido). */

export async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const CLICK_PATTERNS = {
  saveNext: /save\s*(?:&|and)?\s*next|guardar\s*y\s*siguiente|save\s*&\s*continue/i,
  continue: /^continue$|^continuar$/i,
  next: /^next$|^siguiente$/i,
  apply: /^apply$|^apply now$|^quick apply$|^aplicar$/i,
  submit: /submit|send application|confirm application|enviar/i,
  send: /^send$/i,
};

/**
 * Busca y hace clic en el primer elemento clickable cuyo texto coincide.
 * Usa click() nativo del DOM (más fiable que Playwright en SPAs de React).
 */
export async function clickByText(page, pattern, { timeout = 8000, label } = {}) {
  const deadline = Date.now() + timeout;
  const patternSource = pattern.source;

  while (Date.now() < deadline) {
    const result = await page.evaluate(({ patternSource: src }) => {
      const re = new RegExp(src, 'i');
      const nodes = document.querySelectorAll(
        'button, a, input[type="submit"], input[type="button"], [role="button"], [class*="Button"], [class*="btn"]',
      );

      for (const el of nodes) {
        if (el.disabled) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') {
          continue;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;

        const text = (
          el.innerText
          || el.textContent
          || el.value
          || el.getAttribute('aria-label')
          || ''
        ).replace(/\s+/g, ' ').trim();

        if (!text || !re.test(text)) continue;

        el.scrollIntoView({ block: 'center', inline: 'center' });
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        el.click();
        return { ok: true, text, tag: el.tagName };
      }
      return { ok: false };
    }, { patternSource });

    if (result.ok) {
      await wait(2800);
      return { clicked: true, text: result.text, tag: result.tag, label: label || patternSource };
    }

    // Fallback Playwright
    try {
      const pw = page.locator('button, a, input[type="submit"]').filter({ hasText: pattern }).first();
      if (await pw.isVisible({ timeout: 800 })) {
        await pw.scrollIntoViewIfNeeded();
        await pw.click({ force: true, timeout: 5000 });
        await wait(2800);
        return { clicked: true, text: 'playwright', label: label || patternSource };
      }
    } catch {
      /* retry */
    }

    await wait(400);
  }

  return { clicked: false };
}

export async function clickSaveAndNext(page, onProgress) {
  const patterns = [
    CLICK_PATTERNS.saveNext,
    /continue to (the )?next|next step|finish (this )?step/i,
    CLICK_PATTERNS.continue,
    CLICK_PATTERNS.next,
  ];
  for (const pattern of patterns) {
    const r = await clickByText(page, pattern, { timeout: 3500, label: pattern.source });
    if (r.clicked) {
      onProgress?.(`✓ Clic: ${r.text}`);
      return true;
    }
  }
  return false;
}

export async function clickApply(page, onProgress) {
  for (const pattern of [
    CLICK_PATTERNS.apply,
    /apply to this/i,
    /start application/i,
  ]) {
    const r = await clickByText(page, pattern, { timeout: 5000, label: 'Apply' });
    if (r.clicked) {
      onProgress?.(`✓ Clic Apply: ${r.text}`);
      return true;
    }
  }
  return false;
}

export async function clickSubmit(page, onProgress) {
  for (const pattern of [CLICK_PATTERNS.submit, CLICK_PATTERNS.saveNext]) {
    const r = await clickByText(page, pattern, { timeout: 4000, label: 'Submit' });
    if (r.clicked) {
      onProgress?.(`✓ Clic enviar: ${r.text}`);
      return true;
    }
  }
  return false;
}

/** Botón naranja "Send" del modal Reach out to… */
export async function clickSend(page, onProgress) {
  const modal = page.locator('[role="dialog"], [class*="modal" i], [class*="Modal"]').first();
  const scope = (await modal.isVisible({ timeout: 1500 }).catch(() => false)) ? modal : page;

  const sendBtn = scope.getByRole('button', { name: /^send$/i }).first();
  if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await sendBtn.scrollIntoViewIfNeeded();
    await sendBtn.click({ force: true });
    onProgress?.('✓ Clic Send (modal)');
    await wait(3500);
    return true;
  }

  const r = await clickByText(page, CLICK_PATTERNS.send, { timeout: 5000, label: 'Send' });
  if (r.clicked) onProgress?.(`✓ Clic Send: ${r.text}`);
  return r.clicked;
}

export function buildOutreachMessage(shortMessage, coverLetter, profile = {}) {
  let msg = (shortMessage || coverLetter || '').trim();
  const name = profile.full_name || 'Juan Manuel Martínez';

  if (msg.length < 50) {
    msg = [
      `Hi! My name is ${name}.`,
      "I'm a full-stack engineer based in Uruguay, open to fully remote roles at early-stage startups.",
      profile.summary ? profile.summary.slice(0, 200) : '',
      "I'm very interested in this role and would love to connect.",
      msg,
    ].filter(Boolean).join(' ');
  }

  if (msg.length < 50) {
    msg = `Hi! My name is ${name}. I'm actively looking for remote engineering roles and believe I'd be a strong fit for this team. I'd welcome the chance to speak.`;
  }

  return msg.slice(0, 2000);
}

export async function isReachOutModalVisible(page) {
  const body = await page.locator('body').innerText().catch(() => '');
  if (/reach out to/i.test(body) && /please write at least 50 characters/i.test(body)) return true;
  if (/reach out to/i.test(body) && await page.locator('textarea:visible').count() > 0) return true;
  return page.getByText(/reach out to/i).first().isVisible({ timeout: 1500 }).catch(() => false);
}

/** Rellena el textarea del modal (mín. 50 caracteres para habilitar Send). */
export async function fillReachOutModal(page, { shortMessage, coverLetter, profile } = {}, onProgress) {
  const finalMsg = buildOutreachMessage(shortMessage, coverLetter, profile);

  const filled = await page.evaluate((msg) => {
    const areas = [...document.querySelectorAll('textarea')].filter(ta => {
      const r = ta.getBoundingClientRect();
      return r.width > 50 && r.height > 30;
    });
    const ta = areas[0];
    if (!ta) return false;

    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) setter.call(ta, msg);
    else ta.value = msg;

    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    ta.focus();
    return ta.value.length >= 50;
  }, finalMsg);

  if (!filled) {
    const ta = page.locator('textarea:visible').first();
    if (await ta.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ta.click({ force: true });
      await ta.fill(finalMsg);
      await page.keyboard.press('Tab');
    }
  }

  onProgress?.(`Mensaje modal (${finalMsg.length} chars)`);
  await wait(800);
  return finalMsg;
}

/** Avanza el wizard de perfil hasta salir o 20 intentos. */
export async function blastThroughProfileWizard(page, onProgress, options = {}) {
  const { isProfileComplete } = options;
  const steps = ['personal', 'location', 'role', 'experience', 'skills', 'career', 'share'];
  let lastUrl = '';
  let sameUrlStreak = 0;

  for (let i = 0; i < 20; i++) {
    if (typeof isProfileComplete === 'function' && (await isProfileComplete())) {
      onProgress?.('Wizard perfil: detectado 100% en UI');
      return true;
    }

    const url = page.url();
    const step = steps.find((s) => url.includes(`/application/${s}`)) || '';

    if (url.includes('/share') || url.includes('/preview')) {
      onProgress?.('Wizard perfil: fin (share/preview)');
      return true;
    }
    if (/\/jobs\/\d+/.test(url) && !url.includes('/application/personal')) {
      onProgress?.('Wizard perfil: en página del job');
      return true;
    }
    if (url.includes('signup_job_id=') && !step) {
      onProgress?.('Wizard perfil: formulario de aplicación al job');
      return true;
    }

    if (step) onProgress?.(`Wizard: ${step} — avanzando...`);

    const clicked = await clickSaveAndNext(page, onProgress);
    if (clicked) {
      sameUrlStreak = 0;
      lastUrl = page.url();
      await wait(400);
      continue;
    }

    const idx = steps.indexOf(step);
    if (idx >= 0 && idx < steps.length - 1) {
      const nextStep = steps[idx + 1];
      const nextUrl = `https://www.workatastartup.com/application/${nextStep}`;
      onProgress?.(`Wizard: sin botón — navegando a /application/${nextStep}`);
      await page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
      await wait(2000);
      lastUrl = page.url();
      sameUrlStreak = 0;
      continue;
    }

    if (idx === steps.length - 1 && step === 'share') {
      return true;
    }

    if (url === lastUrl) {
      sameUrlStreak += 1;
      if (sameUrlStreak >= 3) {
        onProgress?.('Wizard perfil: mismo paso 3 veces — probando /application/share');
        await page.goto('https://www.workatastartup.com/application/share', {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        }).catch(() => {});
        await wait(2000);
        if (typeof isProfileComplete === 'function' && (await isProfileComplete())) return true;
        if (!page.url().includes('/application/personal')) return true;
        break;
      }
    } else {
      sameUrlStreak = 0;
    }

    lastUrl = page.url();
    await wait(600);
  }

  return !page.url().includes('/application/');
}
