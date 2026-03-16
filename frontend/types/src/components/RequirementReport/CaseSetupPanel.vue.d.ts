type PatientOption = {
    id: number;
    displayName: string;
};
type ExaminationOption = {
    id: number;
    displayName: string;
};
type __VLS_Props = {
    selectedPatientId: number | null;
    selectedExaminationId: number | null;
    selectedPatientDisplayName: string;
    selectedExaminationDisplayName: string;
    patients: PatientOption[];
    examinationsDropdown: ExaminationOption[];
    isLoadingPatients: boolean;
    isLoadingExaminations: boolean;
    loading: boolean;
    hasActiveSession: boolean;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:selectedPatientId": (value: number | null) => any;
    "update:selectedExaminationId": (value: number | null) => any;
    createCase: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:selectedPatientId"?: ((value: number | null) => any) | undefined;
    "onUpdate:selectedExaminationId"?: ((value: number | null) => any) | undefined;
    onCreateCase?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
