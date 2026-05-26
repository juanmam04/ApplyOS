import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { getStore } from '../db/store.js';
import { normalizeRemoteType } from '../utils/normalize.js';

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function fetchPageText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ApplyOS/1.0; +https://applyos.local)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!res.ok) throw new Error(`No se pudo acceder (${res.status})`);

    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, nav, footer, iframe, noscript').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    return text.slice(0, 14000);
  } finally {
    clearTimeout(timeout);
  }
}

const JOB_SCHEMA = `{
  "company_name": "string",
  "role_title": "string",
  "job_url": "string",
  "company_website": "string",
  "location": "string",
  "remote_type": "remote|hybrid|onsite|unknown",
  "salary_range": "string",
  "tech_stack": ["string"],
  "company_stage": "string — Pre-seed, Seed, Serie A, etc.",
  "description": "string — resumen del rol",
  "match_score": "number 0-100 — qué tan bien encaja con el perfil del candidato",
  "notes": "string — insight breve para el candidato",
  "analysis": {
    "technical_match": "string",
    "startup_fit": "string",
    "seniority_match": "string",
    "remote_fit": "string",
    "red_flags": "string",
    "why_apply": "string",
    "what_to_emphasize": "string",
    "what_to_study": "string"
  }
}`;

export async function parseJobFromContent({ url, pageText, profile }) {
  const openai = getOpenAI();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Extrae una oferta de trabajo de startup desde el texto de una página web.
Devuelve JSON con esta estructura:
${JOB_SCHEMA}

Reglas:
- job_url debe ser: ${url}
- Si falta info, usa "" o [] o "unknown".
- match_score: compara con el perfil del candidato si está disponible.
- analysis: análisis honesto para decidir si aplicar.
- Solo JSON válido.`,
      },
      {
        role: 'user',
        content: `URL: ${url}\n\nPerfil candidato:\n${JSON.stringify(profile || {}, null, 2)}\n\nContenido página:\n${pageText}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('IA no devolvió datos');

  const parsed = JSON.parse(raw);
  return normalizeJob(parsed, url);
}

function normalizeJob(data, url) {
  return {
    company_name: data.company_name || 'Sin nombre',
    role_title: data.role_title || 'Rol sin título',
    job_url: url,
    company_website: data.company_website || '',
    location: data.location || '',
    remote_type: normalizeRemoteType(data.remote_type),
    salary_range: data.salary_range || '',
    tech_stack: Array.isArray(data.tech_stack) ? data.tech_stack : [],
    company_stage: data.company_stage || '',
    description: data.description || '',
    status: 'discovered',
    match_score: Math.min(100, Math.max(0, parseInt(data.match_score, 10) || 0)),
    notes: data.notes || '',
    analysis: data.analysis || null,
  };
}

export async function importJobFromUrl(url, { description } = {}) {
  let pageText = description?.trim() || '';

  if (!pageText) {
    try {
      pageText = await fetchPageText(url);
    } catch (err) {
      throw new Error(
        `No se pudo leer la página (${err.message}). Pega la descripción del trabajo manualmente.`
      );
    }
  }

  if (pageText.length < 80) {
    throw new Error('Contenido insuficiente. Pega la descripción del trabajo.');
  }

  const store = getStore();
  const profile = await store.getProfile();
  const jobData = await parseJobFromContent({ url, pageText, profile });

  return { preview: jobData, pageTextLength: pageText.length };
}

export async function saveImportedJob(jobData) {
  const store = getStore();
  return store.createJob({
    ...jobData,
    remote_type: normalizeRemoteType(jobData?.remote_type),
  });
}
