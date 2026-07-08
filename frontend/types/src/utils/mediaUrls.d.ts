type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;
type MediaFileType = 'raw' | 'processed';
type StreamableVideoFileType = 'processed';
export interface VideoPlaybackUrls {
    hlsPlaylistUrl: string;
    fallbackStreamUrl: string;
}
export declare function buildApiUrl(path: string, query?: QueryParams): string;
export declare function buildVideoStreamUrl(fileId: number, type?: MediaFileType, query?: QueryParams): string;
export declare function buildVideoHlsPlaylistUrl(fileId: number, type?: StreamableVideoFileType, query?: QueryParams): string;
export declare function buildVideoPlaybackUrls(fileId: number): VideoPlaybackUrls;
export declare function buildPdfStreamUrl(fileId: number, type?: MediaFileType, query?: QueryParams): string;
export {};
