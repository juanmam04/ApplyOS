import { useState } from 'react';
import TagInput from '../ui/TagInput';
import { EMPTY_JOB, JOB_STATUSES, REMOTE_TYPES, COMPANY_STAGES } from '../../utils/constants';

export default function JobForm({ initial = EMPTY_JOB, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ ...EMPTY_JOB, ...initial });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Empresa *</label>
          <input className="input-field" value={form.company_name} onChange={e => set('company_name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Rol *</label>
          <input className="input-field" value={form.role_title} onChange={e => set('role_title', e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">URL del trabajo</label>
          <input className="input-field" type="url" value={form.job_url} onChange={e => set('job_url', e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="label">Web de la empresa</label>
          <input className="input-field" type="url" value={form.company_website} onChange={e => set('company_website', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Ubicación</label>
          <input className="input-field" value={form.location} onChange={e => set('location', e.target.value)} />
        </div>
        <div>
          <label className="label">Modalidad</label>
          <select className="input-field" value={form.remote_type} onChange={e => set('remote_type', e.target.value)}>
            {REMOTE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Etapa</label>
          <select className="input-field" value={form.company_stage} onChange={e => set('company_stage', e.target.value)}>
            <option value="">Seleccionar...</option>
            {COMPANY_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Rango salarial</label>
          <input className="input-field" value={form.salary_range} onChange={e => set('salary_range', e.target.value)} placeholder="ej. $80k–$120k" />
        </div>
        <div>
          <label className="label">Match score (0–100)</label>
          <input className="input-field" type="number" min="0" max="100" value={form.match_score} onChange={e => set('match_score', parseInt(e.target.value) || 0)} />
        </div>
      </div>

      <div>
        <label className="label">Tech stack</label>
        <TagInput value={form.tech_stack} onChange={v => set('tech_stack', v)} placeholder="React, Node.js..." />
      </div>

      <div>
        <label className="label">Estado</label>
        <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
          {JOB_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Descripción</label>
        <textarea className="input-field min-h-[100px] resize-y" value={form.description} onChange={e => set('description', e.target.value)} />
      </div>

      <div>
        <label className="label">Notas</label>
        <textarea className="input-field min-h-[60px] resize-y" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>}
      </div>
    </form>
  );
}
