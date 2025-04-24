import type { PropType } from 'vue';
export interface Option {
    id: number;
    name: string;
}
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    options: {
        type: PropType<Option[]>;
        default: () => never[];
    };
    modelValue: {
        type: PropType<number[]>;
        default: () => never[];
    };
    tempValue: {
        type: NumberConstructor;
        default: undefined;
    };
    compact: {
        type: BooleanConstructor;
        default: boolean;
    };
    singleSelect: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, {
    localModelValue: import("vue").WritableComputedRef<number[], number[]>;
    localTempValue: import("vue").WritableComputedRef<number | undefined, number | undefined>;
    singleSelectedValue: import("vue").WritableComputedRef<number | null, number | null>;
    isSingleSelection: import("vue").ComputedRef<boolean>;
    selectedLabels: import("vue").ComputedRef<Option[]>;
    availableOptions: import("vue").ComputedRef<Option[]>;
    selectPrompt: import("vue").ComputedRef<string>;
    addSelected: () => void;
    removeItem: (id: number) => void;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("update:modelValue" | "update:tempValue")[], "update:modelValue" | "update:tempValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    label: {
        type: StringConstructor;
        required: true;
    };
    options: {
        type: PropType<Option[]>;
        default: () => never[];
    };
    modelValue: {
        type: PropType<number[]>;
        default: () => never[];
    };
    tempValue: {
        type: NumberConstructor;
        default: undefined;
    };
    compact: {
        type: BooleanConstructor;
        default: boolean;
    };
    singleSelect: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{
    "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
    "onUpdate:tempValue"?: ((...args: any[]) => any) | undefined;
}>, {
    options: Option[];
    modelValue: number[];
    tempValue: number;
    compact: boolean;
    singleSelect: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
