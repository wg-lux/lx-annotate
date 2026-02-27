import type { ReportTemplatePayload, ReportTemplateSectionBlock } from '@/types/reportTemplate';
export declare function useReportTemplates(params?: {
    initialModuleName?: string;
    initialTemplateName?: string | null;
}): {
    moduleName: import("vue").Ref<string, string>;
    selectedTemplateName: import("vue").Ref<string | null, string | null>;
    templateOptions: import("vue").Ref<{
        name: string;
        examination: string;
        reportSections: {
            name: string;
            position: number;
            types: string[];
            findings: {
                finding: string;
                required: boolean;
                multipleAllowed: boolean;
                classifications: {
                    classification: string;
                    required: boolean;
                }[];
            }[];
        }[];
        validators: {
            examinationValidators: (string | Record<string, unknown>)[];
            findingsValidators: (string | Record<string, unknown>)[];
        };
    }[], ReportTemplatePayload[] | {
        name: string;
        examination: string;
        reportSections: {
            name: string;
            position: number;
            types: string[];
            findings: {
                finding: string;
                required: boolean;
                multipleAllowed: boolean;
                classifications: {
                    classification: string;
                    required: boolean;
                }[];
            }[];
        }[];
        validators: {
            examinationValidators: (string | Record<string, unknown>)[];
            findingsValidators: (string | Record<string, unknown>)[];
        };
    }[]>;
    selectedTemplate: import("vue").Ref<{
        name: string;
        examination: string;
        reportSections: {
            name: string;
            position: number;
            types: string[];
            findings: {
                finding: string;
                required: boolean;
                multipleAllowed: boolean;
                classifications: {
                    classification: string;
                    required: boolean;
                }[];
            }[];
        }[];
        validators: {
            examinationValidators: (string | Record<string, unknown>)[];
            findingsValidators: (string | Record<string, unknown>)[];
        };
    } | null, ReportTemplatePayload | {
        name: string;
        examination: string;
        reportSections: {
            name: string;
            position: number;
            types: string[];
            findings: {
                finding: string;
                required: boolean;
                multipleAllowed: boolean;
                classifications: {
                    classification: string;
                    required: boolean;
                }[];
            }[];
        }[];
        validators: {
            examinationValidators: (string | Record<string, unknown>)[];
            findingsValidators: (string | Record<string, unknown>)[];
        };
    } | null>;
    sectionBlocks: import("vue").ComputedRef<ReportTemplateSectionBlock[]>;
    loading: import("vue").Ref<boolean, boolean>;
    errorMessage: import("vue").Ref<string | null, string | null>;
    clearError: () => void;
    setModuleName: (next: string) => void;
    fetchTemplateByName: (templateName: string, opts?: {
        setAsSelected?: boolean;
        moduleOverride?: string;
    }) => Promise<ReportTemplatePayload | null>;
    fetchTemplatesByExamination: (examinationName: string | null | undefined, opts?: {
        moduleOverride?: string;
    }) => Promise<ReportTemplatePayload[]>;
    selectTemplateByName: (name: string | null) => Promise<void>;
};
