import { Router } from 'express';
import { getStore } from '../db/store.js';

const router = Router();

const EMPTY_PREP = {
  technical_questions: [],
  product_questions: [],
  project_questions: [],
  servo_questions: [],
  questions_to_ask: [],
  notes: '',
};

router.get('/:jobId', async (req, res) => {
  try {
    const prep = await getStore().getInterviewPrep(req.params.jobId);
    res.json(prep ? { ...prep, job_id: parseInt(req.params.jobId) } : { job_id: parseInt(req.params.jobId), ...EMPTY_PREP });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:jobId', async (req, res) => {
  try {
    const prep = await getStore().upsertInterviewPrep(req.params.jobId, req.body);
    res.json(prep);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
