import { Router } from 'express';
import { getStore } from '../db/store.js';
import { generateApplicationContent, generateInterviewPrepContent } from '../services/ai.js';

const router = Router();

router.post('/application/:jobId', async (req, res) => {
  try {
    const store = getStore();
    const job = await store.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });

    const profile = await store.getProfile() || {};

    if (process.env.OPENAI_API_KEY) {
      const content = await generateApplicationContent({ profile, job });
      return res.json(content);
    }

    res.status(503).json({ error: 'OPENAI_API_KEY no configurada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/interview-prep/:jobId', async (req, res) => {
  try {
    const store = getStore();
    const job = await store.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });

    const profile = await store.getProfile() || {};

    if (process.env.OPENAI_API_KEY) {
      const prep = await generateInterviewPrepContent({ profile, job });
      return res.json(prep);
    }

    res.status(503).json({ error: 'OPENAI_API_KEY no configurada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
