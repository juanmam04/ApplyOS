import { fetchHtml } from './ycJobs.js';
import { classifyRemote } from './remotePolicy.js';

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function parseYcJobApplyMetaFromHtml(html) {
  if (!html) return null;
  const text = decodeHtmlEntities(html);

  const signupJobId = text.match(/signup_job_id[=:](\d+)/i)?.[1]
    || text.match(/signup_job_id%3D(\d+)/i)?.[1];

  const waasCompanyId = text.match(/waas_company[=:](\d+)/i)?.[1]
    || text.match(/defaults\[waas_company\]=(\d+)/i)?.[1]
    || text.match(/waas_company%5D=(\d+)/i)?.[1];

  const showDirectApply = /showDirectApply&quot;:true/i.test(text)
    || /"showDirectApply":true/.test(text);

  const greenhouseBoard = text.match(/boards\.greenhouse\.io\/([^/"'\s?]+)/i)?.[1];
  const ashbyBoard = text.match(/jobs\.ashbyhq\.com\/([^/"'\s?]+)/i)?.[1];
  const leverBoard = text.match(/jobs\.lever\.co\/([^/"'\s?]+)/i)?.[1];

  let provider = 'unknown';
  let apply_url = null;

  if (signupJobId && showDirectApply !== false) {
    provider = 'waas';
    const params = new URLSearchParams({ signup_job_id: signupJobId });
    if (waasCompanyId) params.set('company_id', waasCompanyId);
    apply_url = `https://www.workatastartup.com/application?${params}`;
  } else if (greenhouseBoard) {
    provider = 'greenhouse';
    apply_url = text.match(/https?:\/\/boards\.greenhouse\.io\/[^"'\s]+/)?.[0] || null;
  } else if (ashbyBoard) {
    provider = 'ashby';
    apply_url = text.match(/https?:\/\/jobs\.ashbyhq\.com\/[^"'\s]+application/)?.[0]
      || text.match(/https?:\/\/jobs\.ashbyhq\.com\/[^"'\s]+/)?.[0] || null;
  } else if (leverBoard) {
    provider = 'lever';
    apply_url = text.match(/https?:\/\/jobs\.lever\.co\/[^"'\s]+/)?.[0] || null;
  }

  if (!signupJobId && !apply_url) return null;

  return {
    provider,
    signup_job_id: signupJobId || null,
    waas_company_id: waasCompanyId || null,
    apply_url,
    greenhouse_board: greenhouseBoard || null,
    ashby_board: ashbyBoard || null,
    lever_board: leverBoard || null,
  };
}

export function parseYcJobLocationFromHtml(html) {
  if (!html) return '';
  const text = decodeHtmlEntities(html);

  const multi = text.match(/Remote[^"']{0,200}(?:US|CA|GB|Worldwide|Anywhere)?/i)?.[0];
  if (multi && /remote/i.test(multi)) return multi.replace(/\s+/g, ' ').trim().slice(0, 200);

  const locCountry = text.match(/"location":"([^"]+)","country":"([^"]+)"/);
  if (locCountry) {
    const loc = `${locCountry[1]}, ${locCountry[2]}`.trim();
    if (/^remote$/i.test(locCountry[1])) return 'Remote';
    return loc;
  }

  if (/\bRemote\b/.test(text) && !/NYC Office|on-site|onsite/i.test(text.slice(0, 5000))) {
    return 'Remote';
  }

  return '';
}

export async function fetchYcJobApplyMeta(jobUrl) {
  const html = await fetchHtml(jobUrl);
  return parseYcJobApplyMetaFromHtml(html);
}

/** Refresca ubicación, remoto y URL de apply desde la página del job YC */
export async function fetchYcJobFullDetails(jobUrl, partial = {}) {
  const html = await fetchHtml(jobUrl);
  const apply_meta = parseYcJobApplyMetaFromHtml(html);
  const location = parseYcJobLocationFromHtml(html) || partial.location || '';
  const job = {
    ...partial,
    location,
    job_url: jobUrl,
    role_title: partial.role_title || '',
    description: partial.description || '',
  };
  const remote = classifyRemote(job);
  return {
    apply_meta,
    location,
    remote_type: remote.remote_type,
    remote_eligible: remote.eligible,
    remote_reason: remote.reason,
  };
}
