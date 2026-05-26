export const JOB_STATUSES = [
  { value: 'discovered', label: 'Descubierto', color: 'text-gray-400 bg-gray-400/10' },
  { value: 'saved', label: 'Guardado', color: 'text-blue-400 bg-blue-400/10' },
  { value: 'applied', label: 'Aplicado', color: 'text-violet-400 bg-violet-400/10' },
  { value: 'interview', label: 'Entrevista', color: 'text-amber-400 bg-amber-400/10' },
  { value: 'rejected', label: 'Rechazado', color: 'text-red-400 bg-red-400/10' },
  { value: 'offer', label: 'Oferta', color: 'text-emerald-400 bg-emerald-400/10' },
];

export const REMOTE_TYPES = [
  { value: 'remote', label: 'Remoto' },
  { value: 'hybrid', label: 'Híbrido' },
  { value: 'onsite', label: 'Presencial' },
  { value: 'unknown', label: 'No especificado' },
];

export const COMPANY_STAGES = [
  'Pre-seed', 'Seed', 'Serie A', 'Serie B', 'Growth', 'Scale-up', 'Enterprise',
];

export function getStatusConfig(status) {
  return JOB_STATUSES.find(s => s.value === status) || JOB_STATUSES[0];
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export const EMPTY_PROFILE = {
  full_name: '', email: '', phone: '', location: '',
  linkedin: '', github: '', portfolio: '', current_title: '',
  summary: '', skills: [], work_experience: [], projects: [],
  preferred_roles: [], preferred_countries: [],
  salary_expectations: '', work_preferences: '',
};

export const EMPTY_JOB = {
  company_name: '', role_title: '', job_url: '', company_website: '',
  location: '', remote_type: 'unknown', salary_range: '', tech_stack: [],
  company_stage: '', description: '', status: 'discovered', match_score: 0, notes: '',
};

export const EMPTY_ANALYSIS = {
  technical_match: '', startup_fit: '', seniority_match: '', remote_fit: '',
  red_flags: '', why_apply: '', what_to_emphasize: '', what_to_study: '',
};
