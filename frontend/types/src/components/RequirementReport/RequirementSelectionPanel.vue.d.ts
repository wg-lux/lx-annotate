type RequirementSetLite = {
    id: number;
    name: string;
    type: string;
};
type RequirementStatusSummary = {
    met: boolean;
    metRequirementsCount: number;
    totalRequirementsCount: number;
};
type SuggestedActionEntry = {
    requirementId: string;
    requirementLabel: string;
    summary: string;
};
type __VLS_Props = {
    loading: boolean;
    caseActive: boolean;
    selectedPatientDisplayName: string;
    selectedExaminationDisplayName: string;
    selectedRequirementSetIds: number[];
    selectedRequirementSetIdSet: Set<number>;
    requirementSets: RequirementSetLite[];
    unmetRequirementCount: number;
    suggestedActionCount: number;
    nextStepMessage: string;
    candidateRequirementSetIds: number[];
    candidateRequirementSetConfidence: number | null;
    suggestedActionEntries: SuggestedActionEntry[];
    evaluationSummary: {
        totalSets: number;
        evaluatedSets: number;
        completionPercentage: number;
    } | null;
    requirementSetStatus: Record<number, RequirementStatusSummary | null>;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    clearSelection: () => any;
    refresh: () => any;
    recompute: () => any;
    resetSession: () => any;
    applyRecommended: () => any;
    selectAll: () => any;
    evaluateAll: () => any;
    evaluateSet: (id: number) => any;
    toggleSet: (id: number, checked: boolean) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onClearSelection?: (() => any) | undefined;
    onRefresh?: (() => any) | undefined;
    onRecompute?: (() => any) | undefined;
    onResetSession?: (() => any) | undefined;
    onApplyRecommended?: (() => any) | undefined;
    onSelectAll?: (() => any) | undefined;
    onEvaluateAll?: (() => any) | undefined;
    onEvaluateSet?: ((id: number) => any) | undefined;
    onToggleSet?: ((id: number, checked: boolean) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
