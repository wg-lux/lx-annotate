type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;
export declare function buildApiUrl(path: string, query?: QueryParams): string;
export declare function buildVideoStreamUrl(fileId: number, type: 'raw' | 'processed', query?: QueryParams): string;
export declare function buildPdfStreamUrl(fileId: number, type: 'raw' | 'processed', query?: QueryParams): string;
export {};
