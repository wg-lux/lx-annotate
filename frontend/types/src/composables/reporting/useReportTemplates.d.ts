import type { ReportTemplatePayload, ReportTemplateSectionBlock, ReportTemplateValidatorDescriptor } from '@/types/reportTemplate';
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
            examinationValidators: {
                kind: "examination";
                name: string;
                findingValidators: string[];
                examinationValidators: string[];
                summary: string;
                relatedSections: string[];
                relatedFindings: string[];
            }[];
            findingsValidators: {
                kind: "finding";
                name: string;
                finding: string;
                operator: import("@/types/reportTemplate").FindingsValidatorOperator;
                query: {
                    finding: string | null;
                    operator: import("@/types/reportTemplate").FindingsValidatorOperator | null;
                    params: Record<string, unknown>;
                    condition: {
                        any: {
                            classification: string;
                            comparator: import("@/types/reportTemplate").FindingsValidatorComparator;
                            value?: unknown;
                            values?: unknown[] | undefined;
                        }[];
                        all: {
                            classification: string;
                            comparator: import("@/types/reportTemplate").FindingsValidatorComparator;
                            value?: unknown;
                            values?: unknown[] | undefined;
                        }[];
                        thenRequires: {
                            classification: string;
                        }[];
                    } | null;
                };
                summary: string;
                relatedSections: string[];
                relatedFindings: string[];
                requiredClassifications: string[];
            }[];
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
            examinationValidators: {
                kind: "examination";
                name: string;
                findingValidators: string[];
                examinationValidators: string[];
                summary: string;
                relatedSections: string[];
                relatedFindings: string[];
            }[];
            findingsValidators: {
                kind: "finding";
                name: string;
                finding: string;
                operator: import("@/types/reportTemplate").FindingsValidatorOperator;
                query: {
                    finding: string | null;
                    operator: import("@/types/reportTemplate").FindingsValidatorOperator | null;
                    params: Record<string, unknown>;
                    condition: {
                        any: {
                            classification: string;
                            comparator: import("@/types/reportTemplate").FindingsValidatorComparator;
                            value?: unknown;
                            values?: unknown[] | undefined;
                        }[];
                        all: {
                            classification: string;
                            comparator: import("@/types/reportTemplate").FindingsValidatorComparator;
                            value?: unknown;
                            values?: unknown[] | undefined;
                        }[];
                        thenRequires: {
                            classification: string;
                        }[];
                    } | null;
                };
                summary: string;
                relatedSections: string[];
                relatedFindings: string[];
                requiredClassifications: string[];
            }[];
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
            examinationValidators: {
                kind: "examination";
                name: string;
                findingValidators: string[];
                examinationValidators: string[];
                summary: string;
                relatedSections: string[];
                relatedFindings: string[];
            }[];
            findingsValidators: {
                kind: "finding";
                name: string;
                finding: string;
                operator: import("@/types/reportTemplate").FindingsValidatorOperator;
                query: {
                    finding: string | null;
                    operator: import("@/types/reportTemplate").FindingsValidatorOperator | null;
                    params: Record<string, unknown>;
                    condition: {
                        any: {
                            classification: string;
                            comparator: import("@/types/reportTemplate").FindingsValidatorComparator;
                            value?: unknown;
                            values?: unknown[] | undefined;
                        }[];
                        all: {
                            classification: string;
                            comparator: import("@/types/reportTemplate").FindingsValidatorComparator;
                            value?: unknown;
                            values?: unknown[] | undefined;
                        }[];
                        thenRequires: {
                            classification: string;
                        }[];
                    } | null;
                };
                summary: string;
                relatedSections: string[];
                relatedFindings: string[];
                requiredClassifications: string[];
            }[];
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
            examinationValidators: {
                kind: "examination";
                name: string;
                findingValidators: string[];
                examinationValidators: string[];
                summary: string;
                relatedSections: string[];
                relatedFindings: string[];
            }[];
            findingsValidators: {
                kind: "finding";
                name: string;
                finding: string;
                operator: import("@/types/reportTemplate").FindingsValidatorOperator;
                query: {
                    finding: string | null;
                    operator: import("@/types/reportTemplate").FindingsValidatorOperator | null;
                    params: Record<string, unknown>;
                    condition: {
                        any: {
                            classification: string;
                            comparator: import("@/types/reportTemplate").FindingsValidatorComparator;
                            value?: unknown;
                            values?: unknown[] | undefined;
                        }[];
                        all: {
                            classification: string;
                            comparator: import("@/types/reportTemplate").FindingsValidatorComparator;
                            value?: unknown;
                            values?: unknown[] | undefined;
                        }[];
                        thenRequires: {
                            classification: string;
                        }[];
                    } | null;
                };
                summary: string;
                relatedSections: string[];
                relatedFindings: string[];
                requiredClassifications: string[];
            }[];
        };
    } | null>;
    sectionBlocks: import("vue").ComputedRef<ReportTemplateSectionBlock[]>;
    validatorDescriptors: import("vue").ComputedRef<ReportTemplateValidatorDescriptor[]>;
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
