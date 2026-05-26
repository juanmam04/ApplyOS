import { Router } from 'express';
import { getStore } from '../db/store.js';
import { generateProfileFromCv } from '../services/profileFromCv.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    res.json(await getStore().getProfile());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    res.json(await getStore().updateProfile(req.body));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/from-cv', async (req, res) => {
  try {
    const { cvId } = req.body || {};
    const result = await generateProfileFromCv(cvId || null);
    res.json(result);
  } catch (err) {
    console.error('Profile from CV error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
