interface Props {
    patientId?: number;
    autoFetch?: boolean;
}
declare function fetchSensitiveMetaData(nextPatient?: boolean): Promise<void>;
declare function saveSensitiveMetaData(): Promise<void>;
declare function resetForm(): void;
declare function loadNextPatient(): Promise<void>;
declare const _default: import("vue").DefineComponent<Props, {
    fetchSensitiveMetaData: typeof fetchSensitiveMetaData;
    saveSensitiveMetaData: typeof saveSensitiveMetaData;
    resetForm: typeof resetForm;
    loadNextPatient: typeof loadNextPatient;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{}>, {
    autoFetch: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
