import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import { downloadCvPdf } from '../db/cvStorage.js';

let client = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada. Añádela en server/.env.local');
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

const PROFILE_SCHEMA = `{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string",
  "github": "string",
  "portfolio": "string",
  "current_title": "string",
  "summary": "string — párrafo profesional de 2-4 líneas",
  "skills": ["string"],
  "work_experience": [{"company": "string", "title": "string", "start": "string", "end": "string", "description": "string"}],
  "projects": [{"name": "string", "url": "string", "description": "string"}],
  "preferred_roles": ["string — inferir del CV si es posible"],
  "preferred_countries": ["string"],
  "salary_expectations": "string — vacío si no aparece",
  "work_preferences": "string — remoto, startup, etc. inferido del CV"
}`;

export async function extractProfileFromCvText(cvText) {
  if (!cvText || cvText.trim().length < 50) {
    throw new Error('El CV no tiene suficiente texto. Sube un PDF con texto seleccionable (no escaneado).');
  }

  const openai = getClient();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Eres un experto en RRHH tech. Extrae información del CV y devuélvela como JSON válido con exactamente esta estructura:
${PROFILE_SCHEMA}

Reglas:
- Solo usa información que aparezca en el CV. No inventes datos.
- skills: todas las tecnologías y herramientas mencionadas.
- work_experience: orden cronológico inverso (más reciente primero).
- Si un campo no existe en el CV, usa string vacío "" o array vacío [].
- Responde SOLO con el JSON, sin markdown.`,
      },
      {
        role: 'user',
        content: `Extrae el perfil profesional de este CV:\n\n${cvText.slice(0, 12000)}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('OpenAI no devolvió respuesta');

  const parsed = JSON.parse(raw);
  return normalizeProfile(parsed);
}

export async function getCvText(cv) {
  if (cv.extracted_text && cv.extracted_text.trim().length > 50) {
    return cv.extracted_text;
  }
  const path = cv.storage_path || cv.file_path;
  if (path) {
    try {
      const buffer = await downloadCvPdf(path);
      const pdf = await pdfParse(buffer);
      return pdf.text || '';
    } catch {
      return '';
    }
  }
  return '';
}

function normalizeProfile(data) {
  return {
    full_name: data.full_name || '',
    email: data.email || '',
    phone: data.phone || '',
    location: data.location || '',
    linkedin: data.linkedin || '',
    github: data.github || '',
    portfolio: data.portfolio || '',
    current_title: data.current_title || '',
    summary: data.summary || '',
    skills: Array.isArray(data.skills) ? data.skills : [],
    work_experience: Array.isArray(data.work_experience) ? data.work_experience : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    preferred_roles: Array.isArray(data.preferred_roles) ? data.preferred_roles : [],
    preferred_countries: Array.isArray(data.preferred_countries) ? data.preferred_countries : [],
    salary_expectations: data.salary_expectations || '',
    work_preferences: data.work_preferences || '',
  };
}

const APPLICATION_ENGLISH_RULES = `CRITICAL: Write ALL application text in English only (US English).
These messages go directly to startups (YC, US/international). Never use Spanish.
Tone: professional, warm, concise, confident — typical startup hiring communication.
No placeholders like [Company] — use real company and role names from the job data.`;

export async function generateApplicationContent({ profile, job }) {
  const openai = getClient();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${APPLICATION_ENGLISH_RULES}

Return JSON with keys: shortMessage, emailApplication, linkedinDM, founderMessage, coverLetter.
- shortMessage: 2-4 sentences for application forms
- emailApplication: full email with Subject line first, then body
- linkedinDM: short LinkedIn message (<300 chars)
- founderMessage: direct note to founder/CEO tone
- coverLetter: full cover letter`,
      },
      {
        role: 'user',
        content: `Perfil:\n${JSON.stringify(profile, null, 2)}\n\nTrabajo:\n${JSON.stringify(job, null, 2)}`,
      },
    ],
  });

  return JSON.parse(response.choices[0]?.message?.content || '{}');
}

export async function generateInterviewPrepContent({ profile, job }) {
  const openai = getClient();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Genera preparación de entrevista personalizada en español.
Devuelve JSON con: technical_questions, product_questions, project_questions, servo_questions (si aplica Servo en el perfil), questions_to_ask.
Cada campo es un array de 5-7 preguntas específicas para el rol y empresa.`,
      },
      {
        role: 'user',
        content: `Perfil:\n${JSON.stringify(profile, null, 2)}\n\nTrabajo:\n${JSON.stringify(job, null, 2)}`,
      },
    ],
  });

  return JSON.parse(response.choices[0]?.message?.content || '{}');
}
