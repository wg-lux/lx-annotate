type __VLS_Props = {
    loading?: boolean;
    hasLookupToken: boolean;
    showParts?: boolean;
    refreshLabel?: string;
    partsLabel?: string;
    recomputeLabel?: string;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    refresh: () => any;
    "load-parts": () => any;
    recompute: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onRefresh?: (() => any) | undefined;
    "onLoad-parts"?: (() => any) | undefined;
    onRecompute?: (() => any) | undefined;
}>, {
    loading: boolean;
    showParts: boolean;
    refreshLabel: string;
    partsLabel: string;
    recomputeLabel: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
