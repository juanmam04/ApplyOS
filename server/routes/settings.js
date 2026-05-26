import { Router } from 'express';
import { isAutoApplyConfigured } from '../services/autoApply/index.js';
import { hasBrowserProfile, launchWaasBrowser, needsYcLogin } from '../services/autoApply/browserSession.js';

const router = Router();

router.get('/apply', (_req, res) => {
  const user = process.env.YC_APPLY_USERNAME || process.env.YC_APPLY_EMAIL;
  res.json({
    configured: isAutoApplyConfigured(),
    has_session: hasBrowserProfile(),
    has_credentials: !!(user?.trim() && process.env.YC_APPLY_PASSWORD?.trim()),
    username: user ? `${user.slice(0, 3)}***` : null,
    auto_apply: process.env.AUTO_APPLY !== 'false',
    dryRun: process.env.APPLY_DRY_RUN === 'true',
    headless: process.env.APPLY_HEADLESS === 'true',
  });
});

router.post('/apply/test', async (_req, res) => {
  try {
    if (!hasBrowserProfile()) {
      return res.status(400).json({
        error: 'Sin sesión guardada. En la carpeta ApplyOS: npm run yc:login',
      });
    }

    const context = await launchWaasBrowser({ headless: true });
    const page = context.pages()[0] || await context.newPage();
    try {
      await page.goto('https://www.workatastartup.com/application?signup_job_id=1', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      const ok = !(await needsYcLogin(page));
      res.json({ ok, url: page.url() });
    } finally {
      await context.close();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
