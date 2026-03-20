import type { ReportTemplateRuntimeDescriptorInput, ReportTemplateRuntimePayload, ReportTemplateSectionDraft } from '@/types/reportTemplate';
import type { ReportTemplateRuntimeValidationResult } from '@/types/reportTemplate';
import type { TimelineLatestPayload } from '@/api/reportingTimelineApi';
type SessionStatus = 'idle' | 'active' | 'expired' | 'restarting';
type ReportingRequirementSetLite = {
    id: number;
    name: string;
    type: string;
};
export type ReportingLookupSnapshot = {
    requirementStatus?: Record<string, boolean>;
    requirementSetStatus?: Record<string, boolean>;
    suggestedActions?: Record<string, any[]>;
    requirementsBySet?: Record<string, Array<{
        id: number;
        name: string;
    }>>;
    requirementSets?: ReportingRequirementSetLite[];
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
export type ReportingRuntimeDraft = {
    draftId: string;
    patientExaminationId: number;
    moduleName: string;
    templateName: string | null;
    payload: ReportTemplateRuntimePayload;
    hydratedFrom: 'session_storage' | 'backend_context' | 'draft_api';
    updatedAt: string;
};
export declare const useReportingFlowStore: import("pinia").StoreDefinition<"reportingFlow", Pick<{
    authSubject: import("vue").Ref<string | null, string | null>;
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
    runtimeDraftsByPatientExaminationId: import("vue").Ref<Record<string, ReportingRuntimeDraft>, Record<string, ReportingRuntimeDraft>>;
    currentRuntimeDraft: import("vue").ComputedRef<ReportingRuntimeDraft | null>;
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
        requirementSets?: {
            id: number;
            name: string;
            type: string;
        }[] | undefined;
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
        requirementSets?: {
            id: number;
            name: string;
            type: string;
        }[] | undefined;
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
                level: "error" | "warning";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
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
                level: "error" | "warning";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        issues: {
            code: string;
            level: "error" | "warning";
            message: string;
            validatorName?: string | undefined;
            validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
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
                level: "error" | "warning";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
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
                level: "error" | "warning";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        issues: {
            code: string;
            level: "error" | "warning";
            message: string;
            validatorName?: string | undefined;
            validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
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
    mediaPreloadStatus: import("vue").Ref<"loading" | "error" | "ready" | "idle", "loading" | "error" | "ready" | "idle">;
    mediaPreloadError: import("vue").Ref<string | null, string | null>;
    draftPersistenceStatus: import("vue").Ref<"error" | "idle" | "saving" | "saved", "error" | "idle" | "saving" | "saved">;
    draftPersistenceError: import("vue").Ref<string | null, string | null>;
    lastPersistedDraftAt: import("vue").Ref<string | null, string | null>;
    hasUnpersistedDraftChanges: import("vue").ComputedRef<boolean>;
    savingFinalReport: import("vue").Ref<boolean, boolean>;
    hasActiveCase: import("vue").ComputedRef<boolean>;
    hasDraftContent: import("vue").ComputedRef<boolean>;
    canUseLookupPages: import("vue").ComputedRef<boolean>;
    setLookupSession: (params: {
        lookupToken: string | null;
        patientExaminationId: number | null;
        status?: SessionStatus;
    }) => void;
    setPatientExaminationContext: (params: {
        patientExaminationId: number | null;
        selectedPatientId?: number | null;
        selectedExaminationId?: number | null;
        preserveTemplateSelection?: boolean;
    }) => void;
    setRuntimeDraft: (draft: ReportingRuntimeDraft) => void;
    markDraftPersistenceHydrated: (updatedAt: string | null) => void;
    persistCurrentRuntimeDraft: () => Promise<void>;
    flushDraftAutosave: () => Promise<void>;
    setSavingFinalReport: (value: boolean) => void;
    clearRuntimeDraft: (targetPatientExaminationId?: number | null) => void;
    addFinding: (params: {
        findingName: string;
    }) => string | null;
    removeFinding: (findingLocalId: string) => void;
    updateClassificationValue: (params: {
        findingLocalId: string;
        classificationName: string;
        classificationChoice: string | null;
        descriptors?: ReportTemplateRuntimeDescriptorInput[];
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
    bindAuthSubject: (subject: string | null | undefined) => void;
    setIndications: (rows: ReportingIndicationRow[]) => void;
    setLookupSnapshot: (snapshot: ReportingLookupSnapshot | null) => void;
    patchLookupSnapshot: (partial: Partial<ReportingLookupSnapshot>) => void;
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
}, "lookupToken" | "patientExaminationId" | "selectedPatientId" | "selectedExaminationId" | "selectedRequirementSetIds" | "activeReportId" | "indications" | "selectedKbModule" | "selectedTemplateName" | "templateSectionDrafts" | "runtimeDraftsByPatientExaminationId" | "authSubject" | "sessionStatus" | "lookupSnapshot" | "lastRequirementGuidance" | "lastTemplateValidation" | "findingsRevision" | "lastFindingsEvent" | "mediaPreload" | "mediaPreloadStatus" | "mediaPreloadError" | "draftPersistenceStatus" | "draftPersistenceError" | "lastPersistedDraftAt" | "savingFinalReport">, Pick<{
    authSubject: import("vue").Ref<string | null, string | null>;
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
    runtimeDraftsByPatientExaminationId: import("vue").Ref<Record<string, ReportingRuntimeDraft>, Record<string, ReportingRuntimeDraft>>;
    currentRuntimeDraft: import("vue").ComputedRef<ReportingRuntimeDraft | null>;
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
        requirementSets?: {
            id: number;
            name: string;
            type: string;
        }[] | undefined;
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
        requirementSets?: {
            id: number;
            name: string;
            type: string;
        }[] | undefined;
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
                level: "error" | "warning";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
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
                level: "error" | "warning";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        issues: {
            code: string;
            level: "error" | "warning";
            message: string;
            validatorName?: string | undefined;
            validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
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
                level: "error" | "warning";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
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
                level: "error" | "warning";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        issues: {
            code: string;
            level: "error" | "warning";
            message: string;
            validatorName?: string | undefined;
            validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
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
    mediaPreloadStatus: import("vue").Ref<"loading" | "error" | "ready" | "idle", "loading" | "error" | "ready" | "idle">;
    mediaPreloadError: import("vue").Ref<string | null, string | null>;
    draftPersistenceStatus: import("vue").Ref<"error" | "idle" | "saving" | "saved", "error" | "idle" | "saving" | "saved">;
    draftPersistenceError: import("vue").Ref<string | null, string | null>;
    lastPersistedDraftAt: import("vue").Ref<string | null, string | null>;
    hasUnpersistedDraftChanges: import("vue").ComputedRef<boolean>;
    savingFinalReport: import("vue").Ref<boolean, boolean>;
    hasActiveCase: import("vue").ComputedRef<boolean>;
    hasDraftContent: import("vue").ComputedRef<boolean>;
    canUseLookupPages: import("vue").ComputedRef<boolean>;
    setLookupSession: (params: {
        lookupToken: string | null;
        patientExaminationId: number | null;
        status?: SessionStatus;
    }) => void;
    setPatientExaminationContext: (params: {
        patientExaminationId: number | null;
        selectedPatientId?: number | null;
        selectedExaminationId?: number | null;
        preserveTemplateSelection?: boolean;
    }) => void;
    setRuntimeDraft: (draft: ReportingRuntimeDraft) => void;
    markDraftPersistenceHydrated: (updatedAt: string | null) => void;
    persistCurrentRuntimeDraft: () => Promise<void>;
    flushDraftAutosave: () => Promise<void>;
    setSavingFinalReport: (value: boolean) => void;
    clearRuntimeDraft: (targetPatientExaminationId?: number | null) => void;
    addFinding: (params: {
        findingName: string;
    }) => string | null;
    removeFinding: (findingLocalId: string) => void;
    updateClassificationValue: (params: {
        findingLocalId: string;
        classificationName: string;
        classificationChoice: string | null;
        descriptors?: ReportTemplateRuntimeDescriptorInput[];
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
    bindAuthSubject: (subject: string | null | undefined) => void;
    setIndications: (rows: ReportingIndicationRow[]) => void;
    setLookupSnapshot: (snapshot: ReportingLookupSnapshot | null) => void;
    patchLookupSnapshot: (partial: Partial<ReportingLookupSnapshot>) => void;
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
}, "currentRuntimeDraft" | "hasUnpersistedDraftChanges" | "hasActiveCase" | "hasDraftContent" | "canUseLookupPages">, Pick<{
    authSubject: import("vue").Ref<string | null, string | null>;
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
    runtimeDraftsByPatientExaminationId: import("vue").Ref<Record<string, ReportingRuntimeDraft>, Record<string, ReportingRuntimeDraft>>;
    currentRuntimeDraft: import("vue").ComputedRef<ReportingRuntimeDraft | null>;
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
        requirementSets?: {
            id: number;
            name: string;
            type: string;
        }[] | undefined;
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
        requirementSets?: {
            id: number;
            name: string;
            type: string;
        }[] | undefined;
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
                level: "error" | "warning";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
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
                level: "error" | "warning";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        issues: {
            code: string;
            level: "error" | "warning";
            message: string;
            validatorName?: string | undefined;
            validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
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
                level: "error" | "warning";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
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
                level: "error" | "warning";
                message: string;
                validatorName?: string | undefined;
                validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
                details?: Record<string, unknown> | undefined;
            }[];
        }[];
        issues: {
            code: string;
            level: "error" | "warning";
            message: string;
            validatorName?: string | undefined;
            validatorKind?: "template" | "findings_validator" | "examination_validator" | undefined;
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
    mediaPreloadStatus: import("vue").Ref<"loading" | "error" | "ready" | "idle", "loading" | "error" | "ready" | "idle">;
    mediaPreloadError: import("vue").Ref<string | null, string | null>;
    draftPersistenceStatus: import("vue").Ref<"error" | "idle" | "saving" | "saved", "error" | "idle" | "saving" | "saved">;
    draftPersistenceError: import("vue").Ref<string | null, string | null>;
    lastPersistedDraftAt: import("vue").Ref<string | null, string | null>;
    hasUnpersistedDraftChanges: import("vue").ComputedRef<boolean>;
    savingFinalReport: import("vue").Ref<boolean, boolean>;
    hasActiveCase: import("vue").ComputedRef<boolean>;
    hasDraftContent: import("vue").ComputedRef<boolean>;
    canUseLookupPages: import("vue").ComputedRef<boolean>;
    setLookupSession: (params: {
        lookupToken: string | null;
        patientExaminationId: number | null;
        status?: SessionStatus;
    }) => void;
    setPatientExaminationContext: (params: {
        patientExaminationId: number | null;
        selectedPatientId?: number | null;
        selectedExaminationId?: number | null;
        preserveTemplateSelection?: boolean;
    }) => void;
    setRuntimeDraft: (draft: ReportingRuntimeDraft) => void;
    markDraftPersistenceHydrated: (updatedAt: string | null) => void;
    persistCurrentRuntimeDraft: () => Promise<void>;
    flushDraftAutosave: () => Promise<void>;
    setSavingFinalReport: (value: boolean) => void;
    clearRuntimeDraft: (targetPatientExaminationId?: number | null) => void;
    addFinding: (params: {
        findingName: string;
    }) => string | null;
    removeFinding: (findingLocalId: string) => void;
    updateClassificationValue: (params: {
        findingLocalId: string;
        classificationName: string;
        classificationChoice: string | null;
        descriptors?: ReportTemplateRuntimeDescriptorInput[];
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
    bindAuthSubject: (subject: string | null | undefined) => void;
    setIndications: (rows: ReportingIndicationRow[]) => void;
    setLookupSnapshot: (snapshot: ReportingLookupSnapshot | null) => void;
    patchLookupSnapshot: (partial: Partial<ReportingLookupSnapshot>) => void;
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
}, "setLookupSession" | "setPatientExaminationContext" | "setRuntimeDraft" | "markDraftPersistenceHydrated" | "persistCurrentRuntimeDraft" | "flushDraftAutosave" | "setSavingFinalReport" | "clearRuntimeDraft" | "addFinding" | "removeFinding" | "updateClassificationValue" | "setCaseSelection" | "setSelectedRequirementSetIds" | "setActiveReportId" | "setSessionStatus" | "setTemplateSelection" | "setTemplateSectionDraft" | "clearTemplateSectionDrafts" | "bindAuthSubject" | "setIndications" | "setLookupSnapshot" | "patchLookupSnapshot" | "setLastRequirementGuidance" | "setLastTemplateValidation" | "noteFindingAdded" | "noteClassificationUpdated" | "setMediaPreloadLoading" | "setMediaPreload" | "setMediaPreloadError" | "clearMediaPreload" | "addIndicationRow" | "updateIndicationRow" | "removeIndicationRow" | "resetForPatientSwitch" | "clearAll">>;
export {};
