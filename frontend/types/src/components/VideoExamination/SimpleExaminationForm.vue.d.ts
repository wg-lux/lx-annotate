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
    selectedExamination: null;
    locationClassifications: never[];
    findings: never[];
    interventions: never[];
    selectedLocation: null;
    selectedFinding: null;
    selectedInterventions: never[];
    notes: string;
}, {
    canSave(): null;
    hasSelections(): boolean;
}, {
    loadExaminations(): Promise<void>;
    loadExaminationData(): Promise<void>;
    loadInterventions(): Promise<void>;
    saveExamination(): Promise<void>;
    resetForm(): void;
    getLocationName(id: any): any;
    getFindingName(id: any): any;
    getInterventionName(id: any): any;
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
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
