import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { api } from '../api/client';
import { JOB_STATUSES } from '../utils/constants';
import PageHeader from '../components/layout/PageHeader';
import JobCard from '../components/jobs/JobCard';
import JobForm from '../components/jobs/JobForm';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

export default function Jobs() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  const load = () => {
    const params = {};
    if (searchParams.get('sort') === 'match') params.sort = 'match';
    if (statusFilter) params.status = statusFilter;
    api.jobs.list(params)
      .then(setJobs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setStatusFilter(searchParams.get('status') || '');
  }, [searchParams]);

  useEffect(() => { load(); }, [searchParams, statusFilter]);

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await api.jobs.create(data);
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = jobs.filter(j => {
    const matchSearch = !search ||
      j.company_name.toLowerCase().includes(search.toLowerCase()) ||
      j.role_title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Job Tracker"
        subtitle="Gestiona todas tus oportunidades de startup"
        action={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo trabajo
          </button>
        }
      />

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input-field pl-10"
            placeholder="Buscar por empresa o rol..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select
            className="input-field pl-10 pr-8 appearance-none min-w-[160px]"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">Todos los estados</option>
            {JOB_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Plus}
          title={jobs.length === 0 ? 'Sin trabajos aún' : 'Sin resultados'}
          description={jobs.length === 0 ? 'Añade tu primera oportunidad para empezar a trackear.' : 'Prueba con otros filtros de búsqueda.'}
          action={jobs.length === 0 && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Añadir trabajo
            </button>
          )}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(job => <JobCard key={job.id} job={job} />)}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo trabajo">
        <JobForm onSubmit={handleCreate} onCancel={() => setShowModal(false)} loading={saving} />
      </Modal>
    </div>
  );
}
