import { fetchYcJobApplyMeta } from '../ycApplyMeta.js';
import { applyViaWaas } from './waas.js';
import { applyViaExternalAts } from './externalAts.js';
import { getStore } from '../../db/store.js';
import { downloadCvPdf } from '../../db/cvStorage.js';
import { buildCoverLetterPdf } from '../coverLetterPdf.js';

import { hasBrowserProfile } from './browserSession.js';

export function isAutoApplyConfigured() {
  const user = process.env.YC_APPLY_USERNAME || process.env.YC_APPLY_EMAIL;
  return !!(user?.trim() && process.env.YC_APPLY_PASSWORD?.trim() && hasBrowserProfile());
}

export async function resolveApplyMeta(opp) {
  if (opp.apply_meta?.apply_url || opp.apply_meta?.signup_job_id) {
    return opp.apply_meta;
  }
  if (!opp.job_url) throw new Error('Sin URL de oferta');
  const meta = await fetchYcJobApplyMeta(opp.job_url);
  if (!meta) throw new Error('No se pudo detectar el formulario de aplicación');
  return meta;
}

async function getActiveCvBuffer(store) {
  const versions = await store.listCv();
  const active = versions.find(v => v.is_active) || versions[0];
  if (!active?.storage_path) {
    throw new Error('Sube un CV activo en CV Manager antes de aplicar');
  }
  const buffer = await downloadCvPdf(active.storage_path);
  return { buffer, filename: active.original_name || 'cv.pdf' };
}

export async function submitApplication(opp) {
  const store = getStore();
  const profile = await store.getProfile() || {};
  const applyMeta = await resolveApplyMeta(opp);

  const draft = opp.application_draft || {};
  const { buffer: cvBuffer, filename: cvFilename } = await getActiveCvBuffer(store);

  let coverLetterPdf = null;
  if (draft.coverLetter) {
    const built = await buildCoverLetterPdf({
      coverLetter: draft.coverLetter,
      companyName: opp.company_name,
      roleTitle: opp.role_title,
      applicantName: profile.full_name,
    });
    coverLetterPdf = built.buffer;
  }

  if (applyMeta.provider === 'waas' || applyMeta.signup_job_id) {
    return applyViaWaas({
      applyMeta,
      profile,
      cvBuffer,
      coverLetter: draft.coverLetter,
      shortMessage: draft.shortMessage,
    });
  }

  if (applyMeta.apply_url && ['greenhouse', 'ashby', 'lever', 'unknown'].includes(applyMeta.provider)) {
    return applyViaExternalAts({
      applyMeta,
      profile,
      cvBuffer,
      cvFilename,
      coverLetter: draft.coverLetter,
      shortMessage: draft.shortMessage,
    });
  }

  throw new Error(`Proveedor de aplicación no soportado: ${applyMeta.provider}`);
}
