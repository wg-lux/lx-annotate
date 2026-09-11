import { PDFDocument } from 'pdf-lib'
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'

export interface PdfCorrectionBox {
  x: number
  y: number
  width: number
  height: number
}

export interface PdfCorrectionArtifact {
  bytes: Uint8Array
  source_sha256: string
  manifest: {
    version: number
    normalized: true
    pages: Array<{ page: number; boxes: PdfCorrectionBox[] }>
  }
}

// Rebuild from rendered pixels: copying source pages would retain hidden text,
// images, annotations, attachments and document metadata beneath black boxes.
export async function build_pdf_correction(
  source: Uint8Array,
  document: PDFDocumentProxy,
  boxes: Partial<Record<number, PdfCorrectionBox[]>>
): Promise<PdfCorrectionArtifact> {
  const manifest: PdfCorrectionArtifact['manifest'] = {
    version: 1,
    normalized: true,
    pages: Object.entries(boxes).map(([page, entries]) => ({
      page: Number(page),
      boxes: (entries ?? []).map((box) => ({ ...box }))
    }))
  }
  for (const entry of manifest.pages) {
    if (!Number.isInteger(entry.page) || entry.page < 1 || entry.page > document.numPages) {
      throw new Error('Ungültige PDF-Seite.')
    }
    for (const redactionBox of entry.boxes) {
      if (
        ![redactionBox.x, redactionBox.y, redactionBox.width, redactionBox.height].every(
          Number.isFinite
        ) ||
        redactionBox.x < 0 ||
        redactionBox.y < 0 ||
        redactionBox.width <= 0 ||
        redactionBox.height <= 0 ||
        redactionBox.x + redactionBox.width > 1 ||
        redactionBox.y + redactionBox.height > 1
      ) {
        throw new Error('Ungültiger Schwärzungsbereich.')
      }
    }
  }
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(source).buffer)
  const output = await PDFDocument.create()
  for (let index = 1; index <= document.numPages; index += 1) {
    const page = await document.getPage(index)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = window.document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('PDF-Zeichenfläche ist nicht verfügbar.')
    }
    await page.render({ canvasContext: context, viewport }).promise
    context.fillStyle = '#000000'
    for (const redactionBox of manifest.pages.find((entry) => entry.page === index)?.boxes ?? []) {
      const left = Math.floor(redactionBox.x * canvas.width)
      const topEdge = Math.floor(redactionBox.y * canvas.height)
      context.fillRect(
        left,
        topEdge,
        Math.ceil((redactionBox.x + redactionBox.width) * canvas.width) - left,
        Math.ceil((redactionBox.y + redactionBox.height) * canvas.height) - topEdge
      )
    }
    const image = await output.embedPng(canvas.toDataURL('image/png'))
    const target = output.addPage([viewport.width / 2, viewport.height / 2])
    target.drawImage(image, { x: 0, y: 0, width: target.getWidth(), height: target.getHeight() })
    canvas.width = 0
    canvas.height = 0
  }
  return {
    bytes: new Uint8Array(await output.save()),
    source_sha256: Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join(''),
    manifest
  }
}
