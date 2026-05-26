import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Check, Trash2, Eye, Download, Star, Sparkles } from 'lucide-react';
import { downloadFromUrl } from '../utils/download';
import { api } from '../api/client';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { formatDate } from '../utils/constants';
import Toast from '../components/ui/Toast';

export default function CVManager() {
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();

  const load = () => {
    api.cv.list()
      .then(setVersions)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.cv.upload(file);
      load();
      if (result.profile) {
        setToast({ message: 'CV subido y perfil generado con IA. Revisa tu Perfil.', type: 'success' });
        setTimeout(() => navigate('/profile'), 1500);
      } else if (result.profileError) {
        setToast({ message: `CV subido. Perfil no generado: ${result.profileError}`, type: 'error' });
      } else {
        setToast({ message: 'CV subido correctamente', type: 'success' });
      }
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleActivate = async (id) => {
    await api.cv.activate(id);
    load();
  };

  const handleGenerateProfile = async (cvId) => {
    setGenerating(true);
    try {
      const { profile } = await api.profile.fromCv(cvId);
      if (profile) {
        setToast({ message: 'Perfil generado con IA desde tu CV', type: 'success' });
        setTimeout(() => navigate('/profile'), 1200);
      }
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (cv) => {
    try {
      await downloadFromUrl(api.cv.downloadUrl(cv.id), cv.original_name || 'cv.pdf');
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta versión del CV?')) return;
    await api.cv.delete(id);
    load();
  };

  const active = versions.find(v => v.is_active);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader
        title="CV Manager"
        subtitle="Gestiona tus versiones de CV y mantén una activa para las aplicaciones"
        action={
          <>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
            <button onClick={() => fileRef.current?.click()} className="btn-primary" disabled={uploading || generating}>
              <Upload className="w-4 h-4" />
              {uploading ? 'Subiendo y analizando...' : 'Subir CV'}
            </button>
          </>
        }
      />

      {active && (
        <div className="card p-5 mb-6 border-accent/30 bg-gradient-to-r from-accent/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-accent-light" />
              </div>
              <div>
                <div className="text-xs text-accent-light font-medium uppercase tracking-wider mb-0.5">CV Activo</div>
                <div className="font-semibold text-gray-100">{active.original_name}</div>
                <div className="text-xs text-gray-500">Subido {formatDate(active.created_at)}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleGenerateProfile(active.id)} className="btn-primary" disabled={generating}>
                <Sparkles className="w-4 h-4" />
                {generating ? 'Analizando...' : 'Generar perfil con IA'}
              </button>
              <a href={api.cv.fileUrl(active.id)} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <Eye className="w-4 h-4" /> Ver PDF
              </a>
              <button type="button" onClick={() => handleDownload(active)} className="btn-secondary">
                <Download className="w-4 h-4" /> Descargar
              </button>
            </div>
          </div>
          {active.extracted_text && (
            <div className="mt-4 pt-4 border-t border-surface-border">
              <div className="text-xs text-gray-500 mb-2">Texto extraído (para IA futura)</div>
              <p className="text-xs text-gray-400 line-clamp-3 font-mono">{active.extracted_text.slice(0, 300)}...</p>
            </div>
          )}
        </div>
      )}

      {versions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin CV subido"
          description="Sube tu CV en PDF para gestionar versiones y preparar aplicaciones."
          action={
            <button onClick={() => fileRef.current?.click()} className="btn-primary">
              <Upload className="w-4 h-4" /> Subir primer CV
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Todas las versiones</h2>
          {versions.map(cv => (
            <div key={cv.id} className={`card p-4 flex items-center justify-between ${cv.is_active ? 'border-accent/20' : ''}`}>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="font-medium text-gray-200 text-sm">{cv.original_name}</div>
                  <div className="text-xs text-gray-500">{formatDate(cv.created_at)}</div>
                </div>
                {cv.is_active && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent-light rounded-full text-xs">
                    <Check className="w-3 h-3" /> Activo
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <a href={api.cv.fileUrl(cv.id)} target="_blank" rel="noopener noreferrer" className="btn-ghost" title="Ver PDF">
                  <Eye className="w-4 h-4" />
                </a>
                <button type="button" onClick={() => handleDownload(cv)} className="btn-ghost" title="Descargar PDF">
                  <Download className="w-4 h-4" />
                </button>
                {!cv.is_active && (
                  <button onClick={() => handleActivate(cv.id)} className="btn-secondary text-xs py-1.5">
                    Activar
                  </button>
                )}
                <button onClick={() => handleDelete(cv.id)} className="btn-ghost text-red-400 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
