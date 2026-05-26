import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

export default function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-20 md:bottom-6 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm ${
      type === 'error' ? 'bg-red-950/90 border-red-500/30 text-red-200' : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
    }`}>
      {type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
      <p className="text-sm flex-1">{message}</p>
      <button onClick={onClose} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}
