import { Router } from 'express';
import { getStore } from '../db/store.js';
import {
  runOpportunityScan,
  confirmOpportunity,
  applyOpportunity,
  refreshOpportunityFromJobPage,
} from '../services/opportunityScanner.js';
import { isAutoApplyConfigured } from '../services/autoApply/index.js';
import { getRemotePolicy, isRemoteEligible } from '../services/remotePolicy.js';
import { researchStartupBriefForOpportunity } from '../services/opportunityAI.js';
import { generateApplicationContent } from '../services/ai.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const store = getStore();
    let opportunities = await store.listOpportunitiesSafe(status);
    const policy = getRemotePolicy();
    const hidden_non_remote = [];

    if (policy.remote_only && status === 'pending') {
      const kept = [];
      for (const o of opportunities) {
        const r = isRemoteEligible(o);
        if (r.eligible) kept.push(o);
        else hidden_non_remote.push({ id: o.id, reason: r.reason });
      }
      opportunities = kept;
    }

    const scanner = await store.getScannerState();
    res.json({ opportunities, scanner, remote_policy: policy, hidden_non_remote });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/scan', async (_req, res) => {
  try {
    const result = await runOpportunityScan();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/scan/reset', async (_req, res) => {
  try {
    await getStore().setScannerState({ is_scanning: false, scan_started_at: null });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/apply/status', (_req, res) => {
  res.json({
    configured: isAutoApplyConfigured(),
    auto_apply_enabled: process.env.AUTO_APPLY !== 'false',
    dryRun: process.env.APPLY_DRY_RUN === 'true',
  });
});

router.post('/:id/apply', async (req, res) => {
  try {
    const mode = req.body?.mode || req.query?.mode;
    const result = await applyOpportunity(req.params.id, { mode });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/refresh', async (req, res) => {
  try {
    const result = await refreshOpportunityFromJobPage(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/confirm', async (req, res) => {
  try {
    const result = await confirmOpportunity(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/dismiss', async (req, res) => {
  try {
    const opp = await getStore().updateOpportunity(req.params.id, { status: 'dismissed' });
    res.json(opp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/research', async (req, res) => {
  try {
    const store = getStore();
    const opp = await store.getOpportunity(req.params.id);
    if (!opp) return res.status(404).json({ error: 'Oportunidad no encontrada' });

    const { analysis } = await researchStartupBriefForOpportunity(opp);
    const updated = await store.updateOpportunity(opp.id, { analysis });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/regenerate-draft', async (req, res) => {
  try {
    const store = getStore();
    const opp = await store.getOpportunity(req.params.id);
    if (!opp) return res.status(404).json({ error: 'Oportunidad no encontrada' });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OPENAI_API_KEY no configurada' });
    }
    const profile = (await store.getProfile()) || {};
    const draft = await generateApplicationContent({
      profile,
      job: {
        company_name: opp.company_name,
        role_title: opp.role_title,
        tech_stack: opp.tech_stack,
        description: opp.description,
        location: opp.location,
        company_stage: opp.company_stage,
      },
    });
    const updated = await store.updateOpportunity(opp.id, { application_draft: draft });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
