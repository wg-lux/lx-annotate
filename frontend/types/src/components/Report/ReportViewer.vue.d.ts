interface Props {
    reportId?: number;
}
declare const _default: import("vue").DefineComponent<Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    error: (error: string) => any;
    reportLoaded: (report: any) => any;
    metadataUpdated: (metadata: any) => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    onError?: ((error: string) => any) | undefined;
    onReportLoaded?: ((report: any) => any) | undefined;
    onMetadataUpdated?: ((metadata: any) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
