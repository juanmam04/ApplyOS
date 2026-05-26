import * as cheerio from 'cheerio';

const YC_JOBS_URL = 'https://www.ycombinator.com/jobs';
const YC_ROLE_URLS = {
  'full-stack': 'https://www.ycombinator.com/jobs/role/full-stack-engineer',
  backend: 'https://www.ycombinator.com/jobs/role/backend-engineer',
  frontend: 'https://www.ycombinator.com/jobs/role/frontend-engineer',
};

let feedCache = { data: null, at: 0 };
const CACHE_MS = 15 * 60 * 1000;

function titleCase(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function parseCardText(text, slug) {
  const batch = text.match(/\(([SW]\d{2})\)/)?.[1] || '';
  const companyName = text.match(/^([^(•]+?)\s*\([SW]\d{2}\)/)?.[1]?.trim()
    || titleCase(slug);

  const roleTitle = text.match(/ago\)([^•]+?)(?:Full-time|Internship)/)?.[1]?.trim()
    || text.match(/ago\)([^•]+)/)?.[1]?.trim()
    || titleCase(text.split('/jobs/').pop()?.replace(/-/g, ' ') || 'Engineer');

  const salary = text.match(/\$[\d.,]+K?\s*-\s*\$[\d.,]+K?(?:\s*(?:USD|CAD|GBP|INR))?|₹[\d.]+M\s*-\s*₹[\d.]+M\s*INR|£[\d.]+K\s*-\s*£[\d.]+K\s*GBP/)?.[0] || '';

  const locMatch = text.match(/•((?:Remote|[\w\s,]+(?:US|CA|GB|IN|Office))[^•]*?)(?:Apply|$)/);
  const location = locMatch?.[1]?.trim() || '';

  const remote_type = /remote/i.test(location) ? 'remote' : 'unknown';

  const stack = [];
  if (/full\s*stack/i.test(text)) stack.push('Full stack');
  if (/backend/i.test(text)) stack.push('Backend');
  if (/frontend/i.test(text)) stack.push('Frontend');
  if (/devops/i.test(text)) stack.push('DevOps');
  if (/robotics/i.test(text)) stack.push('Robotics');

  const tagline = text.match(/\([SW]\d{2}\)([^•(]+?)(?:\1|\([SW])/i)?.[1]?.trim().slice(0, 120) || '';

  return {
    company_name: companyName,
    role_title: roleTitle.replace(/\s+at\s+.+$/i, '').trim(),
    company_stage: batch ? `YC ${batch}` : 'YC',
    salary_range: salary,
    location,
    remote_type,
    tech_stack: stack,
    description: tagline,
    source: 'ycombinator',
  };
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) throw new Error(`YC respondió ${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timeout);
  }
}

export function parseYcJobsFromHtml(html, baseUrl = YC_JOBS_URL) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const jobs = [];

  $('a[href*="/companies/"][href*="/jobs/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || seen.has(href)) return;
    seen.add(href);

    const m = href.match(/\/companies\/([^/]+)\/jobs\/([^/?]+)/);
    if (!m) return;

    const card = $(el).closest('div').parent().parent();
    const text = card.text().replace(/\s+/g, ' ').trim();
    const parsed = parseCardText(text, m[1]);
    const jobUrl = href.startsWith('http') ? href : `https://www.ycombinator.com${href}`;

    jobs.push({
      ...parsed,
      job_url: jobUrl,
      company_website: `https://www.ycombinator.com/companies/${m[1]}`,
      status: 'discovered',
      match_score: 0,
      notes: `Importado desde Y Combinator Jobs`,
    });
  });

  return jobs;
}

export async function fetchYcJobsFeed(role = 'full-stack') {
  const cacheKey = role;
  if (feedCache.data?.[cacheKey] && Date.now() - feedCache.at < CACHE_MS) {
    return feedCache.data[cacheKey];
  }

  const url = YC_ROLE_URLS[role] || YC_JOBS_URL;
  const html = await fetchHtml(url);
  const jobs = parseYcJobsFromHtml(html, url);

  if (!feedCache.data) feedCache.data = {};
  feedCache.data[cacheKey] = jobs;
  feedCache.at = Date.now();

  return jobs;
}

export function jobToImportPreview(ycJob) {
  return {
    company_name: ycJob.company_name,
    role_title: ycJob.role_title,
    job_url: ycJob.job_url,
    company_website: ycJob.company_website,
    location: ycJob.location,
    remote_type: ycJob.remote_type,
    salary_range: ycJob.salary_range,
    tech_stack: ycJob.tech_stack,
    company_stage: ycJob.company_stage,
    description: ycJob.description,
    status: 'discovered',
    match_score: ycJob.match_score || 0,
    notes: ycJob.notes,
  };
}
