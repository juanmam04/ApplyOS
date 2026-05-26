import OpenAI from 'openai';
import { generateApplicationContent } from './ai.js';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function enrichOpportunity(job, profile) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Eres un career advisor para ingenieros que buscan roles en startups YC/early-stage.
Evalúa la oportunidad vs el perfil del candidato y devuelve JSON:

{
  "startup_score": 0-100,
  "role_score": 0-100,
  "match_score": 0-100,
  "pros": ["máx 5 bullets concretos"],
  "cons": ["máx 5 bullets honestos"],
  "analysis": {
    "technical_match": "string",
    "startup_fit": "string",
    "seniority_match": "string",
    "remote_fit": "string",
    "red_flags": "string",
    "why_apply": "string",
    "what_to_emphasize": "string",
    "what_to_study": "string"
  },
  "recommendation": "apply|skip",
  "summary": "1-2 frases decisión"
}

Sé exigente pero justo. match_score = media ponderada startup+rol+fit.`,
      },
      {
        role: 'user',
        content: `Perfil:\n${JSON.stringify(profile, null, 2)}\n\nOportunidad:\n${JSON.stringify(job, null, 2)}`,
      },
    ],
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');

  let application_draft = null;
  if (process.env.OPENAI_API_KEY && parsed.recommendation !== 'skip') {
    try {
      application_draft = await generateApplicationContent({
        profile,
        job: {
          company_name: job.company_name,
          role_title: job.role_title,
          tech_stack: job.tech_stack,
          description: job.description,
          location: job.location,
          company_stage: job.company_stage,
        },
      });
    } catch (err) {
      console.warn('Application draft failed:', err.message);
    }
  }

  return {
    startup_score: clamp(parsed.startup_score),
    role_score: clamp(parsed.role_score),
    match_score: clamp(parsed.match_score),
    pros: Array.isArray(parsed.pros) ? parsed.pros : [],
    cons: Array.isArray(parsed.cons) ? parsed.cons : [],
    analysis: parsed.analysis || {},
    application_draft,
    recommendation: parsed.recommendation || 'apply',
    summary: parsed.summary || '',
  };
}

function clamp(n) {
  return Math.min(100, Math.max(0, parseInt(n, 10) || 0));
}
