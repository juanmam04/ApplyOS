import { getStore } from '../db/store.js';
import { extractProfileFromCvText, getCvText } from './ai.js';

export async function generateProfileFromCv(cvId = null) {
  const store = getStore();
  let cv;

  if (cvId) {
    cv = await store.getCv(cvId);
  } else {
    cv = await store.getActiveCv();
  }

  if (!cv) {
    throw new Error('No hay CV subido. Sube un PDF primero en CV Manager.');
  }

  const cvText = await getCvText(cv);

  // Guardar texto extraído si se obtuvo del PDF
  if (cvText && (!cv.extracted_text || cv.extracted_text.length < 50)) {
    await store.updateCvText(cv.id, cvText);
  }

  const profileData = await extractProfileFromCvText(cvText);
  const profile = await store.updateProfile(profileData);

  return { profile, cvId: cv.id };
}
