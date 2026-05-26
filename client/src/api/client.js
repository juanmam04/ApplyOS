const BASE = '/api';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch (e) {
    const msg = e?.message || String(e);
    if (/Failed to fetch|NetworkError|Load failed|ECONNREFUSED|AbortError/i.test(msg)) {
      throw new Error(
        'No hay conexión con el backend. En la carpeta del proyecto ejecutá npm run dev y esperá a ver «ApplyOS server» en la terminal.',
      );
    }
    throw e;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Error en la solicitud');
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  profile: {
    get: () => request('/profile'),
    update: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
    fromCv: (cvId) => request('/profile/from-cv', {
      method: 'POST',
      body: JSON.stringify(cvId ? { cvId } : {}),
    }),
  },
  cv: {
    list: () => request('/cv'),
    upload: (file) => {
      const form = new FormData();
      form.append('cv', file);
      return fetch(`${BASE}/cv/upload`, { method: 'POST', body: form }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || 'Error al subir CV');
        }
        return res.json();
      });
    },
    activate: (id) => request(`/cv/${id}/activate`, { method: 'PUT' }),
    delete: (id) => request(`/cv/${id}`, { method: 'DELETE' }),
    fileUrl: (id) => `${BASE}/cv/${id}/file`,
    downloadUrl: (id) => `${BASE}/cv/${id}/file?download=1`,
  },
  jobs: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/jobs${qs ? `?${qs}` : ''}`);
    },
    get: (id) => request(`/jobs/${id}`),
    create: (data) => request('/jobs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/jobs/${id}`, { method: 'DELETE' }),
    stats: () => request('/jobs/stats'),
  },
  interview: {
    get: (jobId) => request(`/interview/${jobId}`),
    update: (jobId, data) => request(`/interview/${jobId}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  generate: {
    application: (jobId) => request(`/generate/application/${jobId}`, { method: 'POST' }),
    interviewPrep: (jobId) => request(`/generate/interview-prep/${jobId}`, { method: 'POST' }),
    coverLetterPdf: async ({ coverLetter, companyName, roleTitle }) => {
      const res = await fetch(`${BASE}/generate/cover-letter-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverLetter, companyName, roleTitle }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Error al generar PDF');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";\n]+)"?/i);
      const filename = match ? match[1] : 'Cover_Letter.pdf';
      return { blob, filename };
    },
  },
  opportunities: {
    list: (status = 'pending') => request(`/opportunities?status=${status}`),
    applyStatus: () => request('/opportunities/apply/status'),
    scan: () => request('/opportunities/scan', { method: 'POST' }),
    apply: async (id, mode) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5 * 60 * 1000);
      try {
        let res;
        try {
          res = await fetch(`${BASE}/opportunities/${id}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mode ? { mode } : {}),
            signal: controller.signal,
          });
        } catch (e) {
          const msg = e?.message || String(e);
          if (/Failed to fetch|NetworkError|ECONNREFUSED/i.test(msg)) {
            throw new Error(
              'No hay conexión con el backend. Ejecutá npm run dev y esperá a que el server arranque en el puerto 47291.',
            );
          }
          throw e;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || 'Error al aplicar');
        }
        return res.json();
      } finally {
        clearTimeout(timer);
      }
    },
    confirm: (id) => request(`/opportunities/${id}/confirm`, { method: 'POST' }),
    dismiss: (id) => request(`/opportunities/${id}/dismiss`, { method: 'POST' }),
    research: (id) => request(`/opportunities/${id}/research`, { method: 'POST' }),
    regenerateDraft: (id) => request(`/opportunities/${id}/regenerate-draft`, { method: 'POST' }),
  },
  settings: {
    apply: () => request('/settings/apply'),
    testApplyLogin: () => request('/settings/apply/test', { method: 'POST' }),
  },
  startups: {
    sources: () => request('/startups/sources'),
    ycFeed: (role = 'full-stack') => request(`/startups/yc/feed?role=${role}`),
    ycImport: (job) => request('/startups/yc/import', {
      method: 'POST',
      body: JSON.stringify(job),
    }),
    discovered: () => request('/startups/discovered'),
    import: (url, description) => request('/startups/import', {
      method: 'POST',
      body: JSON.stringify({ url, description }),
    }),
    saveImport: (job) => request('/startups/import/save', {
      method: 'POST',
      body: JSON.stringify(job),
    }),
  },
};
