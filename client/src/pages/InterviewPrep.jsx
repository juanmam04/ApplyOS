import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Save, Plus, X, MessageSquare } from 'lucide-react';
import { api } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

const SECTIONS = [
  { key: 'technical_questions', label: 'Preguntas técnicas', color: 'text-blue-400' },
  { key: 'product_questions', label: 'Preguntas de producto', color: 'text-violet-400' },
  { key: 'project_questions', label: 'Preguntas sobre proyectos', color: 'text-emerald-400' },
  { key: 'servo_questions', label: 'Preguntas sobre Servo', color: 'text-amber-400' },
  { key: 'questions_to_ask', label: 'Preguntas para la empresa', color: 'text-pink-400' },
];

function QuestionList({ items, onChange }) {
  const [newQ, setNewQ] = useState('');

  const add = () => {
    if (newQ.trim()) {
      onChange([...items, newQ.trim()]);
      setNewQ('');
    }
  };

  return (
    <div className="space-y-2">
      {items.map((q, i) => (
        <div key={i} className="flex items-start gap-2 group">
          <span className="text-gray-600 text-sm mt-2.5 flex-shrink-0">{i + 1}.</span>
          <p className="flex-1 text-sm text-gray-300 bg-surface-overlay rounded-lg px-3 py-2">{q}</p>
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="btn-ghost p-1 opacity-0 group-hover:opacity-100 text-red-400"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input
          className="input-field flex-1 text-sm"
          value={newQ}
          onChange={e => setNewQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Añadir pregunta..."
        />
        <button onClick={add} className="btn-secondary px-3">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function InterviewPrep() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(searchParams.get('job') || '');
  const [prep, setPrep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.jobs.list({ status: 'applied' })
      .then(async applied => {
        const all = await api.jobs.list();
        const relevant = all.filter(j => ['applied', 'interview', 'offer'].includes(j.status));
        setJobs(relevant.length > 0 ? relevant : all);
        const paramJob = searchParams.get('job');
        if (paramJob) setSelectedJob(paramJob);
        else if (relevant.length > 0) setSelectedJob(String(relevant[0].id));
        else if (all.length > 0) setSelectedJob(String(all[0].id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    api.interview.get(selectedJob).then(setPrep).catch(console.error);
  }, [selectedJob]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const generated = await api.generate.interviewPrep(selectedJob);
      setPrep(prev => ({ ...prev, ...generated }));
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await api.interview.update(selectedJob, prep);
      setPrep(saved);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (key, value) => setPrep(prev => ({ ...prev, [key]: value }));

  const selected = jobs.find(j => String(j.id) === String(selectedJob));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Interview Prep"
        subtitle="Prepara tus entrevistas con preguntas personalizadas y notas"
        action={
          <div className="flex gap-2">
            <button onClick={handleGenerate} className="btn-secondary" disabled={generating || !selectedJob}>
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generando...' : 'Auto-generar'}
            </button>
            <button onClick={handleSave} className="btn-primary" disabled={saving || !prep}>
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Sin trabajos para preparar"
          description="Añade trabajos con estado 'aplicado' o 'entrevista' para preparar entrevistas."
        />
      ) : (
        <>
          <div className="card p-4 mb-6">
            <label className="label">Trabajo</label>
            <select className="input-field" value={selectedJob} onChange={e => setSelectedJob(e.target.value)}>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.company_name} — {j.role_title}</option>
              ))}
            </select>
            {selected && (
              <p className="helper-text">Preparando entrevista para {selected.role_title} @ {selected.company_name}</p>
            )}
          </div>

          {prep && (
            <div className="space-y-6">
              {SECTIONS.map(({ key, label, color }) => (
                <section key={key} className="card p-5">
                  <h3 className={`text-sm font-semibold mb-4 ${color}`}>{label}</h3>
                  <QuestionList
                    items={prep[key] || []}
                    onChange={v => updateSection(key, v)}
                  />
                </section>
              ))}

              <section className="card p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Notas de preparación</h3>
                <textarea
                  className="input-field min-h-[120px] resize-y"
                  value={prep.notes || ''}
                  onChange={e => setPrep(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas, puntos clave, cosas a recordar..."
                />
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
