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
        default: () => any[];
    };
    modelValue: {
        type: PropType<number[]>;
        default: () => any[];
    };
    tempValue: {
        type: NumberConstructor;
        default: any;
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
    localTempValue: import("vue").WritableComputedRef<number, number>;
    singleSelectedValue: import("vue").WritableComputedRef<number, number>;
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
        default: () => any[];
    };
    modelValue: {
        type: PropType<number[]>;
        default: () => any[];
    };
    tempValue: {
        type: NumberConstructor;
        default: any;
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
    "onUpdate:modelValue"?: (...args: any[]) => any;
    "onUpdate:tempValue"?: (...args: any[]) => any;
}>, {
    options: Option[];
    modelValue: number[];
    tempValue: number;
    compact: boolean;
    singleSelect: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
