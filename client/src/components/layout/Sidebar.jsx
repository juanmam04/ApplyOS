import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, User, FileText, Briefcase, Inbox as InboxIcon,
  Send, MessageSquare, Settings, Zap,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inbox', icon: InboxIcon, label: 'Inbox', highlight: true },
  { to: '/profile', icon: User, label: 'Perfil' },
  { to: '/cv', icon: FileText, label: 'CV Manager' },
  { to: '/jobs', icon: Briefcase, label: 'Trabajos' },
  { to: '/applications', icon: Send, label: 'Aplicaciones' },
  { to: '/interview-prep', icon: MessageSquare, label: 'Entrevistas' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 bg-surface-raised border-r border-surface-border flex-col z-40">
      <div className="p-5 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-100 text-sm leading-tight">ApplyOS</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Job OS</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, highlight }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent/15 text-accent-light border border-accent/20'
                  : highlight
                    ? 'text-gray-300 hover:text-white hover:bg-surface-overlay'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-overlay'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-surface-border">
        <div className="text-xs text-gray-600 text-center">
          MVP · v1.0
        </div>
      </div>
    </aside>
  );
}
