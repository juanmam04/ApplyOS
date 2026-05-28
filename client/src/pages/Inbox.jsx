import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  CheckCircle, X, RefreshCw, Sparkles, ThumbsUp, ThumbsDown,
  Building2, MapPin, DollarSign, ExternalLink, Zap, ChevronDown, ChevronUp, Send, Save,
} from 'lucide-react';
import { api } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import MatchScore from '../components/ui/MatchScore';
import StartupBrief from '../components/opportunities/StartupBrief';
import ApplicationDraftPanel from '../components/applications/ApplicationDraftPanel';

function ScoreRing({ label, score, color }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{score}%</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function OpportunityCard({ opp, onApply, onConfirm, onDismiss, onResearch, onRegenerateDraft, applying, confirming, researching, regenerating, applyConfigured }) {
  const [expanded, setExpanded] = useState(true);
  const draft = opp.application_draft;
  const startupBrief = opp.analysis?.startup_brief;

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
          {opp.remote_type === 'remote' && (
            <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded font-medium">Remoto</span>
          )}
          {opp.tech_stack?.map(t => (
            <span key={t} className="px-1.5 py-0.5 bg-surface-overlay rounded">{t}</span>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5">
        {startupBrief ? (
          <StartupBrief brief={startupBrief} companyWebsite={opp.company_website} />
        ) : (
          <div className="rounded-xl border border-dashed border-surface-border p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">Sin explicación de la startup todavía.</p>
            <button
              type="button"
              onClick={() => onResearch(opp.id)}
              disabled={researching === opp.id}
              className="btn-secondary text-xs py-1.5"
            >
              <Sparkles className={`w-3.5 h-3.5 ${researching === opp.id ? 'animate-pulse' : ''}`} />
              {researching === opp.id ? 'Investigando...' : 'Investigar startup'}
            </button>
          </div>
        )}
      </div>

      <div className="p-5 pt-0 grid lg:grid-cols-2 gap-6 border-t border-surface-border/50">
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
          {expanded && (
            <>
              {!draft && onRegenerateDraft && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-gray-500">Sin borrador (IA no lo generó antes o falló la 2ª llamada).</p>
                  <button
                    type="button"
                    onClick={() => onRegenerateDraft(opp.id)}
                    disabled={regenerating === opp.id}
                    className="btn-secondary text-xs py-1.5"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${regenerating === opp.id ? 'animate-pulse' : ''}`} />
                    {regenerating === opp.id ? 'Generando…' : 'Generar borrador (IA)'}
                  </button>
                </div>
              )}
              <ApplicationDraftPanel
                draft={draft}
                companyName={opp.company_name}
                roleTitle={opp.role_title}
                compact
              />
            </>
          )}
        </div>
      </div>

      {opp.apply_status === 'failed' && opp.apply_error && (
        <div className="px-5 pb-2">
          <p className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2">{opp.apply_error}</p>
        </div>
      )}

      <div className="p-5 border-t border-surface-border flex flex-wrap gap-3 bg-surface-overlay/30">
        <button
          onClick={() => onApply(opp.id)}
          disabled={applying === opp.id}
          className="btn-primary flex-1 min-w-[200px] py-3 text-base"
        >
          <Send className="w-5 h-5" />
          {applying === opp.id
            ? 'Aplicando (2-3 min)...'
            : applyConfigured
              ? 'Aplicar (auto)'
              : 'Aplicar en YC'}
        </button>
        <button
          onClick={() => onConfirm(opp.id)}
          disabled={confirming === opp.id}
          className="btn-secondary"
          title="Solo guardar en tu tracker sin enviar"
        >
          <Save className="w-4 h-4" />
          {confirming === opp.id ? '...' : 'Marcar como aplicada'}
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
  const [loadError, setLoadError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [applying, setApplying] = useState(null);
  const [researching, setResearching] = useState(null);
  const [regenerating, setRegenerating] = useState(null);
  const [applyConfigured, setApplyConfigured] = useState(false);
  const [remotePolicy, setRemotePolicy] = useState(null);
  const [hiddenRemoteCount, setHiddenRemoteCount] = useState(0);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    setLoadError(null);
    api.opportunities.list()
      .then(({ opportunities: opps, scanner: sc, remote_policy: rp, hidden_non_remote: hidden }) => {
        setOpportunities(opps || []);
        setScanner(sc);
        if (rp) setRemotePolicy(rp);
        setHiddenRemoteCount(hidden?.length || 0);
      })
      .catch(err => {
        setLoadError(err.message);
        setOpportunities([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    api.opportunities.applyStatus()
      .then(s => setApplyConfigured(s.configured))
      .catch(() => setApplyConfigured(false));
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleScan = async () => {
    setScanning(true);
    setToast({ message: 'Buscando ofertas en YC…', type: 'success' });
    try {
      const result = await api.opportunities.scan();
      if (result.skipped) {
        await api.opportunities.resetScan();
        const retry = await api.opportunities.scan();
        setToast({
          message: retry.created > 0
            ? `${retry.created} oportunidades encontradas (${retry.pending} en inbox)`
            : `Escaneadas ${retry.scanned} ofertas. ${retry.pending} en tu inbox.`,
          type: 'success',
        });
      } else {
        setToast({
          message: result.created > 0
            ? `${result.created} nuevas oportunidades (${result.pending} en inbox)`
            : `Revisadas ${result.scanned} ofertas. Ya tienes ${result.pending} en inbox.`,
          type: 'success',
        });
      }
      load();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const handleApply = async (id) => {
    setApplying(id);
    setToast({
      message: applyConfigured
        ? 'Abriendo Chrome y aplicando (puede tardar 1–3 min)…'
        : 'Abriendo el formulario en YC…',
      type: 'success',
    });
    try {
      const result = await api.opportunities.apply(id, applyConfigured ? undefined : 'manual');

      if (result.manual && result.apply_url) {
        window.open(result.apply_url, '_blank', 'noopener,noreferrer');
        setToast({
          message: result.message || 'Formulario abierto en YC. Cuando termines, pulsa «Marcar como aplicada».',
          type: 'success',
        });
        load();
        return;
      }

      const { job, applyResult } = result;
      setToast({
        message: applyResult?.message || `¡Aplicación enviada a ${job.company_name}!`,
        type: 'success',
      });
      load();
      setTimeout(() => navigate(`/jobs/${job.id}`), 1200);
    } catch (err) {
      const msg = err.name === 'AbortError'
        ? 'Tardó demasiado. Revisa si Chrome quedó abierto completando WaaS, o usa «Aplicar en YC».'
        : err.message;
      setToast({ message: msg, type: 'error' });
    } finally {
      setApplying(null);
    }
  };

  const handleConfirm = async (id) => {
    setConfirming(id);
    try {
      const { job } = await api.opportunities.confirm(id);
      setToast({ message: 'Guardado en tu tracker (sin enviar a la startup)', type: 'success' });
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

  const handleRegenerateDraft = async (id) => {
    setRegenerating(id);
    try {
      const updated = await api.opportunities.regenerateDraft(id);
      setOpportunities(prev => prev.map(o => (o.id === id ? updated : o)));
      setToast({ message: 'Borrador de aplicación listo', type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setRegenerating(null);
    }
  };

  const handleResearch = async (id) => {
    setResearching(id);
    try {
      const updated = await api.opportunities.research(id);
      setOpportunities(prev => prev.map(o => (o.id === id ? updated : o)));
      setToast({ message: 'Explicación de la startup lista', type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setResearching(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (loadError) {
    return (
      <div>
        <PageHeader title="Inbox" subtitle="Error al conectar con el servidor" />
        <div className="card p-8 text-center">
          <p className="text-red-400 text-sm mb-4">{loadError}</p>
          <p className="text-gray-500 text-sm mb-4">¿Está corriendo el servidor? Ejecuta <code className="text-accent-light">npm run dev</code></p>
          <button onClick={() => { setLoading(true); load(); }} className="btn-primary">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <PageHeader
        title="Inbox"
        subtitle="ApplyOS busca, prepara y aplica por ti en Work at a Startup (YC)."
        action={
          <button onClick={handleScan} className="btn-secondary" disabled={scanning || scanner?.is_scanning}>
            <RefreshCw className={`w-4 h-4 ${scanning || scanner?.is_scanning ? 'animate-spin' : ''}`} />
            {scanning || scanner?.is_scanning ? 'Buscando...' : 'Buscar ahora'}
          </button>
        }
      />

      {remotePolicy?.remote_only && (
        <div className="card p-4 mb-4 border-emerald-500/25 bg-emerald-500/5">
          <p className="text-sm text-emerald-200/90">
            Filtro activo: <strong>solo remoto</strong> desde Uruguay ({remotePolicy.candidate_country}).
            Se excluyen presencial, híbrido y &quot;Remote US only&quot;.
            {hiddenRemoteCount > 0 && (
              <> · <span className="text-gray-500">{hiddenRemoteCount} ofertas antiguas ocultas (no remotas).</span></>
            )}
          </p>
        </div>
      )}

      {!applyConfigured && (
        <div className="card p-4 mb-4 border-amber-500/30 bg-amber-500/5">
          <p className="text-sm text-amber-200/90">
            <strong>Auto-aplicar</strong> (scanner + botón) necesita sesión YC una sola vez:
            <code className="text-xs mx-1">npm run yc:login</code>
            (resuelve captcha en Chrome). CV activo en CV Manager.
            {' '}<Link to="/settings" className="text-accent-light underline">Ajustes</Link>.
          </p>
        </div>
      )}

      {applyConfigured && (
        <div className="card p-4 mb-4 border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm text-emerald-200/90">
            <strong>Auto-aplicar activo.</strong> El scanner aplica solo a ofertas remotas con buen match (cada ~15 min).
          </p>
        </div>
      )}

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
              onApply={handleApply}
              onConfirm={handleConfirm}
              onDismiss={handleDismiss}
              onResearch={handleResearch}
              onRegenerateDraft={handleRegenerateDraft}
              applying={applying}
              confirming={confirming}
              researching={researching}
              regenerating={regenerating}
              applyConfigured={applyConfigured}
            />
          ))}
        </div>
      )}
    </div>
  );
}
