import type { ReportingIndicationRow } from '@/stores/reportingFlowStore';
type IndicationChoiceOption = {
    id: number;
    label: string;
};
type IndicationOption = {
    id: number;
    label: string;
    choices?: IndicationChoiceOption[];
};
type __VLS_Props = {
    rows: ReportingIndicationRow[];
    indicationOptions?: IndicationOption[];
    title?: string;
    description?: string;
    disabled?: boolean;
    optionsLoading?: boolean;
    optionsError?: string | null;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update-row": (index: number, patch: Partial<ReportingIndicationRow>) => any;
    "add-row": () => any;
    "remove-row": (index: number) => any;
    "refresh-options": () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate-row"?: ((index: number, patch: Partial<ReportingIndicationRow>) => any) | undefined;
    "onAdd-row"?: (() => any) | undefined;
    "onRemove-row"?: ((index: number) => any) | undefined;
    "onRefresh-options"?: (() => any) | undefined;
}>, {
    title: string;
    description: string;
    disabled: boolean;
    indicationOptions: IndicationOption[];
    optionsLoading: boolean;
    optionsError: string | null;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
