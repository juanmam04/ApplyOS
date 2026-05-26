import { Link } from 'react-router-dom';
import { ExternalLink, ChevronRight } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import MatchScore from '../ui/MatchScore';
import { formatDate } from '../../utils/constants';

export default function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job.id}`} className="card p-5 hover:border-accent/30 transition-all duration-200 group block">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-100 truncate">{job.role_title}</h3>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm text-gray-400 mb-2">{job.company_name}</p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {job.location && <span>{job.location}</span>}
            {job.remote_type !== 'unknown' && <span>· {job.remote_type}</span>}
            {job.company_stage && <span>· {job.company_stage}</span>}
          </div>
          {job.tech_stack?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.tech_stack.slice(0, 4).map(t => (
                <span key={t} className="px-2 py-0.5 bg-surface-overlay rounded text-xs text-gray-400">{t}</span>
              ))}
              {job.tech_stack.length > 4 && (
                <span className="px-2 py-0.5 text-xs text-gray-500">+{job.tech_stack.length - 4}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <MatchScore score={job.match_score} />
          <span className="text-xs text-gray-600">{formatDate(job.updated_at)}</span>
          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-accent-light transition-colors" />
        </div>
      </div>
      {job.job_url && (
        <a
          href={job.job_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-accent-light hover:text-accent mt-3"
        >
          <ExternalLink className="w-3 h-3" /> Ver oferta
        </a>
      )}
    </Link>
  );
}
