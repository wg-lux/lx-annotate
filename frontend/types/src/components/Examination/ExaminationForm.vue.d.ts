import type { Examination, SubcategoryMap } from '@/stores/examinationStore';
declare const _default: import("vue").DefineComponent<{}, {
    examinations: import("vue").Ref<{
        id: number;
        name: string;
    }[], Examination[] | {
        id: number;
        name: string;
    }[]>;
    selectedExamId: import("vue").Ref<number | null, number | null>;
    activeCategory: import("vue").Ref<keyof SubcategoryMap, keyof SubcategoryMap>;
    form: import("vue").Ref<{
        selectedMorphologies: number[];
        selectedLocations: number[];
        selectedInterventions: number[];
        selectedInstruments: number[];
    }, {
        selectedMorphologies: number[];
        selectedLocations: number[];
        selectedInterventions: number[];
        selectedInstruments: number[];
    } | {
        selectedMorphologies: number[];
        selectedLocations: number[];
        selectedInterventions: number[];
        selectedInstruments: number[];
    }>;
    tempSelection: import("vue").Ref<{
        morphologyChoiceId: number | undefined;
        locationChoiceId: number | undefined;
        interventionId: number | undefined;
        instrumentId: number | undefined;
    }, {
        morphologyChoiceId: number | undefined;
        locationChoiceId: number | undefined;
        interventionId: number | undefined;
        instrumentId: number | undefined;
    } | {
        morphologyChoiceId: number | undefined;
        locationChoiceId: number | undefined;
        interventionId: number | undefined;
        instrumentId: number | undefined;
    }>;
    subcategories: import("vue").ComputedRef<SubcategoryMap>;
    categoryLabels: {
        readonly morphologyChoices: "Morphologie";
        readonly locationChoices: "Lokalisierung";
        readonly interventions: "Interventionen";
        readonly instruments: "Instrumente";
    };
    onExamChange: () => Promise<void>;
    colourMap: {
        morphologyChoices: string;
        locationChoices: string;
        interventions: string;
        instruments: string;
    };
    selectedMorphologyClassificationId: import("vue").Ref<number | null, number | null>;
    filteredMorphChoices: import("vue").ComputedRef<import("@/stores/examinationStore").MorphologyClassificationChoice[]>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    morphologyClassifications: import("vue").Ref<{
        id: number;
        name: string;
    }[], import("@/stores/examinationStore").MorphologyClassification[] | {
        id: number;
        name: string;
    }[]>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    ClassificationCard: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
        label: {
            type: StringConstructor;
            required: true;
        };
        options: {
            type: import("vue").PropType<import("./ClassificationCard.vue").Option[]>;
            default: () => never[];
        };
        modelValue: {
            type: import("vue").PropType<number[]>;
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
        selectedLabels: import("vue").ComputedRef<import("./ClassificationCard.vue").Option[]>;
        availableOptions: import("vue").ComputedRef<import("./ClassificationCard.vue").Option[]>;
        selectPrompt: import("vue").ComputedRef<string>;
        addSelected: () => void;
        removeItem: (id: number) => void;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("update:modelValue" | "update:tempValue")[], "update:modelValue" | "update:tempValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        label: {
            type: StringConstructor;
            required: true;
        };
        options: {
            type: import("vue").PropType<import("./ClassificationCard.vue").Option[]>;
            default: () => never[];
        };
        modelValue: {
            type: import("vue").PropType<number[]>;
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
        options: import("./ClassificationCard.vue").Option[];
        modelValue: number[];
        tempValue: number;
        compact: boolean;
        singleSelect: boolean;
    }, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
