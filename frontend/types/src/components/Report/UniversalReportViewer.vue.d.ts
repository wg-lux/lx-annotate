import type { ReportData } from '@/types/report';
interface Props {
    reportId?: number;
    fileType?: string;
    viewerHeight?: string;
    showMetaInfo?: boolean;
    autoRefresh?: boolean;
    refreshInterval?: number;
}
declare function loadReport(reportId: number): Promise<void>;
declare function handleRefreshUrl(): Promise<void>;
declare function handleValidateUrl(): Promise<void>;
declare const _default: import("vue").DefineComponent<Props, {
    loadReport: typeof loadReport;
    refreshUrl: typeof handleRefreshUrl;
    validateUrl: typeof handleValidateUrl;
    clearReport: () => void;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    reportLoaded: (report: ReportData) => any;
    urlExpired: () => any;
    error: (error: string) => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    onError?: ((error: string) => any) | undefined;
    onReportLoaded?: ((report: ReportData) => any) | undefined;
    onUrlExpired?: (() => any) | undefined;
}>, {
    fileType: string;
    viewerHeight: string;
    showMetaInfo: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
