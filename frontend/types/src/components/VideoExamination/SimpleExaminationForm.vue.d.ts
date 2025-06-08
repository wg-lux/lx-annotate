declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    videoTimestamp: {
        type: NumberConstructor;
        required: true;
    };
    videoId: {
        type: (NumberConstructor | StringConstructor)[];
        default: null;
    };
}>, {}, {
    availableExaminations: never[];
    availableFindings: never[];
    locationClassifications: never[];
    morphologyClassifications: never[];
    selectedExamination: null;
    selectedFinding: null;
    currentFindingData: null;
    notes: string;
    loading: boolean;
    error: null;
    examinationDataLoaded: boolean;
}, {
    canSave(): null;
    validationErrors(): string[];
}, {
    loadExaminations(): Promise<void>;
    loadExaminationData(): Promise<void>;
    onFindingChange(): void;
    getLocationChoicesForClassification(classificationId: any): any;
    getMorphologyChoicesForClassification(classificationId: any): any;
    getSelectedLocationChoices(classificationId: any): any;
    getSelectedMorphologyChoices(classificationId: any): any;
    updateLocationChoices(classificationId: any, choiceIds: any): void;
    updateMorphologyChoices(classificationId: any, choiceIds: any): void;
    saveExamination(): Promise<void>;
    resetForm(): void;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "examination-saved"[], "examination-saved", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    videoTimestamp: {
        type: NumberConstructor;
        required: true;
    };
    videoId: {
        type: (NumberConstructor | StringConstructor)[];
        default: null;
    };
}>> & Readonly<{
    "onExamination-saved"?: ((...args: any[]) => any) | undefined;
}>, {
    videoId: string | number;
}, {}, {
    ClassificationCard: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
        label: {
            type: StringConstructor;
            required: true;
        };
        options: {
            type: import("vue").PropType<import("../Examination/ClassificationCard.vue").Option[]>;
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
        selectedLabels: import("vue").ComputedRef<import("../Examination/ClassificationCard.vue").Option[]>;
        availableOptions: import("vue").ComputedRef<import("../Examination/ClassificationCard.vue").Option[]>;
        selectPrompt: import("vue").ComputedRef<string>;
        addSelected: () => void;
        removeItem: (id: number) => void;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("update:modelValue" | "update:tempValue")[], "update:modelValue" | "update:tempValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        label: {
            type: StringConstructor;
            required: true;
        };
        options: {
            type: import("vue").PropType<import("../Examination/ClassificationCard.vue").Option[]>;
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
        options: import("../Examination/ClassificationCard.vue").Option[];
        modelValue: number[];
        tempValue: number;
        compact: boolean;
        singleSelect: boolean;
    }, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
