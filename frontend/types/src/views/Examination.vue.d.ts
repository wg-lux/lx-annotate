declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    ExaminationGenerator: import("vue").DefineComponent<{}, {
        examinations: import("vue").Ref<{
            id: number;
            name: string;
        }[], import("../stores/examinationStore.js").Examination[] | {
            id: number;
            name: string;
        }[]>;
        selectedExamId: import("vue").Ref<number, number>;
        activeCategory: import("vue").Ref<keyof import("../stores/examinationStore.js").SubcategoryMap, keyof import("../stores/examinationStore.js").SubcategoryMap>;
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
            morphologyChoiceId: number;
            locationChoiceId: number;
            interventionId: number;
            instrumentId: number;
        }, {
            morphologyChoiceId: number;
            locationChoiceId: number;
            interventionId: number;
            instrumentId: number;
        } | {
            morphologyChoiceId: number;
            locationChoiceId: number;
            interventionId: number;
            instrumentId: number;
        }>;
        subcategories: import("vue").ComputedRef<import("../stores/examinationStore.js").SubcategoryMap>;
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
        selectedMorphologyClassificationId: import("vue").Ref<number, number>;
        filteredMorphChoices: import("vue").ComputedRef<import("../stores/examinationStore.js").MorphologyClassificationChoice[]>;
        loading: import("vue").Ref<boolean, boolean>;
        error: import("vue").Ref<string, string>;
        morphologyClassifications: import("vue").Ref<{
            id: number;
            name: string;
        }[], import("../stores/examinationStore.js").MorphologyClassification[] | {
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
                type: import("vue").PropType<import("../components/Examination/ClassificationCard.vue").Option[]>;
                default: () => any[];
            };
            modelValue: {
                type: import("vue").PropType<number[]>;
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
            selectedLabels: import("vue").ComputedRef<import("../components/Examination/ClassificationCard.vue").Option[]>;
            availableOptions: import("vue").ComputedRef<import("../components/Examination/ClassificationCard.vue").Option[]>;
            selectPrompt: import("vue").ComputedRef<string>;
            addSelected: () => void;
            removeItem: (id: number) => void;
        }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("update:modelValue" | "update:tempValue")[], "update:modelValue" | "update:tempValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
            label: {
                type: StringConstructor;
                required: true;
            };
            options: {
                type: import("vue").PropType<import("../components/Examination/ClassificationCard.vue").Option[]>;
                default: () => any[];
            };
            modelValue: {
                type: import("vue").PropType<number[]>;
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
            options: import("../components/Examination/ClassificationCard.vue").Option[];
            modelValue: number[];
            tempValue: number;
            compact: boolean;
            singleSelect: boolean;
        }, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
    }, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
