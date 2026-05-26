import { getSupabase } from './supabase.js';
import { normalizeRemoteType } from '../utils/normalize.js';

const PROFILE_JSON = ['skills', 'work_experience', 'projects', 'preferred_roles', 'preferred_countries'];
const JOB_JSON = ['tech_stack', 'analysis', 'application_draft'];
const OPP_JSON = ['tech_stack', 'pros', 'cons', 'analysis', 'application_draft', 'apply_meta'];
const PREP_JSON = ['technical_questions', 'product_questions', 'project_questions', 'servo_questions', 'questions_to_ask'];

function parseRow(row, jsonFields) {
  if (!row) return null;
  const parsed = { ...row };
  for (const field of jsonFields) {
    if (parsed[field] === null || parsed[field] === undefined) {
      parsed[field] = field === 'analysis' ? null : [];
    }
  }
  return parsed;
}

function mapCv(row) {
  if (!row) return null;
  return { ...row, file_path: row.storage_path };
}

export const supabaseStore = {
  mode: 'supabase',

  async getProfile() {
    const { data, error } = await getSupabase()
      .from('profile')
      .select('*')
      .eq('id', 1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return parseRow(data, PROFILE_JSON) || {
      id: 1,
      full_name: '', email: '', phone: '', location: '',
      linkedin: '', github: '', portfolio: '', current_title: '',
      summary: '', skills: [], work_experience: [], projects: [],
      preferred_roles: [], preferred_countries: [],
      salary_expectations: '', work_preferences: '',
    };
  },

  async updateProfile(data) {
    const row = {
      id: 1,
      full_name: data.full_name || '',
      email: data.email || '',
      phone: data.phone || '',
      location: data.location || '',
      linkedin: data.linkedin || '',
      github: data.github || '',
      portfolio: data.portfolio || '',
      current_title: data.current_title || '',
      summary: data.summary || '',
      skills: data.skills || [],
      work_experience: data.work_experience || [],
      projects: data.projects || [],
      preferred_roles: data.preferred_roles || [],
      preferred_countries: data.preferred_countries || [],
      salary_expectations: data.salary_expectations || '',
      work_preferences: data.work_preferences || '',
      updated_at: new Date().toISOString(),
    };

    const { error } = await getSupabase().from('profile').upsert(row);
    if (error) throw error;
    return this.getProfile();
  },

  async listCv() {
    const { data, error } = await getSupabase()
      .from('cv_versions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapCv);
  },

  async createCv(entry) {
    const { data, error } = await getSupabase()
      .from('cv_versions')
      .insert({
        filename: entry.filename,
        original_name: entry.original_name,
        storage_path: entry.storage_path,
        extracted_text: entry.extracted_text || '',
        is_active: entry.is_active || false,
      })
      .select()
      .single();
    if (error) throw error;
    return mapCv(data);
  },

  async getCv(id) {
    const { data, error } = await getSupabase()
      .from('cv_versions')
      .select('*')
      .eq('id', id)
      .single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return mapCv(data);
  },

  async getActiveCv() {
    const { data, error } = await getSupabase()
      .from('cv_versions')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return mapCv(data);

    const { data: latest, error: err2 } = await getSupabase()
      .from('cv_versions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (err2) throw err2;
    return mapCv(latest);
  },

  async updateCvText(id, text) {
    const { error } = await getSupabase()
      .from('cv_versions')
      .update({ extracted_text: text })
      .eq('id', id);
    if (error) throw error;
  },

  async activateCv(id) {
    const { data: all } = await getSupabase().from('cv_versions').select('id');
    if (all?.length) {
      await getSupabase()
        .from('cv_versions')
        .update({ is_active: false })
        .in('id', all.map(c => c.id));
    }
    const { error } = await getSupabase()
      .from('cv_versions')
      .update({ is_active: true })
      .eq('id', id);
    if (error) throw error;
    return this.getCv(id);
  },

  async deleteCv(id) {
    const { error } = await getSupabase().from('cv_versions').delete().eq('id', id);
    if (error) throw error;

    const { data: remaining } = await getSupabase()
      .from('cv_versions')
      .select('id, is_active')
      .order('created_at', { ascending: false });

    if (remaining?.length && !remaining.some(c => c.is_active)) {
      await getSupabase()
        .from('cv_versions')
        .update({ is_active: true })
        .eq('id', remaining[0].id);
    }
    return true;
  },

  async countCv() {
    const { count, error } = await getSupabase()
      .from('cv_versions')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  },

  async listJobs({ status, sort } = {}) {
    let query = getSupabase().from('jobs').select('*');
    if (status) query = query.eq('status', status);
    query = sort === 'match'
      ? query.order('match_score', { ascending: false }).order('updated_at', { ascending: false })
      : query.order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(r => parseRow(r, JOB_JSON));
  },

  async getJobStats() {
    const { data, error } = await getSupabase().from('jobs').select('status');
    if (error) throw error;
    const jobs = data || [];
    return {
      total: jobs.length,
      saved: jobs.filter(j => j.status === 'saved').length,
      applied: jobs.filter(j => j.status === 'applied').length,
      interviews: jobs.filter(j => j.status === 'interview').length,
      rejected: jobs.filter(j => j.status === 'rejected').length,
      offers: jobs.filter(j => j.status === 'offer').length,
    };
  },

  async getJob(id) {
    const { data, error } = await getSupabase()
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return parseRow(data, JOB_JSON);
  },

  async createJob(data) {
    const { data: row, error } = await getSupabase()
      .from('jobs')
      .insert({
        company_name: data.company_name,
        role_title: data.role_title,
        job_url: data.job_url || '',
        company_website: data.company_website || '',
        location: data.location || '',
        remote_type: normalizeRemoteType(data.remote_type),
        salary_range: data.salary_range || '',
        tech_stack: data.tech_stack || [],
        company_stage: data.company_stage || '',
        description: data.description || '',
        status: data.status || 'discovered',
        match_score: data.match_score || 0,
        notes: data.notes || '',
        analysis: data.analysis || null,
        application_draft: data.application_draft || null,
      })
      .select()
      .single();
    if (error) throw error;
    return parseRow(row, JOB_JSON);
  },

  async updateJob(id, data) {
    const updates = {
      company_name: data.company_name,
      role_title: data.role_title,
      job_url: data.job_url || '',
      company_website: data.company_website || '',
      location: data.location || '',
      remote_type: normalizeRemoteType(data.remote_type),
      salary_range: data.salary_range || '',
      tech_stack: data.tech_stack || [],
      company_stage: data.company_stage || '',
      description: data.description || '',
      status: data.status || 'discovered',
      match_score: data.match_score || 0,
      notes: data.notes || '',
    };
    if (data.analysis !== undefined) updates.analysis = data.analysis;
    if (data.application_draft !== undefined) updates.application_draft = data.application_draft;

    const { error } = await getSupabase().from('jobs').update(updates).eq('id', id);
    if (error) throw error;
    return this.getJob(id);
  },

  async deleteJob(id) {
    const { error } = await getSupabase().from('jobs').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getInterviewPrep(jobId) {
    const { data, error } = await getSupabase()
      .from('interview_prep')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();
    if (error) throw error;
    return data ? parseRow(data, PREP_JSON) : null;
  },

  async upsertInterviewPrep(jobId, data) {
    const row = {
      job_id: parseInt(jobId, 10),
      technical_questions: data.technical_questions || [],
      product_questions: data.product_questions || [],
      project_questions: data.project_questions || [],
      servo_questions: data.servo_questions || [],
      questions_to_ask: data.questions_to_ask || [],
      notes: data.notes || '',
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await getSupabase()
      .from('interview_prep')
      .upsert(row, { onConflict: 'job_id' })
      .select()
      .single();
    if (error) throw error;
    return parseRow(result, PREP_JSON);
  },

  async getKnownJobUrls() {
    const [jobs, opps] = await Promise.all([
      getSupabase().from('jobs').select('job_url'),
      getSupabase().from('opportunities').select('job_url'),
    ]);
    const urls = [];
    for (const r of jobs.data || []) if (r.job_url) urls.push(r.job_url);
    for (const r of opps.data || []) if (r.job_url) urls.push(r.job_url);
    return urls;
  },

  async listOpportunities(status = 'pending') {
    let query = getSupabase().from('opportunities').select('*').order('match_score', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(r => parseRow(r, OPP_JSON));
  },

  async getOpportunity(id) {
    const { data, error } = await getSupabase().from('opportunities').select('*').eq('id', id).single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return parseRow(data, OPP_JSON);
  },

  async createOpportunity(data) {
    const { data: row, error } = await getSupabase()
      .from('opportunities')
      .insert({
        source: data.source || 'ycombinator',
        job_url: data.job_url,
        company_name: data.company_name,
        role_title: data.role_title,
        company_website: data.company_website || '',
        location: data.location || '',
        remote_type: normalizeRemoteType(data.remote_type),
        salary_range: data.salary_range || '',
        tech_stack: data.tech_stack || [],
        company_stage: data.company_stage || '',
        description: data.description || '',
        startup_score: data.startup_score || 0,
        role_score: data.role_score || 0,
        match_score: data.match_score || 0,
        pros: data.pros || [],
        cons: data.cons || [],
        analysis: data.analysis || null,
        application_draft: data.application_draft || null,
        apply_meta: data.apply_meta || null,
        apply_status: data.apply_status || '',
        apply_error: data.apply_error || '',
        applied_at: data.applied_at || null,
        status: data.status || 'pending',
      })
      .select()
      .single();
    if (error) throw error;
    return parseRow(row, OPP_JSON);
  },

  async updateOpportunity(id, data) {
    const updates = { ...data, updated_at: new Date().toISOString() };
    const { error } = await getSupabase().from('opportunities').update(updates).eq('id', id);
    if (error) throw error;
    return this.getOpportunity(id);
  },

  async getScannerState() {
    try {
      const { data, error } = await getSupabase().from('scanner_state').select('*').eq('id', 1).single();
      if (error?.code === 'PGRST116') return { id: 1, is_scanning: false, last_scan_at: null, last_scan_count: 0 };
      if (error) return { id: 1, is_scanning: false, last_scan_at: null, last_scan_count: 0 };
      return data;
    } catch {
      return { id: 1, is_scanning: false, last_scan_at: null, last_scan_count: 0 };
    }
  },

  async setScannerState(patch) {
    try {
      const { error } = await getSupabase()
        .from('scanner_state')
        .upsert({ id: 1, ...patch }, { onConflict: 'id' });
      if (error) console.warn('scanner_state:', error.message);
    } catch (err) {
      console.warn('scanner_state:', err.message);
    }
  },

  async listOpportunitiesSafe(status = 'pending') {
    try {
      return await this.listOpportunities(status);
    } catch (err) {
      if (err.message?.includes('opportunities')) return [];
      throw err;
    }
  },
};
