export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadFromUrl(url, filename) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Error al descargar');
  }
  const blob = await res.blob();
  const name = filename || getFilenameFromDisposition(res.headers.get('Content-Disposition')) || 'download';
  triggerBlobDownload(blob, name);
}

function getFilenameFromDisposition(header) {
  if (!header) return null;
  const match = header.match(/filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}
