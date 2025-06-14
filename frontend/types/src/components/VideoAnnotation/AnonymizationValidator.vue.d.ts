interface Props {
    videoId: number;
    patientData?: {
        patient_first_name?: string;
        patient_last_name?: string;
        patient_dob?: string;
        examination_date?: string;
        pseudonym_first_name?: string;
        pseudonym_last_name?: string;
        anonymization_status?: string;
        requires_validation?: boolean;
        sensitive_meta_id?: number;
    };
    maxFrames?: number;
}
declare const _default: import("vue").DefineComponent<Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    'validation-completed': () => any;
    'cropping-required': () => any;
    'patient-data-updated': (data: any) => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    "onValidation-completed"?: (() => any) | undefined;
    "onCropping-required"?: (() => any) | undefined;
    "onPatient-data-updated"?: ((data: any) => any) | undefined;
}>, {
    maxFrames: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
