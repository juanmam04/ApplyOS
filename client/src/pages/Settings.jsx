import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Database, Sparkles, Send, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { apiUrl } from '../api/config';
import PageHeader from '../components/layout/PageHeader';
import Toast from '../components/ui/Toast';

export default function Settings() {
  const [health, setHealth] = useState(null);
  const [apply, setApply] = useState(null);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch(apiUrl('/health'))
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'error', storage: 'unknown' }));

    api.settings.apply()
      .then(setApply)
      .catch(() => setApply({ configured: false }));
  }, []);

  const handleTestLogin = async () => {
    setTesting(true);
    try {
      const result = await api.settings.testApplyLogin();
      setToast({
        message: result.ok ? 'Login YC correcto' : 'Login falló — revisa credenciales',
        type: result.ok ? 'success' : 'error',
      });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Ajustes" subtitle="Estado del sistema y auto-aplicación" />

      <div className="max-w-lg space-y-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-200">Estado del servidor</h3>
          </div>
          <div className="flex items-center gap-2">
            {health?.status === 'ok' ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">Conectado</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">Sin conexión</span>
              </>
            )}
          </div>
          {health?.ai && (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent-light" /> OpenAI activo
            </p>
          )}
        </div>

        <div className="card p-5 border-emerald-500/20">
          <h3 className="font-semibold text-gray-200 mb-2">Solo remoto (Uruguay)</h3>
          <p className="text-sm text-gray-500 mb-3">
            Por defecto solo entran ofertas 100% remotas válidas desde Uruguay. En <code className="text-xs text-accent-light">server/.env.local</code>:
          </p>
          <pre className="text-xs bg-surface-overlay rounded-lg p-3 text-gray-400 mb-2">{`REMOTE_ONLY=true
REMOTE_STRICT=true
REJECT_US_ONLY_REMOTE=true
CANDIDATE_COUNTRY=UY`}</pre>
        </div>

        <div className="card p-5 border-accent/20">
          <div className="flex items-center gap-3 mb-3">
            <Send className="w-5 h-5 text-accent-light" />
            <h3 className="font-semibold text-gray-200">Auto-aplicar (YC / Work at a Startup)</h3>
          </div>

          {apply?.configured ? (
            <div className="flex items-center gap-2 text-sm text-emerald-400 mb-3">
              <CheckCircle className="w-4 h-4" />
              Listo para auto-aplicar {apply.username && `(${apply.username})`}
            </div>
          ) : (
            <div className="space-y-1 text-sm text-amber-400 mb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                {!apply?.has_credentials && 'Faltan credenciales en .env.local'}
                {apply?.has_credentials && !apply?.has_session && 'Falta sesión — ejecuta npm run yc:login'}
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Añade en <code className="text-accent-light text-xs">server/.env.local</code>:
          </p>
          <pre className="text-xs bg-surface-overlay rounded-lg p-3 text-gray-400 mb-4 overflow-x-auto">
{`YC_APPLY_USERNAME=juanmamartinez
YC_APPLY_PASSWORD=tu_password

# Una vez (evita captcha):
# npm run yc:login`}
          </pre>
          <p className="text-xs text-gray-600 mb-4">
            Usa la misma cuenta de account.ycombinator.com / workatastartup.com.
            Tu username <code className="text-accent-light">juanmamartinez</code> está bien.
            YC bloquea login automático con <strong>captcha</strong> — una vez ejecuta{' '}
            <code className="text-xs">npm run yc:login</code> en la raíz del proyecto (carpeta ApplyOS).
            La primera vez ejecuta: <code className="text-gray-500">npm run playwright:install</code> (en la carpeta ApplyOS)
          </p>

          <button
            type="button"
            onClick={handleTestLogin}
            disabled={!apply?.configured || testing}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Probando login...' : 'Probar login YC'}
          </button>

          {apply?.auto_apply && apply?.configured && (
            <p className="text-xs text-emerald-400 mt-3">
              AUTO_APPLY=true — el scanner envía aplicaciones sin pulsar el botón
            </p>
          )}
          {apply?.dryRun && (
            <p className="text-xs text-amber-400 mt-3">Modo dry-run activo — no envía aplicaciones reales</p>
          )}
        </div>
      </div>
    </div>
  );
}
