import { fetchYcJobsFeed } from './ycJobs.js';
import { enrichOpportunity } from './opportunityAI.js';
import { getStore } from '../db/store.js';

const ROLES = ['full-stack', 'backend', 'frontend'];
const MIN_SCORE = parseInt(process.env.MIN_OPPORTUNITY_SCORE || '45', 10);

export async function runOpportunityScan() {
  const store = getStore();

  const scanning = await store.getScannerState();
  if (scanning?.is_scanning) {
    return { skipped: true, reason: 'Scan ya en progreso' };
  }

  await store.setScannerState({ is_scanning: true });

  try {
    const profile = await store.getProfile();
    const existingUrls = await store.getKnownJobUrls();
    const known = new Set(existingUrls);

    let allRaw = [];
    for (const role of ROLES) {
      try {
        const jobs = await fetchYcJobsFeed(role);
        allRaw = allRaw.concat(jobs);
      } catch (err) {
        console.warn(`YC feed ${role}:`, err.message);
      }
    }

    const unique = [];
    const seen = new Set();
    for (const j of allRaw) {
      if (!j.job_url || seen.has(j.job_url) || known.has(j.job_url)) continue;
      seen.add(j.job_url);
      unique.push(j);
    }

    const created = [];
    const limit = parseInt(process.env.SCAN_BATCH_SIZE || '5', 10);

    for (const raw of unique.slice(0, limit)) {
      try {
        if (!process.env.OPENAI_API_KEY) {
          await store.createOpportunity({
            ...raw,
            startup_score: 0,
            role_score: 0,
            match_score: 0,
            pros: [],
            cons: [],
            analysis: null,
            application_draft: null,
            status: 'pending',
          });
          created.push(raw.job_url);
          continue;
        }

        const enriched = await enrichOpportunity(raw, profile);

        if (enriched.recommendation === 'skip' && enriched.match_score < MIN_SCORE) {
          await store.createOpportunity({
            ...raw,
            ...enriched,
            status: 'dismissed',
          });
          continue;
        }

        if (enriched.match_score < MIN_SCORE) continue;

        const opp = await store.createOpportunity({
          ...raw,
          startup_score: enriched.startup_score,
          role_score: enriched.role_score,
          match_score: enriched.match_score,
          pros: enriched.pros,
          cons: enriched.cons,
          analysis: enriched.analysis,
          application_draft: enriched.application_draft,
          status: 'pending',
        });
        created.push(opp);
      } catch (err) {
        console.warn('Enrich failed:', raw.job_url, err.message);
      }
    }

    await store.setScannerState({
      is_scanning: false,
      last_scan_at: new Date().toISOString(),
      last_scan_count: created.length,
    });

    return { scanned: unique.length, created: created.length, pending: (await store.listOpportunities('pending')).length };
  } catch (err) {
    await store.setScannerState({ is_scanning: false });
    throw err;
  }
}

export async function confirmOpportunity(id) {
  const store = getStore();
  const opp = await store.getOpportunity(id);
  if (!opp) throw new Error('Oportunidad no encontrada');
  if (opp.status === 'confirmed') return { opportunity: opp, job: await store.getJob(opp.job_id) };

  const job = await store.createJob({
    company_name: opp.company_name,
    role_title: opp.role_title,
    job_url: opp.job_url,
    company_website: opp.company_website,
    location: opp.location,
    remote_type: opp.remote_type,
    salary_range: opp.salary_range,
    tech_stack: opp.tech_stack,
    company_stage: opp.company_stage,
    description: opp.description,
    status: 'applied',
    match_score: opp.match_score,
    notes: `Confirmado desde inbox automático (${opp.source}). ${opp.analysis?.why_apply || ''}`,
    analysis: opp.analysis,
    application_draft: opp.application_draft,
  });

  const updated = await store.updateOpportunity(id, {
    status: 'confirmed',
    job_id: job.id,
  });

  return { opportunity: updated, job };
}
