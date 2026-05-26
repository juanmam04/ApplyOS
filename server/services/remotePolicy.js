/**
 * Política de remoto para candidatos fuera de US (ej. Uruguay).
 * REMOTE_ONLY=true por defecto — excluyente.
 */

const CANDIDATE_COUNTRY = (process.env.CANDIDATE_COUNTRY || 'UY').toUpperCase();
const REMOTE_ONLY = process.env.REMOTE_ONLY !== 'false';
const REMOTE_STRICT = process.env.REMOTE_STRICT !== 'false';
const REJECT_US_ONLY_REMOTE = process.env.REJECT_US_ONLY_REMOTE !== 'false';

const ONSITE_PATTERNS = [
  /\bon[- ]?site\b/i,
  /\bin[- ]?office\b/i,
  /\bon[- ]?prem/i,
  /\boffice\b/i,
  /\bnyc office\b/i,
  /\bhq\b/i,
  /\brelocation\b/i,
];

const HYBRID_PATTERNS = [/\bhybrid\b/i, /\b\d+\s*days?\s*(in|at)\s*office/i];

const REMOTE_PATTERNS = [/\bremote\b/i, /\bwork from home\b/i, /\bwfh\b/i, /\bfully distributed\b/i];

const GLOBAL_REMOTE_PATTERNS = [
  /\bworldwide\b/i,
  /\bglobal\b/i,
  /\banywhere\b/i,
  /\bany country\b/i,
  /\blatam\b/i,
  /\blatin america\b/i,
  /\bamericas\b/i,
  /\buruguay\b/i,
  /\binternational\b/i,
  /\bremote\s*\([^)]*(?:;|\/)\s*(?:US|CA|MX|UK|EU)/i,
];

const US_ONLY_REMOTE_PATTERNS = [
  /\bremote\s*\(\s*us\s*\)\b/i,
  /\bremote\s*\(us\)/i,
  /\bus[- ]only\b/i,
  /\bunited states only\b/i,
  /\bmust be in (?:the )?us\b/i,
  /\bauthorized to work in (?:the )?us\b/i,
];

function haystack(job) {
  return [job.location, job.role_title, job.description, job.notes]
    .filter(Boolean)
    .join(' ');
}

export function classifyRemote(job) {
  const text = haystack(job);
  const loc = (job.location || '').trim();

  const hasRemote = REMOTE_PATTERNS.some(p => p.test(text));
  const hasHybrid = HYBRID_PATTERNS.some(p => p.test(text));
  const hasOnsite = ONSITE_PATTERNS.some(p => p.test(text)) && !hasRemote;

  if (US_ONLY_REMOTE_PATTERNS.some(p => p.test(text)) && !GLOBAL_REMOTE_PATTERNS.some(p => p.test(text))) {
    return { remote_type: 'remote_us_only', eligible: false, reason: 'Solo remoto en EE.UU. (no válido desde Uruguay)' };
  }

  if (GLOBAL_REMOTE_PATTERNS.some(p => p.test(text)) || loc === 'Remote' || /^remote$/i.test(loc)) {
    return { remote_type: 'remote', eligible: true, reason: 'Remoto (global o sin restricción US)' };
  }

  if (hasRemote && !hasOnsite) {
    if (/remote\s*\(\s*us\s*;/i.test(text) || /remote\s*\([^)]*ca/i.test(text)) {
      return { remote_type: 'remote', eligible: true, reason: 'Remoto con varias regiones' };
    }
    if (/remote\s*\(\s*us\s*\)/i.test(text) && REJECT_US_ONLY_REMOTE) {
      return { remote_type: 'remote_us_only', eligible: false, reason: 'Remoto limitado a EE.UU.' };
    }
    if (loc.includes('Remote') && /,\s*[A-Z]{2},\s*US/.test(loc) && !/remote/i.test(loc.split('/')[0])) {
      // "San Francisco, CA, US / Remote (US)" — has remote option
      return { remote_type: 'remote', eligible: true, reason: 'Oferta con opción remota' };
    }
    return { remote_type: 'remote', eligible: true, reason: 'Remoto detectado' };
  }

  if (hasHybrid && !hasRemote) {
    return { remote_type: 'hybrid', eligible: false, reason: 'Híbrido / presencial — no remoto 100%' };
  }

  if (hasOnsite || /\b(?:San Francisco|New York|NYC|Boston|Austin|Seattle|London|Berlin|Toronto|Montreal)[^•]*(?:US|CA|GB|DE)\b/i.test(loc)) {
    if (!hasRemote) {
      return { remote_type: 'onsite', eligible: false, reason: 'Presencial / oficina — requiere ubicación física' };
    }
  }

  if (!loc && !hasRemote) {
    return {
      remote_type: 'unknown',
      eligible: !REMOTE_STRICT,
      reason: REMOTE_STRICT ? 'Ubicación no clara — omitido en modo estricto remoto' : 'Ubicación no verificada',
    };
  }

  if (loc && !hasRemote) {
    return { remote_type: 'onsite', eligible: false, reason: `Sin remoto: ${loc.slice(0, 80)}` };
  }

  return { remote_type: 'unknown', eligible: !REMOTE_STRICT, reason: 'No se pudo confirmar remoto' };
}

export function isRemoteEligible(job) {
  if (!REMOTE_ONLY) return { eligible: true, ...classifyRemote(job) };
  const c = classifyRemote(job);
  return { eligible: c.eligible, remote_type: c.remote_type, reason: c.reason };
}

export function getRemotePolicy() {
  return {
    remote_only: REMOTE_ONLY,
    remote_strict: REMOTE_STRICT,
    reject_us_only: REJECT_US_ONLY_REMOTE,
    candidate_country: CANDIDATE_COUNTRY,
  };
}
