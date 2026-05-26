const REMOTE_TYPES = ['remote', 'hybrid', 'onsite', 'unknown'];

const REMOTE_ALIASES = {
  'on-site': 'onsite',
  on_site: 'onsite',
  'in-person': 'onsite',
  in_person: 'onsite',
  office: 'onsite',
  presencial: 'onsite',
  'fully remote': 'remote',
  fully_remote: 'remote',
  wfh: 'remote',
  remoto: 'remote',
  híbrido: 'hybrid',
  hibrido: 'hybrid',
};

/** Valores permitidos por jobs_remote_type_check en Supabase */
export function normalizeRemoteType(value) {
  if (value == null || value === '') return 'unknown';

  const raw = String(value).trim().toLowerCase();
  if (REMOTE_ALIASES[raw]) return REMOTE_ALIASES[raw];
  if (REMOTE_TYPES.includes(raw)) return raw;

  if (/hybrid/i.test(raw)) return 'hybrid';
  if (/remote|remoto|wfh/i.test(raw)) return 'remote';
  if (/on[- ]?site|presencial|in[- ]?person|office/i.test(raw)) return 'onsite';

  return 'unknown';
}
