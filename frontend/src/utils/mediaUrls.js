import { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
export function buildApiUrl(path, query) {
    const url = new URL(r(path), window.location.origin);
    if (!query) {
        return url.toString();
    }
    for (const [key, value] of Object.entries(query)) {
        if (value === null || value === undefined) {
            continue;
        }
        url.searchParams.set(key, String(value));
    }
    return url.toString();
}
export function buildVideoStreamUrl(fileId, type, query) {
    return buildApiUrl(endpoints.media.videoStream(fileId), {
        ...(type ? { type } : {}),
        ...query
    });
}
export function buildVideoHlsPlaylistUrl(fileId, type = 'processed', query) {
    return buildApiUrl(endpoints.media.videoHlsPlaylist(fileId), {
        type,
        ...query
    });
}
export function buildVideoPlaybackUrls(fileId) {
    return {
        hlsPlaylistUrl: buildVideoHlsPlaylistUrl(fileId, 'processed'),
        fallbackStreamUrl: buildVideoStreamUrl(fileId, 'processed')
    };
}
export function buildPdfStreamUrl(fileId, type, query) {
    return buildApiUrl(endpoints.media.pdfStream(fileId), {
        ...(type ? { type } : {}),
        ...query
    });
}
