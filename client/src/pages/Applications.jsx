import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Send } from 'lucide-react';
import ApplicationDraftPanel from '../components/applications/ApplicationDraftPanel';
import { api } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

export default function Applications() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(searchParams.get('job') || '');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
            <div className="card p-5">
              <ApplicationDraftPanel
                draft={content}
                companyName={selected?.company_name}
                roleTitle={selected?.role_title}
              />
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
