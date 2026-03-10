import { describe, expect, it, vi } from 'vitest';
describe('getStaticUrl', () => {
    it('uses window.STATIC_URL when present', async () => {
        vi.stubGlobal('window', { STATIC_URL: '/assets' });
        const { getStaticUrl } = await import('./getStaticUrl');
        expect(getStaticUrl('docs/index.html')).toBe('/assets/docs/index.html');
    });
    it('falls back to /static/ when STATIC_URL is missing', async () => {
        vi.stubGlobal('window', {});
        const { getStaticUrl } = await import('./getStaticUrl');
        expect(getStaticUrl('img/logo.png')).toBe('/static/img/logo.png');
        expect(getStaticUrl()).toBe('/static/');
    });
    it('normalizes trailing and leading slashes', async () => {
        vi.stubGlobal('window', { STATIC_URL: '/collected-static/' });
        const { getStaticUrl, normalizeStaticUrl } = await import('./getStaticUrl');
        expect(normalizeStaticUrl('/collected-static')).toBe('/collected-static/');
        expect(getStaticUrl('/docs/index.html')).toBe('/collected-static/docs/index.html');
    });
});
