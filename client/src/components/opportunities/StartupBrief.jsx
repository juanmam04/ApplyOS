import { Lightbulb, Users, Coins, Target, Code2, Building2, ExternalLink } from 'lucide-react';

const CONFIDENCE_LABEL = {
  high: 'Info verificada (YC)',
  medium: 'Info razonable',
  low: 'Poca info pública',
};

export default function StartupBrief({ brief, companyWebsite }) {
  if (!brief) return null;

  const sections = [
    { key: 'what_they_do', label: 'Qué hacen', icon: Building2, text: brief.what_they_do },
    { key: 'who_its_for', label: 'Para quién', icon: Users, text: brief.who_its_for },
    { key: 'how_they_make_money', label: 'Cómo ganan dinero', icon: Coins, text: brief.how_they_make_money },
    { key: 'why_it_matters', label: 'Por qué importa', icon: Target, text: brief.why_it_matters },
    { key: 'as_engineer', label: 'Tu rol como dev', icon: Code2, text: brief.as_engineer },
  ].filter(s => s.text);

  return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-violet-400 shrink-0" />
          <h3 className="text-sm font-semibold text-violet-200">Qué hace esta startup</h3>
        </div>
        {brief.confidence && (
          <span className="text-[10px] uppercase tracking-wide text-gray-500">
            {CONFIDENCE_LABEL[brief.confidence] || brief.confidence}
          </span>
        )}
      </div>

      {brief.headline && (
        <p className="text-base font-medium text-gray-100 mb-3 leading-snug">{brief.headline}</p>
      )}

      {brief.analogy && (
        <p className="text-sm text-violet-300/90 italic mb-3 border-l-2 border-violet-500/40 pl-3">
          {brief.analogy}
        </p>
      )}

      <div className="space-y-3">
        {sections.map(({ key, label, icon: Icon, text }) => (
          <div key={key}>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-0.5">
              <Icon className="w-3 h-3" /> {label}
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      {brief.team_and_stage && (
        <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-surface-border">
          {brief.team_and_stage}
        </p>
      )}

      <div className="flex flex-wrap gap-3 mt-3">
        {brief.sources?.yc_company_url && (
          <a
            href={brief.sources.yc_company_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent-light hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> Perfil YC
          </a>
        )}
        {(brief.sources?.website || companyWebsite) && (
          <a
            href={brief.sources?.website || companyWebsite}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent-light hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> Web de la empresa
          </a>
        )}
      </div>
    </div>
  );
}
