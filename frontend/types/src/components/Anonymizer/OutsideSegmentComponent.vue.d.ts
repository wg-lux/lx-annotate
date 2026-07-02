/**
 * Props: which video to display
 */
type __VLS_Props = {
    videoId: number;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "segment-validated": (segmentId: string | number) => any;
    "validation-complete": () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onSegment-validated"?: ((segmentId: string | number) => any) | undefined;
    "onValidation-complete"?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
