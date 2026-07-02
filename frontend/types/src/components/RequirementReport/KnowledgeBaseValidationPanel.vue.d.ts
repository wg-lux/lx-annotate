type __VLS_Props = {
    loading: boolean;
    findingsSectionLoading: boolean;
    availableFindings: number[];
    isDebug: boolean;
};
declare var __VLS_1: {}, __VLS_3: {}, __VLS_5: {}, __VLS_7: {};
type __VLS_Slots = {} & {
    adder?: (props: typeof __VLS_1) => any;
} & {
    findings?: (props: typeof __VLS_3) => any;
} & {
    issues?: (props: typeof __VLS_5) => any;
} & {
    debug?: (props: typeof __VLS_7) => any;
};
declare const _default: __VLS_WithSlots<import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    refreshFindings: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onRefreshFindings?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>, __VLS_Slots>;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
