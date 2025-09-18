/**
 * Component Props
 *
 * @interface Props
 * @property {number} [patientExaminationId] - Optional patient examination ID override
 * @property {number} [examinationId] - Optional examination ID for context
 */
interface Props {
    patientExaminationId?: number;
    examinationId?: number;
}
declare const _default: import("vue").DefineComponent<Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    'finding-added': (findingId: number, findingName: string) => any;
    'finding-error': (error: string) => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    "onFinding-added"?: ((findingId: number, findingName: string) => any) | undefined;
    "onFinding-error"?: ((error: string) => any) | undefined;
}>, {
    examinationId: number;
    patientExaminationId: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
