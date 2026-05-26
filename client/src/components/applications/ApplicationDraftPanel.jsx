import { useState } from 'react';
import { Copy, Check, Download, FileText } from 'lucide-react';
import { api } from '../../api/client';
import { triggerBlobDownload } from '../../utils/download';

const TABS = [
  { key: 'shortMessage', label: 'Corto' },
  { key: 'emailApplication', label: 'Email' },
  { key: 'linkedinDM', label: 'LinkedIn' },
  { key: 'founderMessage', label: 'Founder' },
  { key: 'coverLetter', label: 'Cover letter' },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={copy} className="btn-ghost text-xs py-1">
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

export default function ApplicationDraftPanel({
  draft,
  companyName = '',
  roleTitle = '',
  compact = false,
}) {
  const [tab, setTab] = useState('shortMessage');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!draft) {
    return <p className="text-sm text-gray-500">Sin borrador generado</p>;
  }

  const handleDownloadCoverLetterPdf = async () => {
    const coverLetter = draft.coverLetter;
    if (!coverLetter?.trim()) return;

    setDownloadingPdf(true);
    try {
      const { blob, filename } = await api.generate.coverLetterPdf({
        coverLetter,
        companyName,
        roleTitle,
      });
      triggerBlobDownload(blob, filename);
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const textClass = compact
    ? 'text-xs text-gray-400 max-h-40'
    : 'text-sm text-gray-300';

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-2.5 py-1 rounded text-xs ${
              tab === t.key ? 'bg-accent/15 text-accent-light' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'coverLetter' && draft.coverLetter && (
        <div className="mb-3 p-3 rounded-lg border border-accent/20 bg-accent/5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-accent-light">
              <FileText className="w-3.5 h-3.5" />
              Cover letter lista para enviar
            </div>
            <button
              type="button"
              onClick={handleDownloadCoverLetterPdf}
              disabled={downloadingPdf}
              className="btn-primary text-xs py-1.5"
            >
              <Download className={`w-3.5 h-3.5 ${downloadingPdf ? 'animate-pulse' : ''}`} />
              {downloadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            PDF con tu nombre y la carta — súbelo junto al CV en el formulario de la startup.
          </p>
        </div>
      )}

      <div className="flex justify-end mb-1">
        <CopyButton text={draft[tab] || ''} />
      </div>
      <pre
        className={`${textClass} whitespace-pre-wrap font-sans leading-relaxed bg-surface-overlay rounded-lg p-3 overflow-y-auto`}
      >
        {draft[tab]}
      </pre>
    </div>
  );
}
