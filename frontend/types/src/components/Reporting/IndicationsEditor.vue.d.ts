import type { ReportingIndicationRow } from '@/stores/reportingFlowStore';
type __VLS_Props = {
    rows: ReportingIndicationRow[];
    title?: string;
    description?: string;
    disabled?: boolean;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update-row": (index: number, patch: Partial<ReportingIndicationRow>) => any;
    "add-row": () => any;
    "remove-row": (index: number) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate-row"?: ((index: number, patch: Partial<ReportingIndicationRow>) => any) | undefined;
    "onAdd-row"?: (() => any) | undefined;
    "onRemove-row"?: ((index: number) => any) | undefined;
}>, {
    title: string;
    description: string;
    disabled: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
