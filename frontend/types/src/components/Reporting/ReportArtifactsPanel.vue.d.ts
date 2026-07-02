type PersistedArtifacts = {
    fullReportId?: number | null;
    pdfId?: number | null;
    pdfViewUrl?: string | null;
    pdfDownloadUrl?: string | null;
    patientTimelineUrl?: string | null;
} | null;
type __VLS_Props = {
    artifacts: PersistedArtifacts;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
