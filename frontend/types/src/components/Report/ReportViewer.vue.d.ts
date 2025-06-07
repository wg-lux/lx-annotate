interface Props {
    reportId?: number;
}
declare const _default: import("vue").DefineComponent<Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    reportLoaded: (report: any) => any;
    metadataUpdated: (metadata: any) => any;
    error: (error: string) => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    onError?: ((error: string) => any) | undefined;
    onReportLoaded?: ((report: any) => any) | undefined;
    onMetadataUpdated?: ((metadata: any) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
