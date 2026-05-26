import * as cheerio from 'cheerio';
import OpenAI from 'openai';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

export function ycCompanySlugFromUrls(...urls) {
  for (const url of urls) {
    if (!url) continue;
    const m = String(url).match(/ycombinator\.com\/companies\/([^/?#]+)/);
    if (m) return m[1];
  }
  return null;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: FETCH_HEADERS });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function metaContent($, name) {
  return $(`meta[name="${name}"]`).attr('content')?.trim() || '';
}

function parseYcPage(html) {
  if (!html) return {};
  const $ = cheerio.load(html);
  const title = metaContent($, 'title') || $('title').text().trim();
  const description = metaContent($, 'description');
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || '';

  let website = '';
  $('a[href^="http"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (
      website ||
      href.includes('ycombinator.com') ||
      href.includes('linkedin.com') ||
      href.includes('twitter.com') ||
      href.includes('bookface')
    ) {
      return;
    }
    if (/^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(href)) website = href;
  });

  const bodySnippet = $('main, article, [class*="company"], body')
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2500);

  return { title, description, ogTitle, website, bodySnippet };
}

export async function gatherStartupContext(job) {
  const slug = ycCompanySlugFromUrls(job.company_website, job.job_url);
  const companyUrl = slug ? `https://www.ycombinator.com/companies/${slug}` : null;

  const [companyHtml, jobHtml] = await Promise.all([
    companyUrl ? fetchHtml(companyUrl) : null,
    job.job_url ? fetchHtml(job.job_url) : null,
  ]);

  const company = parseYcPage(companyHtml);
  const jobPage = parseYcPage(jobHtml);

  return {
    company_name: job.company_name,
    company_stage: job.company_stage || '',
    role_title: job.role_title || '',
    tagline_from_feed: job.description || '',
    yc_company_url: companyUrl,
    yc_meta: {
      title: company.title || company.ogTitle,
      description: company.description,
      website: company.website,
    },
    job_page: {
      title: jobPage.title,
      description: jobPage.description,
      snippet: jobPage.bodySnippet,
    },
    raw_snippet: [company.description, company.bodySnippet, jobPage.description]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 4000),
  };
}

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function explainStartupForUser(job) {
  const context = await gatherStartupContext(job);

  const openai = getOpenAI();
  if (!openai) {
    return fallbackBrief(context, job);
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Eres un mentor tech que explica startups a un candidato hispanohablante que NO conoce la empresa.
Investiga mentalmente con los datos proporcionados (YC, descripción, rol) y explica en ESPAÑOL claro, sin jerga innecesaria.

Devuelve JSON:
{
  "headline": "1 frase: qué es la empresa en palabras simples",
  "what_they_do": "2-4 frases: qué hacen, producto/servicio concreto",
  "who_its_for": "a quién venden / usuarios objetivo",
  "how_they_make_money": "modelo de negocio (B2B SaaS, suscripción, etc.) — si no está claro, dilo",
  "why_it_matters": "qué problema resuelven y por qué existe",
  "team_and_stage": "tamaño, batch YC, etapa si aparece en los datos",
  "as_engineer": "1-2 frases: qué harías tú como dev ahí (inferido del rol)",
  "analogy": "opcional: 'Es como X pero para Y' — solo si ayuda a entender",
  "confidence": "high|medium|low — según cuánta info real hay"
}

Reglas:
- Explica para que alguien sin contexto entienda en 30 segundos.
- No inventes funding, clientes famosos ni métricas que no aparezcan.
- Si la info es escasa, sé honesto (confidence: low) y explica solo lo inferible del nombre/rol/tagline.`,
      },
      {
        role: 'user',
        content: `Empresa: ${job.company_name}
Etapa: ${job.company_stage || 'desconocida'}
Rol ofertado: ${job.role_title || '—'}
Tagline del listado: ${job.description || '—'}

Datos YC / web scrapeados:
${JSON.stringify(context, null, 2)}`,
      },
    ],
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
  return normalizeBrief(parsed, context);
}

function fallbackBrief(context, job) {
  const desc = context.yc_meta?.description || context.raw_snippet || job.description || '';
  return {
    headline: job.company_name,
    what_they_do: desc || 'Sin datos suficientes — revisa la página de YC.',
    who_its_for: '',
    how_they_make_money: '',
    why_it_matters: '',
    team_and_stage: job.company_stage || '',
    as_engineer: job.role_title ? `Rol abierto: ${job.role_title}` : '',
    analogy: '',
    confidence: 'low',
    sources: { yc_company_url: context.yc_company_url },
  };
}

function normalizeBrief(data, context) {
  return {
    headline: data.headline || '',
    what_they_do: data.what_they_do || '',
    who_its_for: data.who_its_for || '',
    how_they_make_money: data.how_they_make_money || '',
    why_it_matters: data.why_it_matters || '',
    team_and_stage: data.team_and_stage || '',
    as_engineer: data.as_engineer || '',
    analogy: data.analogy || '',
    confidence: data.confidence || 'medium',
    sources: {
      yc_company_url: context.yc_company_url,
      website: context.yc_meta?.website || null,
    },
  };
}
