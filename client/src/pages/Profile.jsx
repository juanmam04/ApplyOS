import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { EMPTY_PROFILE } from '../utils/constants';
import PageHeader from '../components/layout/PageHeader';
import TagInput from '../components/ui/TagInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';

function ExperienceItem({ item, onChange, onRemove }) {
  return (
    <div className="card p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input className="input-field" placeholder="Empresa" value={item.company || ''} onChange={e => onChange({ ...item, company: e.target.value })} />
        <input className="input-field" placeholder="Cargo" value={item.title || ''} onChange={e => onChange({ ...item, title: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input className="input-field" placeholder="Desde" value={item.start || ''} onChange={e => onChange({ ...item, start: e.target.value })} />
        <input className="input-field" placeholder="Hasta" value={item.end || ''} onChange={e => onChange({ ...item, end: e.target.value })} />
      </div>
      <textarea className="input-field min-h-[60px]" placeholder="Descripción" value={item.description || ''} onChange={e => onChange({ ...item, description: e.target.value })} />
      <button type="button" onClick={onRemove} className="btn-ghost text-red-400 text-xs">
        <Trash2 className="w-3 h-3" /> Eliminar
      </button>
    </div>
  );
}

function ProjectItem({ item, onChange, onRemove }) {
  return (
    <div className="card p-4 space-y-3">
      <input className="input-field" placeholder="Nombre del proyecto" value={item.name || ''} onChange={e => onChange({ ...item, name: e.target.value })} />
      <input className="input-field" placeholder="URL" value={item.url || ''} onChange={e => onChange({ ...item, url: e.target.value })} />
      <textarea className="input-field min-h-[60px]" placeholder="Descripción" value={item.description || ''} onChange={e => onChange({ ...item, description: e.target.value })} />
      <button type="button" onClick={onRemove} className="btn-ghost text-red-400 text-xs">
        <Trash2 className="w-3 h-3" /> Eliminar
      </button>
    </div>
  );
}

export default function Profile() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.profile.get()
      .then(data => setProfile({ ...EMPTY_PROFILE, ...data }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const set = (field, value) => setProfile(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.profile.update(profile);
      setProfile({ ...EMPTY_PROFILE, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleFromCv = async () => {
    setGenerating(true);
    try {
      const { profile: generated } = await api.profile.fromCv();
      setProfile({ ...EMPTY_PROFILE, ...generated });
      setToast({ message: 'Perfil generado desde tu CV con IA', type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader
        title="Perfil maestro"
        subtitle="Se rellena automáticamente al subir tu CV, o pulsa el botón para regenerarlo con IA"
        action={
          <div className="flex gap-2">
            <button onClick={handleFromCv} className="btn-secondary" disabled={generating || saving}>
              <Sparkles className="w-4 h-4" />
              {generating ? 'Analizando CV...' : 'Desde CV'}
            </button>
            <button onClick={handleSave} className="btn-primary" disabled={saving || generating}>
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar'}
            </button>
          </div>
        }
      />

      <div className="space-y-8">
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Información personal</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre completo</label>
              <input className="input-field" value={profile.full_name} onChange={e => set('full_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Título actual</label>
              <input className="input-field" value={profile.current_title} onChange={e => set('current_title', e.target.value)} placeholder="Fullstack Engineer" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input-field" type="email" value={profile.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="input-field" value={profile.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="label">Ubicación</label>
              <input className="input-field" value={profile.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div>
              <label className="label">Expectativa salarial</label>
              <input className="input-field" value={profile.salary_expectations} onChange={e => set('salary_expectations', e.target.value)} placeholder="$80k–$120k USD" />
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Enlaces</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">LinkedIn</label>
              <input className="input-field" value={profile.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <label className="label">GitHub</label>
              <input className="input-field" value={profile.github} onChange={e => set('github', e.target.value)} />
            </div>
            <div>
              <label className="label">Portfolio</label>
              <input className="input-field" value={profile.portfolio} onChange={e => set('portfolio', e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Resumen profesional</h2>
          <textarea
            className="input-field min-h-[120px] resize-y"
            value={profile.summary}
            onChange={e => set('summary', e.target.value)}
            placeholder="Describe tu experiencia, fortalezas y lo que buscas..."
          />
        </section>

        <section className="card p-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Habilidades</h2>
          <TagInput value={profile.skills} onChange={v => set('skills', v)} placeholder="React, TypeScript, Node.js..." />
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Experiencia laboral</h2>
            <button
              type="button"
              onClick={() => set('work_experience', [...profile.work_experience, { company: '', title: '', start: '', end: '', description: '' }])}
              className="btn-secondary text-xs py-1.5"
            >
              <Plus className="w-3 h-3" /> Añadir
            </button>
          </div>
          <div className="space-y-3">
            {profile.work_experience.map((exp, i) => (
              <ExperienceItem
                key={i}
                item={exp}
                onChange={updated => {
                  const arr = [...profile.work_experience];
                  arr[i] = updated;
                  set('work_experience', arr);
                }}
                onRemove={() => set('work_experience', profile.work_experience.filter((_, j) => j !== i))}
              />
            ))}
            {profile.work_experience.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Sin experiencia añadida</p>
            )}
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Proyectos</h2>
            <button
              type="button"
              onClick={() => set('projects', [...profile.projects, { name: '', url: '', description: '' }])}
              className="btn-secondary text-xs py-1.5"
            >
              <Plus className="w-3 h-3" /> Añadir
            </button>
          </div>
          <div className="space-y-3">
            {profile.projects.map((proj, i) => (
              <ProjectItem
                key={i}
                item={proj}
                onChange={updated => {
                  const arr = [...profile.projects];
                  arr[i] = updated;
                  set('projects', arr);
                }}
                onRemove={() => set('projects', profile.projects.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Preferencias</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Roles preferidos</label>
              <TagInput value={profile.preferred_roles} onChange={v => set('preferred_roles', v)} placeholder="Fullstack, Backend, Founding Engineer..." />
            </div>
            <div>
              <label className="label">Países / zonas horarias</label>
              <TagInput value={profile.preferred_countries} onChange={v => set('preferred_countries', v)} placeholder="España, Remoto EU, LATAM..." />
            </div>
            <div>
              <label className="label">Preferencias de trabajo</label>
              <textarea
                className="input-field min-h-[80px] resize-y"
                value={profile.work_preferences}
                onChange={e => set('work_preferences', e.target.value)}
                placeholder="Remoto, startup early-stage, equity, horario flexible..."
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
