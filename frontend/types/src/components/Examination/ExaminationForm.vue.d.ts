interface Props {
    videoTimestamp?: number | null;
    videoId?: number | null;
    patientId?: number | null;
}
declare const _default: import("vue").DefineComponent<Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    'examination-saved': (data: any) => any;
    'patient-examination-created': (data: any) => any;
    cancel: () => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    onCancel?: (() => any) | undefined;
    "onExamination-saved"?: ((data: any) => any) | undefined;
    "onPatient-examination-created"?: ((data: any) => any) | undefined;
}>, {
    videoTimestamp: number | null;
    videoId: number | null;
    patientId: number | null;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
