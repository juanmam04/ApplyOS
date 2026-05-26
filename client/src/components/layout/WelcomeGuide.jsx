import { Link } from 'react-router-dom';
import { User, FileText, Briefcase, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';

const STEPS = [
  {
    icon: User,
    title: '1. Sube tu CV → perfil automático',
    desc: 'Sube tu PDF y la IA rellena tu perfil (nombre, skills, experiencia). Revísalo y ajusta.',
    to: '/cv',
    cta: 'Subir CV',
  },
  {
    icon: FileText,
    title: '2. Revisa tu perfil',
    desc: 'La IA extrae tus datos del CV. Corrige lo que haga falta en Perfil.',
    to: '/profile',
    cta: 'Ver perfil',
  },
  {
    icon: Briefcase,
    title: '3. Revisa tu Inbox',
    desc: 'ApplyOS busca startups, analiza pros/contras y prepara la aplicación. Solo confirmas.',
    to: '/inbox',
    cta: 'Abrir Inbox',
  },
];

export default function WelcomeGuide({ onDismiss }) {
  const [hidden, setHidden] = useState(() => localStorage.getItem('applyos_guide_dismissed') === '1');

  if (hidden) return null;

  const dismiss = () => {
    localStorage.setItem('applyos_guide_dismissed', '1');
    setHidden(true);
    onDismiss?.();
  };

  return (
    <div className="card p-5 mb-8 border-accent/20 bg-gradient-to-br from-accent/8 to-transparent relative">
      <button onClick={dismiss} className="absolute top-4 right-4 btn-ghost p-1 text-gray-500">
        <X className="w-4 h-4" />
      </button>
      <h2 className="text-base font-semibold text-gray-100 mb-1">¿Por dónde empezar?</h2>
      <p className="text-sm text-gray-500 mb-5">ApplyOS te ayuda a gestionar aplicaciones a startups en 3 pasos:</p>
      <div className="grid md:grid-cols-3 gap-4">
        {STEPS.map(({ icon: Icon, title, desc, to, cta }) => (
          <div key={to} className="bg-surface-overlay/50 rounded-lg p-4 border border-surface-border">
            <Icon className="w-5 h-5 text-accent-light mb-2" />
            <h3 className="text-sm font-medium text-gray-200 mb-1">{title}</h3>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">{desc}</p>
            <Link to={to} className="text-xs text-accent-light hover:text-accent flex items-center gap-1">
              {cta} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
