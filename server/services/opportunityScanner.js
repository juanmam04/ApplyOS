import { fetchYcJobsFeed } from './ycJobs.js';
import { enrichOpportunity } from './opportunityAI.js';
import { getStore } from '../db/store.js';
import { submitApplication, isAutoApplyConfigured } from './autoApply/index.js';
import { fetchYcJobFullDetails } from './ycApplyMeta.js';
import { isRemoteEligible, getRemotePolicy } from './remotePolicy.js';

const ROLES = ['full-stack', 'backend', 'frontend'];
const MIN_SCORE = parseInt(process.env.MIN_OPPORTUNITY_SCORE || '45', 10);

const STALE_SCAN_MS = 10 * 60 * 1000; // 10 min

export async function runOpportunityScan() {
  const store = getStore();

  const scanning = await store.getScannerState();
  if (scanning?.is_scanning) {
    const started = scanning.scan_started_at ? new Date(scanning.scan_started_at).getTime() : 0;
    const stale = !started || Date.now() - started > STALE_SCAN_MS;
    if (!stale) {
      return { skipped: true, reason: 'Scan ya en progreso' };
    }
    console.warn('Scanner bloqueado — reiniciando...');
    await store.setScannerState({ is_scanning: false });
  }

  await store.setScannerState({ is_scanning: true, scan_started_at: new Date().toISOString() });

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
    let skippedNonRemote = 0;
    for (const j of allRaw) {
      if (!j.job_url || seen.has(j.job_url) || known.has(j.job_url)) continue;
      const remote = isRemoteEligible(j);
      if (!remote.eligible) {
        skippedNonRemote++;
        console.log(`Skip no-remoto (${remote.remote_type}):`, j.role_title, '—', remote.reason);
        continue;
      }
      seen.add(j.job_url);
      unique.push({ ...j, remote_type: remote.remote_type || j.remote_type });
    }

    const created = [];
    const limit = parseInt(process.env.SCAN_BATCH_SIZE || '5', 10);

    for (const raw of unique.slice(0, limit)) {
      try {
        const remoteCheck = isRemoteEligible(raw);
        if (!remoteCheck.eligible) {
          console.log('Skip pre-enrich:', remoteCheck.reason);
          continue;
        }

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

        if (enriched.match_score < MIN_SCORE) {
          console.log(`Skip score ${enriched.match_score} < ${MIN_SCORE}:`, raw.role_title);
          continue;
        }

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
        try {
          const fallback = await store.createOpportunity({
            ...raw,
            startup_score: 50,
            role_score: 50,
            match_score: 50,
            pros: ['Oferta detectada en Y Combinator'],
            cons: ['Análisis IA no disponible — revisar manualmente'],
            analysis: null,
            application_draft: null,
            status: 'pending',
            notes: `Importado sin IA: ${err.message}`,
          });
          created.push(fallback);
        } catch (e2) {
          console.warn('Fallback create failed:', e2.message);
        }
      }
    }

    await store.setScannerState({
      is_scanning: false,
      last_scan_at: new Date().toISOString(),
      last_scan_count: created.length,
    });

    const pending = await store.listOpportunitiesSafe('pending');
    return {
      scanned: unique.length,
      created: created.length,
      pending: pending.length,
      skipped_non_remote: skippedNonRemote,
      remote_policy: getRemotePolicy(),
    };
  } catch (err) {
    await store.setScannerState({ is_scanning: false });
    throw err;
  }
}

export async function refreshOpportunityFromJobPage(id) {
  const store = getStore();
  const opp = await store.getOpportunity(id);
  if (!opp?.job_url) throw new Error('Oportunidad sin URL');

  const details = await fetchYcJobFullDetails(opp.job_url, opp);
  const updated = await store.updateOpportunity(id, {
    apply_meta: details.apply_meta || opp.apply_meta,
    location: details.location || opp.location,
    remote_type: details.remote_type,
  });
  return { opportunity: updated, ...details };
}

export async function applyOpportunity(id, { mode } = {}) {
  const store = getStore();
  let opp = await store.getOpportunity(id);
  if (!opp) throw new Error('Oportunidad no encontrada');

  if (opp.status === 'confirmed') {
    return { opportunity: opp, job: await store.getJob(opp.job_id), alreadyApplied: true };
  }

  try {
    const refreshed = await refreshOpportunityFromJobPage(id);
    opp = refreshed.opportunity;

    if (!refreshed.remote_eligible) {
      throw new Error(refreshed.remote_reason || 'Esta oferta no es remota compatible con Uruguay');
    }

    const applyUrl = refreshed.apply_meta?.apply_url || opp.job_url;
    const manualOnly = mode === 'manual' || !isAutoApplyConfigured();

    if (manualOnly) {
      return {
        manual: true,
        apply_url: applyUrl,
        opportunity: opp,
        message: isAutoApplyConfigured()
          ? 'Aplicación manual'
          : 'Abre el formulario YC. Para auto-aplicar, añade YC_APPLY_EMAIL y YC_APPLY_PASSWORD en server/.env.local',
      };
    }

    await store.updateOpportunity(id, { apply_status: 'submitting', apply_error: '' });

    const applyMeta = refreshed.apply_meta;
    const result = await submitApplication({ ...opp, apply_meta: applyMeta });

    await store.updateOpportunity(id, {
      apply_meta: applyMeta || opp.apply_meta,
      apply_status: result.success ? 'submitted' : 'pending_review',
      apply_error: result.success ? '' : (result.message || ''),
      applied_at: new Date().toISOString(),
    });

    const confirmed = await confirmOpportunity(id, {
      applyNote: result.dryRun
        ? '[Dry run] '
        : `Aplicación automática vía ${applyMeta?.provider || 'waas'}. ${result.message || ''}`,
    });

    return { ...confirmed, applyResult: result };
  } catch (err) {
    await store.updateOpportunity(id, { apply_status: 'failed', apply_error: err.message });
    throw err;
  }
}

export async function confirmOpportunity(id, opts = {}) {
  const store = getStore();
  const opp = await store.getOpportunity(id);
  if (!opp) throw new Error('Oportunidad no encontrada');
  if (opp.status === 'confirmed') return { opportunity: opp, job: await store.getJob(opp.job_id) };

  const applyNote = opts.applyNote ? `${opts.applyNote} ` : '';

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
    notes: `${applyNote}Confirmado desde inbox (${opp.source}). ${opp.analysis?.why_apply || ''}`,
    analysis: opp.analysis,
    application_draft: opp.application_draft,
  });

  const updated = await store.updateOpportunity(id, {
    status: 'confirmed',
    job_id: job.id,
  });

  return { opportunity: updated, job };
}
