import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, ExternalLink, BarChart2, Send, MessageSquare } from 'lucide-react';
import { api } from '../api/client';
import { EMPTY_ANALYSIS } from '../utils/constants';
import PageHeader from '../components/layout/PageHeader';
import JobForm from '../components/jobs/JobForm';
import StatusBadge from '../components/ui/StatusBadge';
import MatchScore from '../components/ui/MatchScore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const analysisFields = [
  { key: 'technical_match', label: 'Match técnico', placeholder: '¿Qué tan bien encajan tus skills con el stack?' },
  { key: 'startup_fit', label: 'Startup fit', placeholder: '¿Encaja con el tipo de startup y etapa?' },
  { key: 'seniority_match', label: 'Seniority match', placeholder: '¿El nivel del rol coincide con tu experiencia?' },
  { key: 'remote_fit', label: 'Remote fit', placeholder: '¿La modalidad remota encaja con tus preferencias?' },
  { key: 'red_flags', label: 'Red flags', placeholder: 'Señales de alerta que detectaste...' },
  { key: 'why_apply', label: 'Por qué aplicar', placeholder: 'Razones convincentes para postular...' },
  { key: 'what_to_emphasize', label: 'Qué enfatizar', placeholder: 'Puntos clave para destacar en la aplicación...' },
  { key: 'what_to_study', label: 'Qué estudiar', placeholder: 'Temas a repasar antes de la entrevista...' },
];

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [analysis, setAnalysis] = useState(EMPTY_ANALYSIS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('details');

  useEffect(() => {
    api.jobs.get(id)
      .then(j => {
        setJob(j);
        if (j.analysis) setAnalysis({ ...EMPTY_ANALYSIS, ...j.analysis });
      })
      .catch(() => navigate('/jobs'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      const updated = await api.jobs.update(id, data);
      setJob(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAnalysis = async () => {
    setSaving(true);
    try {
      const updated = await api.jobs.update(id, { ...job, analysis });
      setJob(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este trabajo?')) return;
    await api.jobs.delete(id);
    navigate('/jobs');
  };

  if (loading) return <LoadingSpinner />;
  if (!job) return null;

  const tabs = [
    { id: 'details', label: 'Detalles' },
    { id: 'analysis', label: 'Análisis', icon: BarChart2 },
    { id: 'actions', label: 'Acciones' },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver a trabajos
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-100">{job.role_title}</h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-gray-400">{job.company_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <MatchScore score={job.match_score} size="lg" />
            <button onClick={handleDelete} className="btn-ghost text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-surface-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === t.id
                ? 'border-accent text-accent-light'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="card p-6">
          <JobForm initial={job} onSubmit={handleUpdate} loading={saving} />
        </div>
      )}

      {tab === 'analysis' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Completa el análisis manualmente. En el futuro, la IA generará esto automáticamente.
          </p>
          {analysisFields.map(({ key, label, placeholder }) => (
            <div key={key} className="card p-4">
              <label className="label">{label}</label>
              <textarea
                className="input-field min-h-[80px] resize-y"
                value={analysis[key] || ''}
                onChange={e => setAnalysis(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
              />
            </div>
          ))}
          <button onClick={handleSaveAnalysis} className="btn-primary" disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar análisis'}
          </button>
        </div>
      )}

      {tab === 'actions' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Link to={`/applications?job=${job.id}`} className="card p-5 hover:border-accent/30 transition-all group">
            <Send className="w-6 h-6 text-accent-light mb-3" />
            <h3 className="font-semibold text-gray-100 mb-1">Generar aplicación</h3>
            <p className="text-sm text-gray-500">Crea mensajes, emails y cover letter personalizados.</p>
          </Link>
          <Link to={`/interview-prep?job=${job.id}`} className="card p-5 hover:border-accent/30 transition-all group">
            <MessageSquare className="w-6 h-6 text-accent-light mb-3" />
            <h3 className="font-semibold text-gray-100 mb-1">Preparar entrevista</h3>
            <p className="text-sm text-gray-500">Preguntas técnicas, de producto y notas de prep.</p>
          </Link>
          {job.job_url && (
            <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="card p-5 hover:border-accent/30 transition-all">
              <ExternalLink className="w-6 h-6 text-gray-400 mb-3" />
              <h3 className="font-semibold text-gray-100 mb-1">Ver oferta original</h3>
              <p className="text-sm text-gray-500 truncate">{job.job_url}</p>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
