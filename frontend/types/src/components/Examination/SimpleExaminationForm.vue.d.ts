declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    videoTimestamp: {
        type: NumberConstructor;
        default: number;
    };
    videoId: {
        type: NumberConstructor;
        required: true;
    };
}>, {}, {
    loading: boolean;
    error: null;
    examinations: never[];
    findings: never[];
    locationClassifications: never[];
    locationChoices: never[];
    morphologyClassifications: never[];
    morphologyChoices: never[];
    interventions: never[];
    selectedExaminationId: null;
    selectedFindingId: null;
    selectedLocationClassificationId: null;
    selectedLocationChoiceId: null;
    selectedMorphologyClassificationId: null;
    selectedMorphologyChoiceId: null;
    selectedInterventions: never[];
    notes: string;
}, {
    selectedExamination(): null;
    selectedFinding(): null;
    selectedLocationClassification(): null;
    selectedLocationChoice(): null;
    selectedMorphologyClassification(): null;
    selectedMorphologyChoice(): null;
    canSave(): null;
    hasSelections(): boolean;
}, {
    loadExaminations(): Promise<void>;
    onExaminationChange(): Promise<void>;
    onFindingChange(): Promise<void>;
    onLocationClassificationChange(): Promise<void>;
    onMorphologyClassificationChange(): Promise<void>;
    resetLowerLevels(fromLevel: any): void;
    saveExamination(): Promise<void>;
    resetForm(): void;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "examination-saved"[], "examination-saved", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    videoTimestamp: {
        type: NumberConstructor;
        default: number;
    };
    videoId: {
        type: NumberConstructor;
        required: true;
    };
}>> & Readonly<{
    "onExamination-saved"?: ((...args: any[]) => any) | undefined;
}>, {
    videoTimestamp: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
