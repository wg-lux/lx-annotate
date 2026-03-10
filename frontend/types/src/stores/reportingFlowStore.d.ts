import type { ReportTemplateSectionDraft } from '@/types/reportTemplate';
import type { ReportTemplateRuntimeValidationResult } from '@/types/reportTemplate';
import type { TimelineLatestPayload } from '@/api/reportingTimelineApi';
type SessionStatus = 'idle' | 'active' | 'expired' | 'restarting';
export type ReportingLookupSnapshot = {
    requirementStatus?: Record<string, boolean>;
    requirementSetStatus?: Record<string, boolean>;
    suggestedActions?: Record<string, any[]>;
    requirementsBySet?: Record<string, Array<{
        id: number;
        name: string;
    }>>;
    selectedRequirementSetIds?: number[];
    candidateRequirementSetIds?: number[];
    candidateRequirementSetConfidence?: number | null;
};
export type ReportingRequirementGuidance = Record<string, unknown> | null;
export type ReportingTemplateValidation = ReportTemplateRuntimeValidationResult | null;
export type ReportingIndicationRow = {
    examinationIndicationId: number | null;
    indicationChoiceId: number | null;
};
export declare const useReportingFlowStore: import("pinia").StoreDefinition<"reportingFlow", Pick<{
    sessionStatus: import("vue").Ref<SessionStatus, SessionStatus>;
    lookupToken: import("vue").Ref<string | null, string | null>;
    patientExaminationId: import("vue").Ref<number | null, number | null>;
    selectedPatientId: import("vue").Ref<number | null, number | null>;
    selectedExaminationId: import("vue").Ref<number | null, number | null>;
    selectedRequirementSetIds: import("vue").Ref<number[], number[]>;
    activeReportId: import("vue").Ref<number | null, number | null>;
    selectedKbModule: import("vue").Ref<string, string>;
    selectedTemplateName: import("vue").Ref<string | null, string | null>;
    templateSectionDrafts: import("vue").Ref<Record<string, ReportTemplateSectionDraft>, Record<string, ReportTemplateSectionDraft>>;
    indications: import("vue").Ref<{
        examinationIndicationId: number | null;
        indicationChoiceId: number | null;
    }[], ReportingIndicationRow[] | {
        examinationIndicationId: number | null;
        indicationChoiceId: number | null;
    }[]>;
    lookupSnapshot: import("vue").Ref<{
        requirementStatus?: Record<string, boolean> | undefined;
        requirementSetStatus?: Record<string, boolean> | undefined;
        suggestedActions?: Record<string, any[]> | undefined;
        requirementsBySet?: Record<string, {
            id: number;
            name: string;
        }[]> | undefined;
        selectedRequirementSetIds?: number[] | undefined;
        candidateRequirementSetIds?: number[] | undefined;
        candidateRequirementSetConfidence?: number | null | undefined;
    } | null, ReportingLookupSnapshot | {
        requirementStatus?: Record<string, boolean> | undefined;
        requirementSetStatus?: Record<string, boolean> | undefined;
        suggestedActions?: Record<string, any[]> | undefined;
        requirementsBySet?: Record<string, {
            id: number;
            name: string;
        }[]> | undefined;
        selectedRequirementSetIds?: number[] | undefined;
        candidateRequirementSetIds?: number[] | undefined;
        candidateRequirementSetConfidence?: number | null | undefined;
    } | null>;
    lastRequirementGuidance: import("vue").Ref<ReportingRequirementGuidance, ReportingRequirementGuidance>;
    lastTemplateValidation: import("vue").Ref<{
        templateName: string;
        ok: boolean;
        evaluatedFindingsCount: number;
        findingsValidators: {
            name: string;
            ok: boolean;
            operator: string;
            finding: string;
            matchedOccurrences: number;
            triggeredOccurrences: number;
            missingRequiredClassifications: string[];
            issues: {
                code: string;
                level: "warning" | "error";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        examinationValidators: {
            name: string;
            ok: boolean;
            findingValidatorStatus: {
                name: string;
                ok: boolean;
            }[];
            examinationValidatorStatus: {
                name: string;
                ok: boolean;
            }[];
            issues: {
                code: string;
                level: "warning" | "error";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        issues: {
            code: string;
            level: "warning" | "error";
            message: string;
            validatorName?: string | undefined;
            validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
            details?: Record<string, unknown> | undefined;
        }[];
    } | null, ReportingTemplateValidation | {
        templateName: string;
        ok: boolean;
        evaluatedFindingsCount: number;
        findingsValidators: {
            name: string;
            ok: boolean;
            operator: string;
            finding: string;
            matchedOccurrences: number;
            triggeredOccurrences: number;
            missingRequiredClassifications: string[];
            issues: {
                code: string;
                level: "warning" | "error";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        examinationValidators: {
            name: string;
            ok: boolean;
            findingValidatorStatus: {
                name: string;
                ok: boolean;
            }[];
            examinationValidatorStatus: {
                name: string;
                ok: boolean;
            }[];
            issues: {
                code: string;
                level: "warning" | "error";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        issues: {
            code: string;
            level: "warning" | "error";
            message: string;
            validatorName?: string | undefined;
            validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
            details?: Record<string, unknown> | undefined;
        }[];
    }>;
    findingsRevision: import("vue").Ref<number, number>;
    lastFindingsEvent: import("vue").Ref<{
        type: 'finding_added' | 'classification_updated';
        at: string;
        findingId: number;
        classificationId?: number | undefined;
        choiceId?: number | null | undefined;
    } | null, {
        type: 'finding_added' | 'classification_updated';
        at: string;
        findingId: number;
        classificationId?: number | undefined;
        choiceId?: number | null | undefined;
    } | {
        type: 'finding_added' | 'classification_updated';
        at: string;
        findingId: number;
        classificationId?: number | undefined;
        choiceId?: number | null | undefined;
    } | null>;
    mediaPreload: import("vue").Ref<{
        patient: {
            id: number;
            firstName: string | null;
            lastName: string | null;
            dob: string | null;
            isRealPerson: boolean;
            patientHash: string | null;
        };
        latestReport: {
            mediaType: string;
            id: number;
            patientExaminationId: number | null;
            anonymizedText: string | null;
            documentType: string | null;
            streamOptions: {
                type: string;
                url: string;
            }[];
        } | null;
        latestVideo: {
            mediaType: string;
            id: number;
            patientExaminationId: number | null;
            streamOptions: {
                type: string;
                url: string;
            }[];
        } | null;
        latestFrames: {
            videoId: number;
            frameNumber: number;
            category: string | null;
            selectionSource: string | null;
            segmentId: number | null;
            segmentLabel: string | null;
            streamUrl: string;
        }[];
    } | null, TimelineLatestPayload | {
        patient: {
            id: number;
            firstName: string | null;
            lastName: string | null;
            dob: string | null;
            isRealPerson: boolean;
            patientHash: string | null;
        };
        latestReport: {
            mediaType: string;
            id: number;
            patientExaminationId: number | null;
            anonymizedText: string | null;
            documentType: string | null;
            streamOptions: {
                type: string;
                url: string;
            }[];
        } | null;
        latestVideo: {
            mediaType: string;
            id: number;
            patientExaminationId: number | null;
            streamOptions: {
                type: string;
                url: string;
            }[];
        } | null;
        latestFrames: {
            videoId: number;
            frameNumber: number;
            category: string | null;
            selectionSource: string | null;
            segmentId: number | null;
            segmentLabel: string | null;
            streamUrl: string;
        }[];
    } | null>;
    mediaPreloadStatus: import("vue").Ref<"error" | "loading" | "idle" | "ready", "error" | "loading" | "idle" | "ready">;
    mediaPreloadError: import("vue").Ref<string | null, string | null>;
    hasActiveCase: import("vue").ComputedRef<boolean>;
    canUseLookupPages: import("vue").ComputedRef<boolean>;
    setLookupSession: (params: {
        lookupToken: string | null;
        patientExaminationId: number | null;
        status?: SessionStatus;
    }) => void;
    setCaseSelection: (params: {
        selectedPatientId?: number | null;
        selectedExaminationId?: number | null;
    }) => void;
    setSelectedRequirementSetIds: (ids: number[]) => void;
    setActiveReportId: (id: number | null) => void;
    setSessionStatus: (status: SessionStatus) => void;
    setTemplateSelection: (params: {
        moduleName?: string;
        templateName?: string | null;
    }) => void;
    setTemplateSectionDraft: (sectionName: string, patch: Partial<ReportTemplateSectionDraft>) => void;
    clearTemplateSectionDrafts: () => void;
    setIndications: (rows: ReportingIndicationRow[]) => void;
    setLookupSnapshot: (snapshot: ReportingLookupSnapshot | null) => void;
    patchLookupSnapshot: (partial: ReportingLookupSnapshot) => void;
    setLastRequirementGuidance: (guidance: ReportingRequirementGuidance) => void;
    setLastTemplateValidation: (validation: ReportingTemplateValidation) => void;
    noteFindingAdded: (findingId: number) => void;
    noteClassificationUpdated: (findingId: number, classificationId: number, choiceId: number | null) => void;
    setMediaPreloadLoading: () => void;
    setMediaPreload: (payload: TimelineLatestPayload | null) => void;
    setMediaPreloadError: (message: string) => void;
    clearMediaPreload: () => void;
    addIndicationRow: () => void;
    updateIndicationRow: (index: number, patch: Partial<ReportingIndicationRow>) => void;
    removeIndicationRow: (index: number) => void;
    resetForPatientSwitch: () => void;
    clearAll: () => void;
}, "indications" | "patientExaminationId" | "selectedPatientId" | "selectedExaminationId" | "lookupToken" | "selectedRequirementSetIds" | "activeReportId" | "selectedKbModule" | "selectedTemplateName" | "templateSectionDrafts" | "sessionStatus" | "lookupSnapshot" | "lastRequirementGuidance" | "lastTemplateValidation" | "findingsRevision" | "lastFindingsEvent" | "mediaPreload" | "mediaPreloadStatus" | "mediaPreloadError">, Pick<{
    sessionStatus: import("vue").Ref<SessionStatus, SessionStatus>;
    lookupToken: import("vue").Ref<string | null, string | null>;
    patientExaminationId: import("vue").Ref<number | null, number | null>;
    selectedPatientId: import("vue").Ref<number | null, number | null>;
    selectedExaminationId: import("vue").Ref<number | null, number | null>;
    selectedRequirementSetIds: import("vue").Ref<number[], number[]>;
    activeReportId: import("vue").Ref<number | null, number | null>;
    selectedKbModule: import("vue").Ref<string, string>;
    selectedTemplateName: import("vue").Ref<string | null, string | null>;
    templateSectionDrafts: import("vue").Ref<Record<string, ReportTemplateSectionDraft>, Record<string, ReportTemplateSectionDraft>>;
    indications: import("vue").Ref<{
        examinationIndicationId: number | null;
        indicationChoiceId: number | null;
    }[], ReportingIndicationRow[] | {
        examinationIndicationId: number | null;
        indicationChoiceId: number | null;
    }[]>;
    lookupSnapshot: import("vue").Ref<{
        requirementStatus?: Record<string, boolean> | undefined;
        requirementSetStatus?: Record<string, boolean> | undefined;
        suggestedActions?: Record<string, any[]> | undefined;
        requirementsBySet?: Record<string, {
            id: number;
            name: string;
        }[]> | undefined;
        selectedRequirementSetIds?: number[] | undefined;
        candidateRequirementSetIds?: number[] | undefined;
        candidateRequirementSetConfidence?: number | null | undefined;
    } | null, ReportingLookupSnapshot | {
        requirementStatus?: Record<string, boolean> | undefined;
        requirementSetStatus?: Record<string, boolean> | undefined;
        suggestedActions?: Record<string, any[]> | undefined;
        requirementsBySet?: Record<string, {
            id: number;
            name: string;
        }[]> | undefined;
        selectedRequirementSetIds?: number[] | undefined;
        candidateRequirementSetIds?: number[] | undefined;
        candidateRequirementSetConfidence?: number | null | undefined;
    } | null>;
    lastRequirementGuidance: import("vue").Ref<ReportingRequirementGuidance, ReportingRequirementGuidance>;
    lastTemplateValidation: import("vue").Ref<{
        templateName: string;
        ok: boolean;
        evaluatedFindingsCount: number;
        findingsValidators: {
            name: string;
            ok: boolean;
            operator: string;
            finding: string;
            matchedOccurrences: number;
            triggeredOccurrences: number;
            missingRequiredClassifications: string[];
            issues: {
                code: string;
                level: "warning" | "error";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        examinationValidators: {
            name: string;
            ok: boolean;
            findingValidatorStatus: {
                name: string;
                ok: boolean;
            }[];
            examinationValidatorStatus: {
                name: string;
                ok: boolean;
            }[];
            issues: {
                code: string;
                level: "warning" | "error";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        issues: {
            code: string;
            level: "warning" | "error";
            message: string;
            validatorName?: string | undefined;
            validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
            details?: Record<string, unknown> | undefined;
        }[];
    } | null, ReportingTemplateValidation | {
        templateName: string;
        ok: boolean;
        evaluatedFindingsCount: number;
        findingsValidators: {
            name: string;
            ok: boolean;
            operator: string;
            finding: string;
            matchedOccurrences: number;
            triggeredOccurrences: number;
            missingRequiredClassifications: string[];
            issues: {
                code: string;
                level: "warning" | "error";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        examinationValidators: {
            name: string;
            ok: boolean;
            findingValidatorStatus: {
                name: string;
                ok: boolean;
            }[];
            examinationValidatorStatus: {
                name: string;
                ok: boolean;
            }[];
            issues: {
                code: string;
                level: "warning" | "error";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        issues: {
            code: string;
            level: "warning" | "error";
            message: string;
            validatorName?: string | undefined;
            validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
            details?: Record<string, unknown> | undefined;
        }[];
    }>;
    findingsRevision: import("vue").Ref<number, number>;
    lastFindingsEvent: import("vue").Ref<{
        type: 'finding_added' | 'classification_updated';
        at: string;
        findingId: number;
        classificationId?: number | undefined;
        choiceId?: number | null | undefined;
    } | null, {
        type: 'finding_added' | 'classification_updated';
        at: string;
        findingId: number;
        classificationId?: number | undefined;
        choiceId?: number | null | undefined;
    } | {
        type: 'finding_added' | 'classification_updated';
        at: string;
        findingId: number;
        classificationId?: number | undefined;
        choiceId?: number | null | undefined;
    } | null>;
    mediaPreload: import("vue").Ref<{
        patient: {
            id: number;
            firstName: string | null;
            lastName: string | null;
            dob: string | null;
            isRealPerson: boolean;
            patientHash: string | null;
        };
        latestReport: {
            mediaType: string;
            id: number;
            patientExaminationId: number | null;
            anonymizedText: string | null;
            documentType: string | null;
            streamOptions: {
                type: string;
                url: string;
            }[];
        } | null;
        latestVideo: {
            mediaType: string;
            id: number;
            patientExaminationId: number | null;
            streamOptions: {
                type: string;
                url: string;
            }[];
        } | null;
        latestFrames: {
            videoId: number;
            frameNumber: number;
            category: string | null;
            selectionSource: string | null;
            segmentId: number | null;
            segmentLabel: string | null;
            streamUrl: string;
        }[];
    } | null, TimelineLatestPayload | {
        patient: {
            id: number;
            firstName: string | null;
            lastName: string | null;
            dob: string | null;
            isRealPerson: boolean;
            patientHash: string | null;
        };
        latestReport: {
            mediaType: string;
            id: number;
            patientExaminationId: number | null;
            anonymizedText: string | null;
            documentType: string | null;
            streamOptions: {
                type: string;
                url: string;
            }[];
        } | null;
        latestVideo: {
            mediaType: string;
            id: number;
            patientExaminationId: number | null;
            streamOptions: {
                type: string;
                url: string;
            }[];
        } | null;
        latestFrames: {
            videoId: number;
            frameNumber: number;
            category: string | null;
            selectionSource: string | null;
            segmentId: number | null;
            segmentLabel: string | null;
            streamUrl: string;
        }[];
    } | null>;
    mediaPreloadStatus: import("vue").Ref<"error" | "loading" | "idle" | "ready", "error" | "loading" | "idle" | "ready">;
    mediaPreloadError: import("vue").Ref<string | null, string | null>;
    hasActiveCase: import("vue").ComputedRef<boolean>;
    canUseLookupPages: import("vue").ComputedRef<boolean>;
    setLookupSession: (params: {
        lookupToken: string | null;
        patientExaminationId: number | null;
        status?: SessionStatus;
    }) => void;
    setCaseSelection: (params: {
        selectedPatientId?: number | null;
        selectedExaminationId?: number | null;
    }) => void;
    setSelectedRequirementSetIds: (ids: number[]) => void;
    setActiveReportId: (id: number | null) => void;
    setSessionStatus: (status: SessionStatus) => void;
    setTemplateSelection: (params: {
        moduleName?: string;
        templateName?: string | null;
    }) => void;
    setTemplateSectionDraft: (sectionName: string, patch: Partial<ReportTemplateSectionDraft>) => void;
    clearTemplateSectionDrafts: () => void;
    setIndications: (rows: ReportingIndicationRow[]) => void;
    setLookupSnapshot: (snapshot: ReportingLookupSnapshot | null) => void;
    patchLookupSnapshot: (partial: ReportingLookupSnapshot) => void;
    setLastRequirementGuidance: (guidance: ReportingRequirementGuidance) => void;
    setLastTemplateValidation: (validation: ReportingTemplateValidation) => void;
    noteFindingAdded: (findingId: number) => void;
    noteClassificationUpdated: (findingId: number, classificationId: number, choiceId: number | null) => void;
    setMediaPreloadLoading: () => void;
    setMediaPreload: (payload: TimelineLatestPayload | null) => void;
    setMediaPreloadError: (message: string) => void;
    clearMediaPreload: () => void;
    addIndicationRow: () => void;
    updateIndicationRow: (index: number, patch: Partial<ReportingIndicationRow>) => void;
    removeIndicationRow: (index: number) => void;
    resetForPatientSwitch: () => void;
    clearAll: () => void;
}, "hasActiveCase" | "canUseLookupPages">, Pick<{
    sessionStatus: import("vue").Ref<SessionStatus, SessionStatus>;
    lookupToken: import("vue").Ref<string | null, string | null>;
    patientExaminationId: import("vue").Ref<number | null, number | null>;
    selectedPatientId: import("vue").Ref<number | null, number | null>;
    selectedExaminationId: import("vue").Ref<number | null, number | null>;
    selectedRequirementSetIds: import("vue").Ref<number[], number[]>;
    activeReportId: import("vue").Ref<number | null, number | null>;
    selectedKbModule: import("vue").Ref<string, string>;
    selectedTemplateName: import("vue").Ref<string | null, string | null>;
    templateSectionDrafts: import("vue").Ref<Record<string, ReportTemplateSectionDraft>, Record<string, ReportTemplateSectionDraft>>;
    indications: import("vue").Ref<{
        examinationIndicationId: number | null;
        indicationChoiceId: number | null;
    }[], ReportingIndicationRow[] | {
        examinationIndicationId: number | null;
        indicationChoiceId: number | null;
    }[]>;
    lookupSnapshot: import("vue").Ref<{
        requirementStatus?: Record<string, boolean> | undefined;
        requirementSetStatus?: Record<string, boolean> | undefined;
        suggestedActions?: Record<string, any[]> | undefined;
        requirementsBySet?: Record<string, {
            id: number;
            name: string;
        }[]> | undefined;
        selectedRequirementSetIds?: number[] | undefined;
        candidateRequirementSetIds?: number[] | undefined;
        candidateRequirementSetConfidence?: number | null | undefined;
    } | null, ReportingLookupSnapshot | {
        requirementStatus?: Record<string, boolean> | undefined;
        requirementSetStatus?: Record<string, boolean> | undefined;
        suggestedActions?: Record<string, any[]> | undefined;
        requirementsBySet?: Record<string, {
            id: number;
            name: string;
        }[]> | undefined;
        selectedRequirementSetIds?: number[] | undefined;
        candidateRequirementSetIds?: number[] | undefined;
        candidateRequirementSetConfidence?: number | null | undefined;
    } | null>;
    lastRequirementGuidance: import("vue").Ref<ReportingRequirementGuidance, ReportingRequirementGuidance>;
    lastTemplateValidation: import("vue").Ref<{
        templateName: string;
        ok: boolean;
        evaluatedFindingsCount: number;
        findingsValidators: {
            name: string;
            ok: boolean;
            operator: string;
            finding: string;
            matchedOccurrences: number;
            triggeredOccurrences: number;
            missingRequiredClassifications: string[];
            issues: {
                code: string;
                level: "warning" | "error";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        examinationValidators: {
            name: string;
            ok: boolean;
            findingValidatorStatus: {
                name: string;
                ok: boolean;
            }[];
            examinationValidatorStatus: {
                name: string;
                ok: boolean;
            }[];
            issues: {
                code: string;
                level: "warning" | "error";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        issues: {
            code: string;
            level: "warning" | "error";
            message: string;
            validatorName?: string | undefined;
            validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
            details?: Record<string, unknown> | undefined;
        }[];
    } | null, ReportingTemplateValidation | {
        templateName: string;
        ok: boolean;
        evaluatedFindingsCount: number;
        findingsValidators: {
            name: string;
            ok: boolean;
            operator: string;
            finding: string;
            matchedOccurrences: number;
            triggeredOccurrences: number;
            missingRequiredClassifications: string[];
            issues: {
                code: string;
                level: "warning" | "error";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        examinationValidators: {
            name: string;
            ok: boolean;
            findingValidatorStatus: {
                name: string;
                ok: boolean;
            }[];
            examinationValidatorStatus: {
                name: string;
                ok: boolean;
            }[];
            issues: {
                code: string;
                level: "warning" | "error";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        issues: {
            code: string;
            level: "warning" | "error";
            message: string;
            validatorName?: string | undefined;
            validatorKind?: "findings_validator" | "examination_validator" | "template" | undefined;
            details?: Record<string, unknown> | undefined;
        }[];
    }>;
    findingsRevision: import("vue").Ref<number, number>;
    lastFindingsEvent: import("vue").Ref<{
        type: 'finding_added' | 'classification_updated';
        at: string;
        findingId: number;
        classificationId?: number | undefined;
        choiceId?: number | null | undefined;
    } | null, {
        type: 'finding_added' | 'classification_updated';
        at: string;
        findingId: number;
        classificationId?: number | undefined;
        choiceId?: number | null | undefined;
    } | {
        type: 'finding_added' | 'classification_updated';
        at: string;
        findingId: number;
        classificationId?: number | undefined;
        choiceId?: number | null | undefined;
    } | null>;
    mediaPreload: import("vue").Ref<{
        patient: {
            id: number;
            firstName: string | null;
            lastName: string | null;
            dob: string | null;
            isRealPerson: boolean;
            patientHash: string | null;
        };
        latestReport: {
            mediaType: string;
            id: number;
            patientExaminationId: number | null;
            anonymizedText: string | null;
            documentType: string | null;
            streamOptions: {
                type: string;
                url: string;
            }[];
        } | null;
        latestVideo: {
            mediaType: string;
            id: number;
            patientExaminationId: number | null;
            streamOptions: {
                type: string;
                url: string;
            }[];
        } | null;
        latestFrames: {
            videoId: number;
            frameNumber: number;
            category: string | null;
            selectionSource: string | null;
            segmentId: number | null;
            segmentLabel: string | null;
            streamUrl: string;
        }[];
    } | null, TimelineLatestPayload | {
        patient: {
            id: number;
            firstName: string | null;
            lastName: string | null;
            dob: string | null;
            isRealPerson: boolean;
            patientHash: string | null;
        };
        latestReport: {
            mediaType: string;
            id: number;
            patientExaminationId: number | null;
            anonymizedText: string | null;
            documentType: string | null;
            streamOptions: {
                type: string;
                url: string;
            }[];
        } | null;
        latestVideo: {
            mediaType: string;
            id: number;
            patientExaminationId: number | null;
            streamOptions: {
                type: string;
                url: string;
            }[];
        } | null;
        latestFrames: {
            videoId: number;
            frameNumber: number;
            category: string | null;
            selectionSource: string | null;
            segmentId: number | null;
            segmentLabel: string | null;
            streamUrl: string;
        }[];
    } | null>;
    mediaPreloadStatus: import("vue").Ref<"error" | "loading" | "idle" | "ready", "error" | "loading" | "idle" | "ready">;
    mediaPreloadError: import("vue").Ref<string | null, string | null>;
    hasActiveCase: import("vue").ComputedRef<boolean>;
    canUseLookupPages: import("vue").ComputedRef<boolean>;
    setLookupSession: (params: {
        lookupToken: string | null;
        patientExaminationId: number | null;
        status?: SessionStatus;
    }) => void;
    setCaseSelection: (params: {
        selectedPatientId?: number | null;
        selectedExaminationId?: number | null;
    }) => void;
    setSelectedRequirementSetIds: (ids: number[]) => void;
    setActiveReportId: (id: number | null) => void;
    setSessionStatus: (status: SessionStatus) => void;
    setTemplateSelection: (params: {
        moduleName?: string;
        templateName?: string | null;
    }) => void;
    setTemplateSectionDraft: (sectionName: string, patch: Partial<ReportTemplateSectionDraft>) => void;
    clearTemplateSectionDrafts: () => void;
    setIndications: (rows: ReportingIndicationRow[]) => void;
    setLookupSnapshot: (snapshot: ReportingLookupSnapshot | null) => void;
    patchLookupSnapshot: (partial: ReportingLookupSnapshot) => void;
    setLastRequirementGuidance: (guidance: ReportingRequirementGuidance) => void;
    setLastTemplateValidation: (validation: ReportingTemplateValidation) => void;
    noteFindingAdded: (findingId: number) => void;
    noteClassificationUpdated: (findingId: number, classificationId: number, choiceId: number | null) => void;
    setMediaPreloadLoading: () => void;
    setMediaPreload: (payload: TimelineLatestPayload | null) => void;
    setMediaPreloadError: (message: string) => void;
    clearMediaPreload: () => void;
    addIndicationRow: () => void;
    updateIndicationRow: (index: number, patch: Partial<ReportingIndicationRow>) => void;
    removeIndicationRow: (index: number) => void;
    resetForPatientSwitch: () => void;
    clearAll: () => void;
}, "setLookupSession" | "setCaseSelection" | "setSelectedRequirementSetIds" | "setActiveReportId" | "setSessionStatus" | "setTemplateSelection" | "setTemplateSectionDraft" | "clearTemplateSectionDrafts" | "setIndications" | "setLookupSnapshot" | "patchLookupSnapshot" | "setLastRequirementGuidance" | "setLastTemplateValidation" | "noteFindingAdded" | "noteClassificationUpdated" | "setMediaPreloadLoading" | "setMediaPreload" | "setMediaPreloadError" | "clearMediaPreload" | "addIndicationRow" | "updateIndicationRow" | "removeIndicationRow" | "resetForPatientSwitch" | "clearAll">>;
export {};
