declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    ExaminationGenerator: import("vue").DefineComponent<{}, {
        examinations: import("vue").Ref<{
            id: number;
            name: string;
            domainId?: number | undefined;
            applicableClassifications?: string[] | undefined;
        }[], import("../stores/examinationStore.js").Examination[] | {
            id: number;
            name: string;
            domainId?: number | undefined;
            applicableClassifications?: string[] | undefined;
        }[]>;
        selectedExamId: import("vue").Ref<number | null, number | null>;
        activeCategory: import("vue").Ref<keyof import("../stores/examinationStore.js").SubcategoryMap, keyof import("../stores/examinationStore.js").SubcategoryMap>;
        form: import("vue").Ref<{
            selectedLocations: number[];
            selectedInterventions: number[];
            selectedFindings: number[];
            selectedLocationClassifications: number[];
            selectedMorphologyClassifications: number[];
            selectedMorphologyChoices: number[];
        }, {
            selectedLocations: number[];
            selectedInterventions: number[];
            selectedFindings: number[];
            selectedLocationClassifications: number[];
            selectedMorphologyClassifications: number[];
            selectedMorphologyChoices: number[];
        } | {
            selectedLocations: number[];
            selectedInterventions: number[];
            selectedFindings: number[];
            selectedLocationClassifications: number[];
            selectedMorphologyClassifications: number[];
            selectedMorphologyChoices: number[];
        }>;
        tempSelection: import("vue").Ref<{
            locationChoiceId: number | undefined;
            interventionId: number | undefined;
            morphologyChoiceId: number | undefined;
        }, {
            locationChoiceId: number | undefined;
            interventionId: number | undefined;
            morphologyChoiceId: number | undefined;
        } | {
            locationChoiceId: number | undefined;
            interventionId: number | undefined;
            morphologyChoiceId: number | undefined;
        }>;
        subcategories: import("vue").ComputedRef<import("../stores/examinationStore.js").SubcategoryMap>;
        categoryLabels: {
            readonly locationClassifications: "Lokalisierung";
            readonly morphologyClassifications: "Morphologie";
            readonly findings: "Findings";
            readonly interventions: "Interventionen";
        };
        onExamChange: () => Promise<void>;
        onLocationClassificationChange: () => Promise<void>;
        onMorphologyClassificationChange: () => Promise<void>;
        onFindingChange: () => Promise<void>;
        colourMap: {
            locationClassifications: string;
            locationChoices: string;
            morphologyClassifications: string;
            morphologyChoices: string;
            findings: string;
            interventions: string;
        };
        selectedLocationClassificationId: import("vue").Ref<number | null, number | null>;
        selectedMorphologyClassificationId: import("vue").Ref<number | null, number | null>;
        selectedFindingId: import("vue").Ref<number | null, number | null>;
        loading: import("vue").Ref<boolean, boolean>;
        error: import("vue").Ref<string | null, string | null>;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
        ClassificationCard: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
            label: {
                type: StringConstructor;
                required: true;
            };
            options: {
                type: import("vue").PropType<import("../components/Examination/ClassificationCard.vue").Option[]>;
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
            options: import("../components/Examination/ClassificationCard.vue").Option[];
            modelValue: number[];
            tempValue: number;
            compact: boolean;
            singleSelect: boolean;
        }, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
    }, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
