import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Database, Sparkles } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';

export default function Settings() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'error', storage: 'unknown' }));
  }, []);

  return (
    <div>
      <PageHeader title="Ajustes" subtitle="Configuración y estado del sistema" />

      <div className="space-y-4 max-w-lg">
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
          {health?.storage && (
            <p className="text-xs text-gray-500 mt-2">
              Base de datos: <span className="text-gray-400">Supabase</span>
            </p>
          )}
          {health?.ai && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent-light" />
              OpenAI activo
            </p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-200 mb-3">Configurar Supabase</h3>
          <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
            <li>Crea un proyecto en <a href="https://supabase.com" className="text-accent-light hover:underline" target="_blank" rel="noreferrer">supabase.com</a></li>
            <li>SQL Editor → pega y ejecuta <code className="text-accent-light">supabase/schema.sql</code></li>
            <li>Settings → API → copia URL y <code className="text-accent-light">service_role</code> key</li>
            <li>Pégalos en <code className="text-accent-light">server/.env.local</code></li>
          </ol>
          <pre className="mt-4 text-xs bg-surface-overlay rounded-lg p-3 text-gray-400 font-mono">
{`SUPABASE_URL=https://jcprzfqrgeavbovbwkra.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  ← Settings → API → service_role
DATABASE_URL=postgresql://postgres.jcprzfqrgeavbovbwkra:...@aws-1-us-east-1.pooler.supabase.com:5432/postgres`}
          </pre>
        </div>
      </div>
    </div>
  );
}
