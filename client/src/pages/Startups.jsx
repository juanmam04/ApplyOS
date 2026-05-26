import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ExternalLink, Link2, Sparkles, Rocket, Search,
  ChevronRight, Plus,
} from 'lucide-react';
import { api } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import MatchScore from '../components/ui/MatchScore';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

export default function Startups() {
  const navigate = useNavigate();
  const [sources, setSources] = useState([]);
  const [discovered, setDiscovered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('');
  const [ycJobs, setYcJobs] = useState([]);
  const [ycLoading, setYcLoading] = useState(false);
  const [ycRole, setYcRole] = useState('full-stack');
  const [ycImportingId, setYcImportingId] = useState(null);

  const loadYcFeed = async (role = ycRole) => {
    setYcLoading(true);
    try {
      const { jobs } = await api.startups.ycFeed(role);
      setYcJobs(jobs);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setYcLoading(false);
    }
  };

  const load = () => {
    Promise.all([api.startups.sources(), api.startups.discovered()])
      .then(([s, d]) => { setSources(s); setDiscovered(d); })
      .catch(err => setToast({ message: err.message, type: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    loadYcFeed('full-stack');
  }, []);

  const handleYcImport = async (job) => {
    setYcImportingId(job.job_url);
    try {
      const { preview: p } = await api.startups.ycImport(job);
      setPreview(p);
      setToast({ message: 'Análisis IA listo — revisa y guarda', type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setYcImportingId(null);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setImporting(true);
    setPreview(null);
    try {
      const result = await api.startups.import(url.trim(), description.trim());
      setPreview(result.preview);
      setToast({ message: 'Oferta analizada con IA', type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const job = await api.startups.saveImport(preview);
      setPreview(null);
      setUrl('');
      setDescription('');
      load();
      setToast({ message: 'Guardado en Job Tracker', type: 'success' });
      setTimeout(() => navigate(`/jobs/${job.id}`), 800);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredSources = sources.filter(s =>
    !filter || s.name.toLowerCase().includes(filter.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()))
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <PageHeader
        title="Startups"
        subtitle="Explora portales de startups e importa ofertas directo al tracker con IA"
      />

      {/* Y Combinator Jobs */}
      <section className="card p-6 mb-8 border-[#F26522]/30 bg-gradient-to-br from-[#F26522]/10 to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-[#F26522] text-white text-[10px] font-bold rounded">YC</span>
              <h2 className="font-semibold text-gray-100">Y Combinator Jobs</h2>
            </div>
            <p className="text-sm text-gray-500 max-w-xl">
              Ofertas en vivo desde{' '}
              <a href="https://www.ycombinator.com/jobs" target="_blank" rel="noreferrer" className="text-[#F26522] hover:underline">
                ycombinator.com/jobs
              </a>
              . Importa con un clic + análisis IA según tu perfil.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              className="input-field py-2 text-sm w-auto"
              value={ycRole}
              onChange={e => { setYcRole(e.target.value); loadYcFeed(e.target.value); }}
            >
              <option value="full-stack">Full stack</option>
              <option value="backend">Backend</option>
              <option value="frontend">Frontend</option>
            </select>
            <button onClick={() => loadYcFeed()} className="btn-secondary text-sm" disabled={ycLoading}>
              {ycLoading ? 'Cargando...' : 'Actualizar'}
            </button>
            <a
              href="https://www.ycombinator.com/jobs"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-sm border border-surface-border"
            >
              <ExternalLink className="w-4 h-4" /> Abrir YC
            </a>
          </div>
        </div>

        {ycLoading && ycJobs.length === 0 ? (
          <LoadingSpinner className="py-8" />
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {ycJobs.map(job => (
              <div
                key={job.job_url}
                className="flex items-center justify-between gap-4 p-4 bg-surface-overlay/60 rounded-lg border border-surface-border hover:border-[#F26522]/30 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-100 text-sm truncate">{job.role_title}</div>
                  <div className="text-xs text-gray-500">
                    {job.company_name}
                    {job.company_stage && <span className="text-[#F26522]"> · {job.company_stage}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-gray-600">
                    {job.salary_range && <span>{job.salary_range}</span>}
                    {job.location && <span>· {job.location}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a href={job.job_url} target="_blank" rel="noreferrer" className="btn-ghost p-2" title="Ver en YC">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleYcImport(job)}
                    className="btn-primary text-xs py-2"
                    disabled={ycImportingId === job.job_url}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {ycImportingId === job.job_url ? 'IA...' : 'Importar'}
                  </button>
                </div>
              </div>
            ))}
            {ycJobs.length === 0 && !ycLoading && (
              <p className="text-sm text-gray-500 text-center py-6">No se encontraron ofertas. Pulsa Actualizar.</p>
            )}
          </div>
        )}
      </section>

      {/* Importar desde URL */}
      <section className="card p-6 mb-8 border-accent/20 bg-gradient-to-br from-accent/8 to-transparent">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-accent-light" />
          <h2 className="font-semibold text-gray-100">Importar oferta desde URL</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Copia el link de Wellfound, YC, LinkedIn, etc. La IA extrae empresa, rol, stack y análisis automático.
        </p>
        <form onSubmit={handleImport} className="space-y-3">
          <input
            className="input-field"
            type="url"
            placeholder="https://www.ycombinator.com/companies/.../jobs/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <textarea
            className="input-field min-h-[80px] resize-y text-sm"
            placeholder="Opcional: pega aquí la descripción si la URL no se puede leer..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={importing || !url.trim()}>
            <Sparkles className={`w-4 h-4 ${importing ? 'animate-pulse' : ''}`} />
            {importing ? 'Analizando con IA...' : 'Analizar e importar'}
          </button>
        </form>
      </section>

      {/* Portales */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
            <Rocket className="w-4 h-4 text-accent-light" />
            Portales de startups
          </h2>
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              className="input-field pl-9 py-2 text-sm"
              placeholder="Filtrar..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredSources.map(source => (
            <a
              key={source.id}
              href={source.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`card p-4 hover:border-accent/30 transition-all group ${source.featured ? 'ring-1 ring-[#F26522]/40' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: source.color }}
                >
                  {source.name.slice(0, 2).toUpperCase()}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-accent-light transition-colors" />
              </div>
              <h3 className="font-medium text-gray-100 text-sm mb-0.5">{source.name}</h3>
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{source.tagline}</p>
              <div className="flex flex-wrap gap-1">
                {source.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 bg-surface-overlay rounded text-[10px] text-gray-500">
                    {tag}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Abre un portal → encuentra un rol → copia la URL → pégala arriba para importar.
        </p>
      </section>

      {/* Descubiertos */}
      {discovered.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-200">
              Descubiertos recientemente ({discovered.length})
            </h2>
            <Link to="/jobs?status=discovered" className="text-xs text-accent-light hover:text-accent flex items-center gap-1">
              Ver en tracker <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {discovered.slice(0, 5).map(job => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="card p-4 flex items-center justify-between hover:border-accent/30 transition-all"
              >
                <div>
                  <div className="font-medium text-gray-100 text-sm">{job.role_title}</div>
                  <div className="text-xs text-gray-500">{job.company_name}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={job.status} />
                  <MatchScore score={job.match_score} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Modal preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Vista previa — importar trabajo" wide>
        {preview && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">{preview.role_title}</h3>
                <p className="text-gray-400">{preview.company_name}</p>
              </div>
              <MatchScore score={preview.match_score} size="lg" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {preview.location && (
                <div><span className="text-gray-500">Ubicación:</span> <span className="text-gray-300">{preview.location}</span></div>
              )}
              {preview.remote_type !== 'unknown' && (
                <div><span className="text-gray-500">Modalidad:</span> <span className="text-gray-300">{preview.remote_type}</span></div>
              )}
              {preview.salary_range && (
                <div><span className="text-gray-500">Salario:</span> <span className="text-gray-300">{preview.salary_range}</span></div>
              )}
              {preview.company_stage && (
                <div><span className="text-gray-500">Etapa:</span> <span className="text-gray-300">{preview.company_stage}</span></div>
              )}
            </div>

            {preview.tech_stack?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {preview.tech_stack.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-accent/10 text-accent-light rounded text-xs">{t}</span>
                ))}
              </div>
            )}

            {preview.description && (
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">{preview.description}</p>
            )}

            {preview.analysis?.why_apply && (
              <div className="bg-surface-overlay rounded-lg p-3">
                <div className="text-xs text-emerald-400 font-medium mb-1">Por qué aplicar</div>
                <p className="text-sm text-gray-400">{preview.analysis.why_apply}</p>
              </div>
            )}

            {preview.notes && (
              <p className="text-xs text-gray-500 italic">{preview.notes}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
                <Plus className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar en Job Tracker'}
              </button>
              <button onClick={() => setPreview(null)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
