interface Props {
    findingId: number;
    isAddedToExamination?: boolean;
    patientExaminationId?: number;
}
declare const _default: import("vue").DefineComponent<Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    'added-to-examination': (findingId: number) => any;
    'classification-updated': (findingId: number, classificationId: number, choiceId: number | null) => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    "onAdded-to-examination"?: ((findingId: number) => any) | undefined;
    "onClassification-updated"?: ((findingId: number, classificationId: number, choiceId: number | null) => any) | undefined;
}>, {
    isAddedToExamination: boolean;
    patientExaminationId: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
