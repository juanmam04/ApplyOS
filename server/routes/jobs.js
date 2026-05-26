import { Router } from 'express';
import { getStore } from '../db/store.js';

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    res.json(await getStore().getJobStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    res.json(await getStore().listJobs(req.query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const job = await getStore().getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const job = await getStore().createJob(req.body);
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const job = await getStore().updateJob(req.params.id, req.body);
    if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await getStore().deleteJob(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
