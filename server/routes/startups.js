import { Router } from 'express';
import { STARTUP_SOURCES } from '../data/startupSources.js';
import { importJobFromUrl, saveImportedJob } from '../services/startupImport.js';
import { fetchYcJobsFeed, jobToImportPreview } from '../services/ycJobs.js';
import { parseJobFromContent } from '../services/startupImport.js';
import { getStore } from '../db/store.js';

const router = Router();

router.get('/sources', (_req, res) => {
  res.json(STARTUP_SOURCES);
});

router.get('/yc/feed', async (req, res) => {
  try {
    const role = req.query.role || 'full-stack';
    const jobs = await fetchYcJobsFeed(role);
    res.json({ source: 'ycombinator', url: 'https://www.ycombinator.com/jobs', jobs });
  } catch (err) {
    console.error('YC feed error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/yc/import', async (req, res) => {
  try {
    const job = req.body;
    if (!job?.job_url) return res.status(400).json({ error: 'job_url requerida' });

    const store = getStore();
    const profile = await store.getProfile();

    let preview = jobToImportPreview(job);

    if (process.env.OPENAI_API_KEY) {
      try {
        const enriched = await parseJobFromContent({
          url: job.job_url,
          pageText: [
            job.company_name, job.role_title, job.description,
            job.salary_range, job.location, job.tech_stack?.join(', '),
            job.company_stage,
          ].filter(Boolean).join('\n'),
          profile,
        });
        preview = { ...preview, ...enriched, job_url: job.job_url };
      } catch (err) {
        console.warn('YC enrich skipped:', err.message);
      }
    }

    res.json({ preview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/discovered', async (_req, res) => {
  try {
    const jobs = await getStore().listJobs({ status: 'discovered' });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', async (req, res) => {
  try {
    const { url, description } = req.body;
    if (!url) return res.status(400).json({ error: 'URL requerida' });

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ error: 'URL inválida' });
    }

    const result = await importJobFromUrl(parsed.href, { description });
    res.json(result);
  } catch (err) {
    console.error('Import error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/import/save', async (req, res) => {
  try {
    const job = await saveImportedJob(req.body);
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
