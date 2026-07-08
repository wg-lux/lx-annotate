import { describe, expect, it, vi } from 'vitest';
import { buildVideoHlsPlaylistUrl, buildVideoPlaybackUrls } from '@/utils/mediaUrls';
vi.mock('@/api/axiosInstance', () => ({
    r: (path) => `/endoreg-api/${path.replace(/^\/+/, '')}`
}));
function parsedUrl(url) {
    return new URL(url);
}
describe('mediaUrls', () => {
    it('builds the processed HLS playlist URL', () => {
        const url = parsedUrl(buildVideoHlsPlaylistUrl(42));
        expect(url.pathname).toBe('/endoreg-api/media/videos/42/hls/playlist/');
        expect(url.searchParams.get('type')).toBe('processed');
    });
    it('returns HLS first with the progressive processed stream as fallback', () => {
        const urls = buildVideoPlaybackUrls(42);
        const hlsUrl = parsedUrl(urls.hlsPlaylistUrl);
        const fallbackUrl = parsedUrl(urls.fallbackStreamUrl);
        expect(hlsUrl.pathname).toBe('/endoreg-api/media/videos/42/hls/playlist/');
        expect(hlsUrl.searchParams.get('type')).toBe('processed');
        expect(fallbackUrl.pathname).toBe('/endoreg-api/media/videos/42/stream/');
        expect(fallbackUrl.searchParams.get('type')).toBe('processed');
    });
});
