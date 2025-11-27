interface Props {
    findingId: number;
    isAddedToExamination?: boolean;
    patientExaminationId?: number;
}
declare const _default: import("vue").DefineComponent<Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "added-to-examination": (data: {
        findingId: number;
        findingName?: string | undefined;
        selectedClassifications: any[];
        response: any;
    }) => any;
    "classification-updated": (findingId: number, classificationId: number, choiceId: number | null) => any;
    "error-occurred": (data: {
        findingId: number;
        error: string;
        selectedClassifications: number;
    }) => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    "onAdded-to-examination"?: ((data: {
        findingId: number;
        findingName?: string | undefined;
        selectedClassifications: any[];
        response: any;
    }) => any) | undefined;
    "onClassification-updated"?: ((findingId: number, classificationId: number, choiceId: number | null) => any) | undefined;
    "onError-occurred"?: ((data: {
        findingId: number;
        error: string;
        selectedClassifications: number;
    }) => any) | undefined;
}>, {
    isAddedToExamination: boolean;
    patientExaminationId: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
