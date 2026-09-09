import { PDFDocument } from 'pdf-lib';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

export interface PdfCorrectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfCorrectionArtifact {
  bytes: Uint8Array;
  source_sha256: string;
  manifest: {
    version: number;
    normalized: true;
    pages: Array<{ page: number; boxes: PdfCorrectionBox[] }>;
  };
}

// Rebuild from rendered pixels: copying source pages would retain hidden text,
// images, annotations, attachments and document metadata beneath black boxes.
export async function build_pdf_correction(
  source: Uint8Array,
  document: PDFDocumentProxy,
  boxes: Partial<Record<number, PdfCorrectionBox[]>>,
): Promise<PdfCorrectionArtifact> {
  const manifest: PdfCorrectionArtifact['manifest'] = {
    version: 1,
    normalized: true,
    pages: Object.entries(boxes).map(([page, entries]) => ({
      page: Number(page),
      boxes: (entries ?? []).map(box => ({ ...box })),
    })),
  };
  for (const entry of manifest.pages) {
    if (!Number.isInteger(entry.page) || entry.page < 1 || entry.page > document.numPages) {
      throw new Error('Ungültige PDF-Seite.');
    }
    for (const box of entry.boxes) {
      if (![box.x, box.y, box.width, box.height].every(Number.isFinite) ||
          box.x < 0 || box.y < 0 || box.width <= 0 || box.height <= 0 ||
          box.x + box.width > 1 || box.y + box.height > 1) {
        throw new Error('Ungültiger Schwärzungsbereich.');
      }
    }
  }
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(source).buffer);
  const output = await PDFDocument.create();
  for (let index = 1; index <= document.numPages; index += 1) {
    const page = await document.getPage(index);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = window.document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PDF-Zeichenfläche ist nicht verfügbar.');
    await page.render({ canvasContext: context, viewport }).promise;
    context.fillStyle = '#000000';
    for (const box of manifest.pages.find(entry => entry.page === index)?.boxes ?? []) {
      const left = Math.floor(box.x * canvas.width);
      const top = Math.floor(box.y * canvas.height);
      context.fillRect(left, top,
        Math.ceil((box.x + box.width) * canvas.width) - left,
        Math.ceil((box.y + box.height) * canvas.height) - top);
    }
    const image = await output.embedPng(canvas.toDataURL('image/png'));
    const target = output.addPage([viewport.width / 2, viewport.height / 2]);
    target.drawImage(image, { x: 0, y: 0, width: target.getWidth(), height: target.getHeight() });
    canvas.width = 0;
    canvas.height = 0;
  }
  return {
    bytes: new Uint8Array(await output.save()),
    source_sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''),
    manifest,
  };
}
