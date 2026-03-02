type RequirementSetLite = {
    id: number;
    name: string;
    type: string;
};
type __VLS_Props = {
    items: RequirementSetLite[];
    selectedIdSet: Set<number>;
    loading?: boolean;
    requirementSetStatus?: Record<string, boolean>;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    toggle: (id: number, checked: boolean) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onToggle?: ((id: number, checked: boolean) => any) | undefined;
}>, {
    loading: boolean;
    requirementSetStatus: Record<string, boolean>;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
