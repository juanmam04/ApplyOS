import { Router } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { getStore } from '../db/store.js';
import { uploadCvPdf, downloadCvPdf, deleteCvFile } from '../db/cvStorage.js';
import { generateProfileFromCv } from '../services/profileFromCv.js';

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.get('/', async (req, res) => {
  try {
    res.json(await getStore().listCv());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

    let extractedText = '';
    try {
      const pdf = await pdfParse(req.file.buffer);
      extractedText = pdf.text || '';
    } catch {
      extractedText = '';
    }

    const storagePath = await uploadCvPdf(req.file.buffer, req.file.originalname);

    const store = getStore();
    const count = await store.countCv();
    const isFirst = count === 0;

    const cv = await store.createCv({
      filename: storagePath,
      original_name: req.file.originalname,
      storage_path: storagePath,
      extracted_text: extractedText,
      is_active: isFirst,
    });

    let profile = null;
    let profileError = null;
    try {
      const result = await generateProfileFromCv(cv.id);
      profile = result.profile;
    } catch (err) {
      profileError = err.message;
      console.warn('Auto profile generation failed:', err.message);
    }

    res.status(201).json({ cv, profile, profileError });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/activate', async (req, res) => {
  try {
    const cv = await getStore().activateCv(req.params.id);
    res.json(cv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const store = getStore();
    const cv = await store.getCv(req.params.id);
    if (!cv) return res.status(404).json({ error: 'CV no encontrado' });

    await deleteCvFile(cv.storage_path);
    await store.deleteCv(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/file', async (req, res) => {
  try {
    const cv = await getStore().getCv(req.params.id);
    if (!cv) return res.status(404).json({ error: 'CV no encontrado' });

    const buffer = await downloadCvPdf(cv.storage_path);
    const asDownload = req.query.download === '1' || req.query.download === 'true';
    const safeName = (cv.original_name || 'cv.pdf').replace(/[^\w.\- ]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${asDownload ? 'attachment' : 'inline'}; filename="${safeName}"`,
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
