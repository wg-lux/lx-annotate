import axios from 'axios';
import Hls from 'hls.js';
import { computed, onBeforeUnmount, readonly, ref, watch } from 'vue';
import axiosInstance, { silentRequestConfig } from '@/api/axiosInstance';
import { buildVideoPlaybackUrls } from '@/utils/mediaUrls';
export class AuthenticatedVideoStreamError extends Error {
    reason;
    status;
    url;
    cause;
    constructor(reason, message, options = {}) {
        super(message);
        this.name = 'AuthenticatedVideoStreamError';
        this.reason = reason;
        this.status = options.status;
        this.url = options.url;
        this.cause = options.cause;
    }
}
const HLS_PLAYLIST_ACCEPT = 'application/vnd.apple.mpegurl, application/x-mpegURL, */*';
function readRef(value) {
    return value.value;
}
function axiosStatus(error) {
    if (!axios.isAxiosError(error)) {
        return undefined;
    }
    return error.response?.status;
}
function buildPlaylistError(error, url) {
    const status = axiosStatus(error);
    if (status === 401) {
        return new AuthenticatedVideoStreamError('hls_playlist_unauthorized', 'HLS playback is not authenticated.', { status, url, cause: error });
    }
    if (status === 403) {
        return new AuthenticatedVideoStreamError('hls_playlist_forbidden', 'HLS playback is not permitted for this video.', { status, url, cause: error });
    }
    return new AuthenticatedVideoStreamError('hls_playlist_request_failed', status === undefined
        ? 'HLS playlist could not be requested.'
        : `HLS playlist request failed with status ${status}.`, { status, url, cause: error });
}
function normalizeStreamError(error) {
    if (error instanceof AuthenticatedVideoStreamError) {
        return error;
    }
    return new AuthenticatedVideoStreamError('hls_playlist_request_failed', 'HLS playback failed before the player could be configured.', { cause: error });
}
async function hlsPlaylistExists(url) {
    try {
        await axiosInstance.get(url, silentRequestConfig({
            headers: {
                Accept: HLS_PLAYLIST_ACCEPT
            },
            responseType: 'text',
            withCredentials: true
        }));
        return true;
    }
    catch (error) {
        if (axiosStatus(error) === 404) {
            return false;
        }
        throw buildPlaylistError(error, url);
    }
}
function canPlayNativeHls(video) {
    return video.canPlayType('application/vnd.apple.mpegurl') !== '';
}
export function useAuthenticatedVideoStream(options) {
    const playbackMode = ref('idle');
    const playbackSourceUrl = ref('');
    const playbackError = ref(null);
    const isHlsPlayback = computed(() => playbackMode.value === 'hls' || playbackMode.value === 'native_hls');
    let hlsInstance = null;
    let loadSerial = 0;
    function destroyHls() {
        if (hlsInstance) {
            hlsInstance.destroy();
            hlsInstance = null;
        }
    }
    function clearVideoElement(video) {
        destroyHls();
        if (video) {
            video.removeAttribute('src');
        }
        playbackSourceUrl.value = '';
    }
    function setError(error) {
        playbackMode.value = 'error';
        playbackError.value = error;
        options.onFatalError?.(error);
    }
    function useProgressiveStream(video, url) {
        destroyHls();
        video.crossOrigin = 'use-credentials';
        video.src = url;
        playbackSourceUrl.value = url;
        playbackMode.value = 'progressive';
        playbackError.value = null;
    }
    function useNativeHls(video, url) {
        destroyHls();
        video.crossOrigin = 'use-credentials';
        video.src = url;
        playbackSourceUrl.value = url;
        playbackMode.value = 'native_hls';
        playbackError.value = null;
    }
    function useHlsJs(video, url) {
        destroyHls();
        video.crossOrigin = 'use-credentials';
        const hls = new Hls({
            xhrSetup: (xhr) => {
                xhr.withCredentials = true;
            }
        });
        hlsInstance = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_event, data) => {
            if (!data.fatal) {
                return;
            }
            destroyHls();
            setError(new AuthenticatedVideoStreamError('hls_playback_failed', `HLS playback failed: ${data.type}/${data.details}.`, { url, cause: data }));
        });
        playbackSourceUrl.value = url;
        playbackMode.value = 'hls';
        playbackError.value = null;
    }
    async function configurePlayback() {
        const serial = ++loadSerial;
        const video = options.videoElement.value;
        const videoId = readRef(options.videoId);
        const enabled = options.enabled ? readRef(options.enabled) : true;
        clearVideoElement(video);
        playbackMode.value = 'idle';
        playbackError.value = null;
        if (!video || !videoId || !enabled) {
            return;
        }
        const urls = buildVideoPlaybackUrls(videoId);
        const canUseHlsJs = Hls.isSupported();
        const canUseNative = canPlayNativeHls(video);
        if (!canUseHlsJs && !canUseNative) {
            useProgressiveStream(video, urls.fallbackStreamUrl);
            return;
        }
        let hasPlaylist;
        try {
            hasPlaylist = await hlsPlaylistExists(urls.hlsPlaylistUrl);
        }
        catch (error) {
            if (serial !== loadSerial) {
                return;
            }
            setError(normalizeStreamError(error));
            return;
        }
        if (serial !== loadSerial) {
            return;
        }
        if (!hasPlaylist) {
            useProgressiveStream(video, urls.fallbackStreamUrl);
            return;
        }
        if (canUseHlsJs) {
            useHlsJs(video, urls.hlsPlaylistUrl);
            return;
        }
        useNativeHls(video, urls.hlsPlaylistUrl);
    }
    watch([
        () => options.videoElement.value,
        () => readRef(options.videoId),
        () => (options.enabled ? readRef(options.enabled) : true)
    ], () => {
        void configurePlayback();
    }, { flush: 'post', immediate: true });
    onBeforeUnmount(() => {
        loadSerial += 1;
        clearVideoElement(options.videoElement.value);
        playbackMode.value = 'idle';
    });
    return {
        playbackMode: readonly(playbackMode),
        playbackSourceUrl: readonly(playbackSourceUrl),
        playbackError: readonly(playbackError),
        isHlsPlayback
    };
}
