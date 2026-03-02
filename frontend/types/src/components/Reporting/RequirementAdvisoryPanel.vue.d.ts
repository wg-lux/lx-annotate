type __VLS_Props = {
    failedRequirementSets: string[];
    failedRequirements: string[];
    suggestedActions: Record<string, any[]>;
    candidateConfidence?: number | null;
    lookupRaw?: string;
    requirementGuidanceRaw?: string;
    showDebug?: boolean;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {
    candidateConfidence: number | null;
    lookupRaw: string;
    requirementGuidanceRaw: string;
    showDebug: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
