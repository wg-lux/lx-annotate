export type PatientFindingApiClassification = {
    classification?: number;
    classificationId?: number;
    classificationChoice?: number;
    classificationChoiceId?: number;
};
export type PatientFindingApiIntervention = {
    intervention?: number;
    interventionId?: number;
    state?: string | null;
    date?: string | null;
    timeStart?: string | null;
    timeEnd?: string | null;
};
export declare function formatDateOnly(value?: string | null): string | null;
export declare function mergeClassificationSelections(findingId: number, apiClassifications: Array<number | PatientFindingApiClassification> | undefined, localSelectionsByFinding: Record<number, Record<number, number>>): Array<{
    classification: number;
    classificationChoice: number;
}>;
export declare function normalizeInterventions(apiInterventions: Array<number | PatientFindingApiIntervention> | undefined): Array<{
    intervention: number;
    state?: string | null;
    date?: string | null;
    timeStart?: string | null;
    timeEnd?: string | null;
}>;
