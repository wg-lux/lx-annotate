import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import { build_pdf_correction } from '../pdfCorrection';

describe('PDF correction output', () => {
  const fill = vi.fn();
  const document = {
    numPages: 1,
    getPage: vi.fn(() => Promise.resolve({
      getViewport: () => ({ width: 400, height: 600 }),
      render: () => ({ promise: Promise.resolve() }),
    })),
  } as unknown as PDFDocumentProxy;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', webcrypto);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: fill } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5d8AAAAASUVORK5CYII=',
    );
  });

  it('creates an image-only document without copying source text or metadata', async () => {
    const original = await PDFDocument.create();
    original.setTitle('source metadata');
    original.addPage().drawText('source text');
    const source = await original.save();
    const boxes = { 1: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }] };
    const result = await build_pdf_correction(source, document, boxes);
    const output = await PDFDocument.load(result.bytes);
    expect(output.getPageCount()).toBe(1);
    expect(output.getTitle()).toBeUndefined();
    expect(output.getPage(0).getSize()).toEqual({ width: 200, height: 300 });
    expect(fill).toHaveBeenCalledWith(40, 120, 120, 241);
    expect(result.source_sha256).toMatch(/^[a-f0-9]{64}$/);
    boxes[1][0].x = 0.5;
    expect(result.manifest.pages[0].boxes[0].x).toBe(0.1);
  });

  it.each([Number.NaN, -0.1, 1.1])('rejects invalid coordinates (%s)', async x => {
    await expect(build_pdf_correction(new Uint8Array([1]), document, {
      1: [{ x, y: 0, width: 0.2, height: 0.2 }],
    })).rejects.toThrow('Schwärzungsbereich');
  });
});
