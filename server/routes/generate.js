import { Router } from 'express';
import { getStore } from '../db/store.js';
import { generateApplicationContent, generateInterviewPrepContent } from '../services/ai.js';
import { buildCoverLetterPdf } from '../services/coverLetterPdf.js';

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

router.post('/cover-letter-pdf', async (req, res) => {
  try {
    const { coverLetter, companyName, roleTitle } = req.body || {};
    const profile = await getStore().getProfile() || {};
    const applicantName = profile.full_name || '';

    const { buffer, filename } = await buildCoverLetterPdf({
      coverLetter,
      companyName,
      roleTitle,
      applicantName,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
