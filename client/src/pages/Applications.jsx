import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy, Check, RefreshCw, Send } from 'lucide-react';
import { api } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

const CONTENT_TYPES = [
  { key: 'shortMessage', label: 'Mensaje corto', desc: 'Para formularios o chat rápido' },
  { key: 'emailApplication', label: 'Email de aplicación', desc: 'Email formal completo' },
  { key: 'linkedinDM', label: 'LinkedIn DM', desc: 'Mensaje directo en LinkedIn' },
  { key: 'founderMessage', label: 'Mensaje al founder', desc: 'Tono directo y personal' },
  { key: 'coverLetter', label: 'Cover letter', desc: 'Carta de presentación completa' },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="btn-ghost text-xs">
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

export default function Applications() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(searchParams.get('job') || '');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeType, setActiveType] = useState('shortMessage');

  useEffect(() => {
    api.jobs.list()
      .then(j => {
        setJobs(j);
        const paramJob = searchParams.get('job');
        if (paramJob) {
          setSelectedJob(paramJob);
          const job = j.find(x => String(x.id) === paramJob);
          if (job?.application_draft) setContent(job.application_draft);
        } else if (j.length > 0) {
          setSelectedJob(String(j[0].id));
          if (j[0].application_draft) setContent(j[0].application_draft);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!selectedJob) return;
    setGenerating(true);
    try {
      const result = await api.generate.application(selectedJob);
      setContent(result);
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const selected = jobs.find(j => String(j.id) === String(selectedJob));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Application Generator"
        subtitle="Genera mensajes personalizados basados en tu perfil y el trabajo seleccionado"
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Sin trabajos"
          description="Añade trabajos primero para generar aplicaciones."
        />
      ) : (
        <>
          <div className="card p-5 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="label">Seleccionar trabajo</label>
                <select
                  className="input-field"
                  value={selectedJob}
                  onChange={e => {
                    const id = e.target.value;
                    setSelectedJob(id);
                    const j = jobs.find(x => String(x.id) === id);
                    setContent(j?.application_draft || null);
                  }}
                >
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.company_name} — {j.role_title}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleGenerate} className="btn-primary" disabled={generating || !selectedJob}>
                <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generando...' : 'Generar contenido'}
              </button>
            </div>
            {selected && (
              <p className="helper-text mt-2">
                Generando para <strong className="text-gray-400">{selected.role_title}</strong> en <strong className="text-gray-400">{selected.company_name}</strong>.
                El contenido se basa en tu perfil maestro.
              </p>
            )}
          </div>

          {content ? (
            <div className="grid lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                {CONTENT_TYPES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveType(t.key)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                      activeType === t.key
                        ? 'bg-accent/15 text-accent-light border border-accent/20'
                        : 'text-gray-400 hover:bg-surface-overlay hover:text-gray-200'
                    }`}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
              <div className="lg:col-span-3 card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-200">
                    {CONTENT_TYPES.find(t => t.key === activeType)?.label}
                  </h3>
                  <CopyButton text={content[activeType]} />
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {content[activeType]}
                </pre>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-sm text-gray-500">
              Selecciona un trabajo y pulsa "Generar contenido" para crear tus mensajes de aplicación.
            </div>
          )}
        </>
      )}
    </div>
  );
}
