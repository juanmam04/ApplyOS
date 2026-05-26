import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, X, RefreshCw, Sparkles, ThumbsUp, ThumbsDown,
  Building2, MapPin, DollarSign, ExternalLink, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';
import { api } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import MatchScore from '../components/ui/MatchScore';

function ScoreRing({ label, score, color }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{score}%</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function ApplicationPreview({ draft }) {
  const [tab, setTab] = useState('shortMessage');
  if (!draft) return <p className="text-sm text-gray-500">Sin borrador generado</p>;

  const tabs = [
    { key: 'shortMessage', label: 'Corto' },
    { key: 'emailApplication', label: 'Email' },
    { key: 'linkedinDM', label: 'LinkedIn' },
    { key: 'founderMessage', label: 'Founder' },
    { key: 'coverLetter', label: 'Cover letter' },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2.5 py-1 rounded text-xs ${tab === t.key ? 'bg-accent/15 text-accent-light' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <pre className="text-xs text-gray-400 whitespace-pre-wrap font-sans leading-relaxed bg-surface-overlay rounded-lg p-3 max-h-40 overflow-y-auto">
        {draft[tab]}
      </pre>
    </div>
  );
}

function OpportunityCard({ opp, onConfirm, onDismiss, confirming }) {
  const [expanded, setExpanded] = useState(true);
  const draft = opp.application_draft;

  return (
    <article className="card border-accent/20 overflow-hidden">
      <div className="p-5 border-b border-surface-border bg-gradient-to-r from-accent/5 to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-1.5 py-0.5 bg-[#F26522]/20 text-[#F26522] text-[10px] font-bold rounded uppercase">
                {opp.source || 'startup'}
              </span>
              {opp.company_stage && (
                <span className="text-xs text-gray-500">{opp.company_stage}</span>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-100">{opp.role_title}</h2>
            <p className="text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3.5 h-3.5" /> {opp.company_name}
            </p>
          </div>
          <div className="flex gap-4">
            <ScoreRing label="Startup" score={opp.startup_score} color="text-violet-400" />
            <ScoreRing label="Rol" score={opp.role_score} color="text-blue-400" />
            <ScoreRing label="Match" score={opp.match_score} color="text-emerald-400" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
          {opp.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{opp.location}</span>}
          {opp.salary_range && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{opp.salary_range}</span>}
          {opp.tech_stack?.map(t => (
            <span key={t} className="px-1.5 py-0.5 bg-surface-overlay rounded">{t}</span>
          ))}
        </div>
      </div>

      <div className="p-5 grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium mb-2">
            <ThumbsUp className="w-4 h-4" /> Pros
          </div>
          <ul className="space-y-1.5 mb-4">
            {(opp.pros || []).map((p, i) => (
              <li key={i} className="text-sm text-gray-400 flex gap-2">
                <span className="text-emerald-500">+</span> {p}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1.5 text-amber-400 text-sm font-medium mb-2">
            <ThumbsDown className="w-4 h-4" /> Contras
          </div>
          <ul className="space-y-1.5">
            {(opp.cons || []).map((c, i) => (
              <li key={i} className="text-sm text-gray-400 flex gap-2">
                <span className="text-amber-500">−</span> {c}
              </li>
            ))}
          </ul>
        </div>

        <div>
          {opp.analysis?.why_apply && (
            <div className="mb-4 p-3 bg-surface-overlay rounded-lg">
              <div className="text-xs text-accent-light font-medium mb-1">Por qué aplicar</div>
              <p className="text-sm text-gray-400">{opp.analysis.why_apply}</p>
            </div>
          )}
          {opp.description && (
            <p className="text-sm text-gray-500 mb-4 line-clamp-3">{opp.description}</p>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 flex items-center gap-1 mb-2 hover:text-gray-300"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Borrador de aplicación (IA)
          </button>
          {expanded && <ApplicationPreview draft={draft} />}
        </div>
      </div>

      <div className="p-5 border-t border-surface-border flex flex-wrap gap-3 bg-surface-overlay/30">
        <button
          onClick={() => onConfirm(opp.id)}
          disabled={confirming === opp.id}
          className="btn-primary flex-1 min-w-[200px] py-3 text-base"
        >
          <CheckCircle className="w-5 h-5" />
          {confirming === opp.id ? 'Confirmando...' : 'Confirmar aplicación'}
        </button>
        <button onClick={() => onDismiss(opp.id)} className="btn-secondary">
          <X className="w-4 h-4" /> Descartar
        </button>
        <a href={opp.job_url} target="_blank" rel="noreferrer" className="btn-ghost">
          <ExternalLink className="w-4 h-4" /> Ver oferta
        </a>
      </div>
    </article>
  );
}

export default function Inbox() {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [scanner, setScanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    api.opportunities.list()
      .then(({ opportunities: opps, scanner: sc }) => {
        setOpportunities(opps);
        setScanner(sc);
      })
      .catch(err => setToast({ message: err.message, type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const result = await api.opportunities.scan();
      setToast({
        message: result.skipped
          ? 'Escaneo en progreso...'
          : `${result.created} nuevas oportunidades encontradas`,
        type: 'success',
      });
      load();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const handleConfirm = async (id) => {
    setConfirming(id);
    try {
      const { job } = await api.opportunities.confirm(id);
      setToast({ message: '¡Aplicación confirmada y guardada!', type: 'success' });
      load();
      setTimeout(() => navigate(`/jobs/${job.id}`), 1000);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setConfirming(null);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await api.opportunities.dismiss(id);
      setOpportunities(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <PageHeader
        title="Inbox"
        subtitle="ApplyOS busca startups, analiza fit y prepara tu aplicación. Solo confirmas."
        action={
          <button onClick={handleScan} className="btn-secondary" disabled={scanning || scanner?.is_scanning}>
            <RefreshCw className={`w-4 h-4 ${scanning || scanner?.is_scanning ? 'animate-spin' : ''}`} />
            {scanning || scanner?.is_scanning ? 'Buscando...' : 'Buscar ahora'}
          </button>
        }
      />

      <div className="card p-4 mb-6 flex flex-wrap items-center gap-4 border-accent/15">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Zap className="w-4 h-4 text-accent-light" />
          <span>
            Scanner automático activo
            {scanner?.last_scan_at && (
              <> · último scan {new Date(scanner.last_scan_at).toLocaleString('es-ES')}</>
            )}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Pendientes: </span>
          <span className="text-accent-light font-semibold">{opportunities.length}</span>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <div className="card p-12 text-center">
          <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-200 mb-2">Buscando oportunidades...</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            El sistema escanea Y Combinator Jobs cada 15 minutos. Asegúrate de tener tu perfil y CV listos para mejores scores.
          </p>
          <button onClick={handleScan} className="btn-primary" disabled={scanning}>
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            Buscar ahora
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {opportunities.map(opp => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              onConfirm={handleConfirm}
              onDismiss={handleDismiss}
              confirming={confirming}
            />
          ))}
        </div>
      )}
    </div>
  );
}
