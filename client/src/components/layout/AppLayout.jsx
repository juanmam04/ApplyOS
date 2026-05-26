import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function AppLayout() {
  const [backendDown, setBackendDown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const r = await fetch('/api/health', { cache: 'no-store' });
        if (!cancelled) setBackendDown(!r.ok);
      } catch {
        if (!cancelled) setBackendDown(true);
      }
    };
    check();
    const id = setInterval(check, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <Sidebar />
      <MobileNav />
      <main className="md:ml-60 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {backendDown && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/90 px-4 py-3 text-sm text-red-100">
              <strong>Sin backend:</strong> los datos y las acciones que usan la API no funcionan. En la terminal del proyecto ejecutá{' '}
              <code className="text-white/90">npm run dev</code> y esperá a ver{' '}
              <code className="text-white/90">ApplyOS server → http://localhost:47291</code>.
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
