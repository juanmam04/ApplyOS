import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Inbox, Briefcase, User, Send } from 'lucide-react';

const items = [
  { to: '/dashboard', icon: LayoutDashboard },
  { to: '/inbox', icon: Inbox },
  { to: '/jobs', icon: Briefcase },
  { to: '/applications', icon: Send },
  { to: '/profile', icon: User },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-raised border-t border-surface-border flex z-40">
      {items.map(({ to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-3 text-xs transition-colors ${
              isActive ? 'text-accent-light' : 'text-gray-500'
            }`
          }
        >
          <Icon className="w-5 h-5 mb-0.5" />
        </NavLink>
      ))}
    </nav>
  );
}
