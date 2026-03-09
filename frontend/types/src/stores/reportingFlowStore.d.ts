import type { ReportTemplateSectionDraft } from '@/types/reportTemplate';
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
    noteFindingAdded: (findingId: number) => void;
    noteClassificationUpdated: (findingId: number, classificationId: number, choiceId: number | null) => void;
    addIndicationRow: () => void;
    updateIndicationRow: (index: number, patch: Partial<ReportingIndicationRow>) => void;
    removeIndicationRow: (index: number) => void;
    resetForPatientSwitch: () => void;
    clearAll: () => void;
}, "indications" | "selectedPatientId" | "selectedExaminationId" | "lookupToken" | "patientExaminationId" | "selectedRequirementSetIds" | "activeReportId" | "selectedKbModule" | "selectedTemplateName" | "templateSectionDrafts" | "sessionStatus" | "lookupSnapshot" | "lastRequirementGuidance" | "findingsRevision" | "lastFindingsEvent">, Pick<{
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
    noteFindingAdded: (findingId: number) => void;
    noteClassificationUpdated: (findingId: number, classificationId: number, choiceId: number | null) => void;
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
    noteFindingAdded: (findingId: number) => void;
    noteClassificationUpdated: (findingId: number, classificationId: number, choiceId: number | null) => void;
    addIndicationRow: () => void;
    updateIndicationRow: (index: number, patch: Partial<ReportingIndicationRow>) => void;
    removeIndicationRow: (index: number) => void;
    resetForPatientSwitch: () => void;
    clearAll: () => void;
}, "setLookupSession" | "setCaseSelection" | "setSelectedRequirementSetIds" | "setActiveReportId" | "setSessionStatus" | "setTemplateSelection" | "setTemplateSectionDraft" | "clearTemplateSectionDrafts" | "setIndications" | "setLookupSnapshot" | "patchLookupSnapshot" | "setLastRequirementGuidance" | "noteFindingAdded" | "noteClassificationUpdated" | "addIndicationRow" | "updateIndicationRow" | "removeIndicationRow" | "resetForPatientSwitch" | "clearAll">>;
export {};
