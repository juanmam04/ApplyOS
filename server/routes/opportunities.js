import { Router } from 'express';
import { getStore } from '../db/store.js';
import { runOpportunityScan, confirmOpportunity } from '../services/opportunityScanner.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const opportunities = await getStore().listOpportunities(status);
    const scanner = await getStore().getScannerState();
    res.json({ opportunities, scanner });
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

export default router;
