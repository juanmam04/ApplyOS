import PDFDocument from 'pdfkit';

function sanitizeFilename(name) {
  return String(name || 'Cover_Letter')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'Cover_Letter';
}

export function buildCoverLetterPdf({
  coverLetter,
  companyName = '',
  roleTitle = '',
  applicantName = '',
}) {
  const text = String(coverLetter || '').trim();
  if (!text) throw new Error('La cover letter está vacía');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 72 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve({
      buffer: Buffer.concat(chunks),
      filename: `${sanitizeFilename(companyName)}_Cover_Letter.pdf`,
    }));
    doc.on('error', reject);

    if (applicantName) {
      doc.fontSize(12).font('Helvetica-Bold').text(applicantName);
      doc.moveDown(0.3);
    }

    const subtitle = [roleTitle, companyName].filter(Boolean).join(' — ');
    if (subtitle) {
      doc.fontSize(10).font('Helvetica').fillColor('#444444').text(subtitle);
      doc.fillColor('#000000');
      doc.moveDown(1.2);
    }

    doc.fontSize(11).font('Helvetica');
    const paragraphs = text.split(/\n{2,}/);
    for (let i = 0; i < paragraphs.length; i++) {
      const block = paragraphs[i].trim();
      if (!block) continue;
      doc.text(block, { align: 'left', lineGap: 5, paragraphGap: 8 });
      if (i < paragraphs.length - 1) doc.moveDown(0.8);
    }

    doc.end();
  });
}
