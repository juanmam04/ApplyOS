const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

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
  },
  opportunities: {
    list: (status = 'pending') => request(`/opportunities?status=${status}`),
    scan: () => request('/opportunities/scan', { method: 'POST' }),
    confirm: (id) => request(`/opportunities/${id}/confirm`, { method: 'POST' }),
    dismiss: (id) => request(`/opportunities/${id}/dismiss`, { method: 'POST' }),
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
