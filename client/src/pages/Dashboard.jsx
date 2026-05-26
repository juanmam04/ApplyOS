import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Send, MessageSquare, XCircle, Star, ArrowRight, Plus, Rocket } from 'lucide-react';
import { api } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import WelcomeGuide from '../components/layout/WelcomeGuide';
import StatCard from '../components/ui/StatCard';
import JobCard from '../components/jobs/JobCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import MatchScore from '../components/ui/MatchScore';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.jobs.stats(), api.jobs.list()])
      .then(([s, j]) => { setStats(s); setJobs(j); setError(null); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Sin conexión al servidor" />
        <div className="card p-6 text-center text-sm text-red-400">{error}</div>
      </div>
    );
  }

  const bestMatches = [...jobs].sort((a, b) => b.match_score - a.match_score).slice(0, 3);
  const nextActions = jobs.filter(j =>
    ['saved', 'applied', 'interview'].includes(j.status)
  ).slice(0, 5);

  const actionLabels = {
    saved: 'Preparar aplicación',
    applied: 'Hacer seguimiento',
    interview: 'Preparar entrevista',
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Tu centro de operaciones para aplicaciones de startup"
        action={
          <div className="flex gap-2">
            <Link to="/inbox" className="btn-primary">
              <Rocket className="w-4 h-4" /> Inbox
            </Link>
            <Link to="/jobs" className="btn-primary">
              <Plus className="w-4 h-4" /> Nuevo trabajo
            </Link>
          </div>
        }
      />

      <WelcomeGuide />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Briefcase} label="Trabajos guardados" value={stats?.total || 0} accent />
        <StatCard icon={Send} label="Aplicaciones enviadas" value={stats?.applied || 0} />
        <StatCard icon={MessageSquare} label="Entrevistas" value={stats?.interviews || 0} />
        <StatCard icon={XCircle} label="Rechazos" value={stats?.rejected || 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" /> Mejores matches
            </h2>
            <Link to="/jobs?sort=match" className="text-xs text-accent-light hover:text-accent flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {bestMatches.length === 0 ? (
            <div className="card p-6 text-center text-sm text-gray-500">
              Añade trabajos con match score para ver los mejores aquí.
            </div>
          ) : (
            <div className="space-y-3">
              {bestMatches.map(job => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="card p-4 flex items-center justify-between hover:border-accent/30 transition-all">
                  <div>
                    <div className="font-medium text-gray-100">{job.role_title}</div>
                    <div className="text-sm text-gray-500">{job.company_name}</div>
                  </div>
                  <MatchScore score={job.match_score} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-accent-light" /> Próximas acciones
            </h2>
          </div>
          {nextActions.length === 0 ? (
            <div className="card p-6 text-center text-sm text-gray-500">
              No hay acciones pendientes. ¡Buen trabajo!
            </div>
          ) : (
            <div className="space-y-2">
              {nextActions.map(job => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="card p-4 flex items-center justify-between hover:border-accent/30 transition-all">
                  <div>
                    <div className="font-medium text-gray-100 text-sm">{job.company_name}</div>
                    <div className="text-xs text-gray-500">{actionLabels[job.status]}</div>
                  </div>
                  <StatusBadge status={job.status} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {jobs.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-semibold text-gray-200 mb-4">Actividad reciente</h2>
          <div className="space-y-3">
            {jobs.slice(0, 3).map(job => <JobCard key={job.id} job={job} />)}
          </div>
        </section>
      )}
    </div>
  );
}
