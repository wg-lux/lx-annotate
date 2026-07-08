import { type ComputedRef, type Ref } from 'vue';
type ReadableRef<T> = Ref<T> | ComputedRef<T>;
export type AuthenticatedVideoPlaybackMode = 'idle' | 'hls' | 'native_hls' | 'progressive' | 'error';
export type AuthenticatedVideoStreamErrorReason = 'hls_playlist_unauthorized' | 'hls_playlist_forbidden' | 'hls_playlist_request_failed' | 'hls_playback_failed';
export declare class AuthenticatedVideoStreamError extends Error {
    readonly reason: AuthenticatedVideoStreamErrorReason;
    readonly status?: number;
    readonly url?: string;
    readonly cause?: unknown;
    constructor(reason: AuthenticatedVideoStreamErrorReason, message: string, options?: {
        status?: number;
        url?: string;
        cause?: unknown;
    });
}
export interface UseAuthenticatedVideoStreamOptions {
    videoElement: Ref<HTMLVideoElement | null>;
    videoId: ReadableRef<number | null | undefined>;
    enabled?: ReadableRef<boolean>;
    onFatalError?: (error: AuthenticatedVideoStreamError) => void;
}
export declare function useAuthenticatedVideoStream(options: UseAuthenticatedVideoStreamOptions): {
    playbackMode: Readonly<Ref<AuthenticatedVideoPlaybackMode, AuthenticatedVideoPlaybackMode>>;
    playbackSourceUrl: Readonly<Ref<string, string>>;
    playbackError: Readonly<Ref<AuthenticatedVideoStreamError | null, AuthenticatedVideoStreamError | null>>;
    isHlsPlayback: ComputedRef<boolean>;
};
export {};
