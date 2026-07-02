import { type Finding, type PatientFindingRow } from '@/api/findings.contract';
type PatientFindingLike = Partial<PatientFindingRow> & {
    patientExamination?: number;
    patient_examination?: number;
    isActive?: boolean;
    is_active?: boolean;
};
export declare function useFindingSelectors(): {
    catalogFindings: import("vue").ComputedRef<readonly Finding[]>;
    loading: import("vue").ComputedRef<boolean>;
    ensureCatalogLoaded: () => Promise<readonly Finding[]>;
    ensurePatientFindingsLoaded: (patientExaminationId: number | null | undefined) => Promise<readonly PatientFindingLike[]>;
    getFindingById: (findingId: number) => Finding | undefined;
    getFindingNameById: (findingId: number, fallbackName?: string) => string;
    getAttachedFindingIds: (patientExaminationId: number | null | undefined) => number[];
    isFindingAttached: (patientExaminationId: number | null | undefined, findingId: number) => boolean;
};
export {};
