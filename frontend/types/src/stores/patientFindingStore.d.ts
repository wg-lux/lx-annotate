import type { Finding, FindingClassification, FindingClassificationChoice } from "@/stores/findingStore";
import type { Patient } from "@/stores/patientStore";
interface PatientFinding {
    id: number;
    examination: string;
    createdAt: number;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
    finding: Finding;
    patient: Patient;
    classifications?: PatientFindingClassification[];
}
interface PatientFindingClassification {
    id: number;
    finding: number;
    classification: FindingClassification;
    classification_choice: FindingClassificationChoice;
    is_active: boolean;
    subcategories?: Record<string, any>;
    numerical_descriptors?: Record<string, any>;
}
declare const usePatientFindingStore: import("pinia").StoreDefinition<"patientFinding", Pick<{
    patientFindings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly examination: string;
        readonly createdAt: number;
        readonly updatedAt: string;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: {
            readonly id: number;
            readonly name: string;
            readonly nameDe?: string | undefined;
            readonly description: string;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
        };
        readonly patient: {
            readonly id?: number | undefined;
            readonly firstName: string;
            readonly lastName: string;
            readonly dob?: string | null | undefined;
            readonly gender?: string | null | undefined;
            readonly center?: string | null | undefined;
            readonly email?: string | undefined;
            readonly phone?: string | undefined;
            readonly patientHash?: string | null | undefined;
            readonly comments?: string | undefined;
            readonly isRealPerson?: boolean | undefined;
            readonly pseudonymFirstName?: string | null | undefined;
            readonly pseudonymLastName?: string | null | undefined;
            readonly sensitiveMetaId?: number | null | undefined;
            readonly age?: number | null | undefined;
            readonly createdAt?: string | undefined;
            readonly updatedAt?: string | undefined;
        };
        readonly classifications?: readonly {
            readonly id: number;
            readonly finding: number;
            readonly classification: {
                readonly id: number;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
            };
            readonly classification_choice: {
                readonly id: number;
                readonly name: string;
            };
            readonly is_active: boolean;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[] | undefined;
    }[], readonly {
        readonly id: number;
        readonly examination: string;
        readonly createdAt: number;
        readonly updatedAt: string;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: {
            readonly id: number;
            readonly name: string;
            readonly nameDe?: string | undefined;
            readonly description: string;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
        };
        readonly patient: {
            readonly id?: number | undefined;
            readonly firstName: string;
            readonly lastName: string;
            readonly dob?: string | null | undefined;
            readonly gender?: string | null | undefined;
            readonly center?: string | null | undefined;
            readonly email?: string | undefined;
            readonly phone?: string | undefined;
            readonly patientHash?: string | null | undefined;
            readonly comments?: string | undefined;
            readonly isRealPerson?: boolean | undefined;
            readonly pseudonymFirstName?: string | null | undefined;
            readonly pseudonymLastName?: string | null | undefined;
            readonly sensitiveMetaId?: number | null | undefined;
            readonly age?: number | null | undefined;
            readonly createdAt?: string | undefined;
            readonly updatedAt?: string | undefined;
        };
        readonly classifications?: readonly {
            readonly id: number;
            readonly finding: number;
            readonly classification: {
                readonly id: number;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
            };
            readonly classification_choice: {
                readonly id: number;
                readonly name: string;
            };
            readonly is_active: boolean;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[] | undefined;
    }[]>>;
    patientFindingsByCurrentPatient: import("vue").ComputedRef<{
        id: number;
        examination: string;
        createdAt: number;
        updatedAt: string;
        createdBy?: string | undefined;
        updatedBy?: string | undefined;
        finding: {
            id: number;
            name: string;
            nameDe?: string | undefined;
            description: string;
            examinations: string[];
            PatientExaminationId?: number | undefined;
            FindingClassifications: {
                id: number;
                name?: string | undefined;
                description?: string | undefined;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            findingTypes: string[];
            findingInterventions: string[];
        };
        patient: {
            id?: number | undefined;
            firstName: string;
            lastName: string;
            dob?: string | null | undefined;
            gender?: string | null | undefined;
            center?: string | null | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            patientHash?: string | null | undefined;
            comments?: string | undefined;
            isRealPerson?: boolean | undefined;
            pseudonymFirstName?: string | null | undefined;
            pseudonymLastName?: string | null | undefined;
            sensitiveMetaId?: number | null | undefined;
            age?: number | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
        };
        classifications?: {
            id: number;
            finding: number;
            classification: {
                id: number;
                name?: string | undefined;
                description?: string | undefined;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
            };
            classification_choice: {
                id: number;
                name: string;
            };
            is_active: boolean;
            subcategories?: Record<string, any> | undefined;
            numerical_descriptors?: Record<string, any> | undefined;
        }[] | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    currentPatientExaminationId: Readonly<import("vue").Ref<number | null, number | null>>;
    setCurrentPatientExaminationId: (id: number | null) => void;
    fetchPatientFindings: (patientExaminationId: number) => Promise<void>;
    createPatientFinding: (patientFindingData: {
        patientExamination: number;
        finding: number;
        classifications?: Array<{
            classification: number;
            choice: number;
        }>;
    }) => Promise<PatientFinding>;
    updatePatientFinding: (id: number, updateData: Partial<PatientFinding>) => Promise<PatientFinding>;
    deletePatientFinding: (id: number) => Promise<void>;
}, "loading" | "error" | "patientFindings" | "currentPatientExaminationId">, Pick<{
    patientFindings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly examination: string;
        readonly createdAt: number;
        readonly updatedAt: string;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: {
            readonly id: number;
            readonly name: string;
            readonly nameDe?: string | undefined;
            readonly description: string;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
        };
        readonly patient: {
            readonly id?: number | undefined;
            readonly firstName: string;
            readonly lastName: string;
            readonly dob?: string | null | undefined;
            readonly gender?: string | null | undefined;
            readonly center?: string | null | undefined;
            readonly email?: string | undefined;
            readonly phone?: string | undefined;
            readonly patientHash?: string | null | undefined;
            readonly comments?: string | undefined;
            readonly isRealPerson?: boolean | undefined;
            readonly pseudonymFirstName?: string | null | undefined;
            readonly pseudonymLastName?: string | null | undefined;
            readonly sensitiveMetaId?: number | null | undefined;
            readonly age?: number | null | undefined;
            readonly createdAt?: string | undefined;
            readonly updatedAt?: string | undefined;
        };
        readonly classifications?: readonly {
            readonly id: number;
            readonly finding: number;
            readonly classification: {
                readonly id: number;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
            };
            readonly classification_choice: {
                readonly id: number;
                readonly name: string;
            };
            readonly is_active: boolean;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[] | undefined;
    }[], readonly {
        readonly id: number;
        readonly examination: string;
        readonly createdAt: number;
        readonly updatedAt: string;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: {
            readonly id: number;
            readonly name: string;
            readonly nameDe?: string | undefined;
            readonly description: string;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
        };
        readonly patient: {
            readonly id?: number | undefined;
            readonly firstName: string;
            readonly lastName: string;
            readonly dob?: string | null | undefined;
            readonly gender?: string | null | undefined;
            readonly center?: string | null | undefined;
            readonly email?: string | undefined;
            readonly phone?: string | undefined;
            readonly patientHash?: string | null | undefined;
            readonly comments?: string | undefined;
            readonly isRealPerson?: boolean | undefined;
            readonly pseudonymFirstName?: string | null | undefined;
            readonly pseudonymLastName?: string | null | undefined;
            readonly sensitiveMetaId?: number | null | undefined;
            readonly age?: number | null | undefined;
            readonly createdAt?: string | undefined;
            readonly updatedAt?: string | undefined;
        };
        readonly classifications?: readonly {
            readonly id: number;
            readonly finding: number;
            readonly classification: {
                readonly id: number;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
            };
            readonly classification_choice: {
                readonly id: number;
                readonly name: string;
            };
            readonly is_active: boolean;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[] | undefined;
    }[]>>;
    patientFindingsByCurrentPatient: import("vue").ComputedRef<{
        id: number;
        examination: string;
        createdAt: number;
        updatedAt: string;
        createdBy?: string | undefined;
        updatedBy?: string | undefined;
        finding: {
            id: number;
            name: string;
            nameDe?: string | undefined;
            description: string;
            examinations: string[];
            PatientExaminationId?: number | undefined;
            FindingClassifications: {
                id: number;
                name?: string | undefined;
                description?: string | undefined;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            findingTypes: string[];
            findingInterventions: string[];
        };
        patient: {
            id?: number | undefined;
            firstName: string;
            lastName: string;
            dob?: string | null | undefined;
            gender?: string | null | undefined;
            center?: string | null | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            patientHash?: string | null | undefined;
            comments?: string | undefined;
            isRealPerson?: boolean | undefined;
            pseudonymFirstName?: string | null | undefined;
            pseudonymLastName?: string | null | undefined;
            sensitiveMetaId?: number | null | undefined;
            age?: number | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
        };
        classifications?: {
            id: number;
            finding: number;
            classification: {
                id: number;
                name?: string | undefined;
                description?: string | undefined;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
            };
            classification_choice: {
                id: number;
                name: string;
            };
            is_active: boolean;
            subcategories?: Record<string, any> | undefined;
            numerical_descriptors?: Record<string, any> | undefined;
        }[] | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    currentPatientExaminationId: Readonly<import("vue").Ref<number | null, number | null>>;
    setCurrentPatientExaminationId: (id: number | null) => void;
    fetchPatientFindings: (patientExaminationId: number) => Promise<void>;
    createPatientFinding: (patientFindingData: {
        patientExamination: number;
        finding: number;
        classifications?: Array<{
            classification: number;
            choice: number;
        }>;
    }) => Promise<PatientFinding>;
    updatePatientFinding: (id: number, updateData: Partial<PatientFinding>) => Promise<PatientFinding>;
    deletePatientFinding: (id: number) => Promise<void>;
}, "patientFindingsByCurrentPatient">, Pick<{
    patientFindings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly examination: string;
        readonly createdAt: number;
        readonly updatedAt: string;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: {
            readonly id: number;
            readonly name: string;
            readonly nameDe?: string | undefined;
            readonly description: string;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
        };
        readonly patient: {
            readonly id?: number | undefined;
            readonly firstName: string;
            readonly lastName: string;
            readonly dob?: string | null | undefined;
            readonly gender?: string | null | undefined;
            readonly center?: string | null | undefined;
            readonly email?: string | undefined;
            readonly phone?: string | undefined;
            readonly patientHash?: string | null | undefined;
            readonly comments?: string | undefined;
            readonly isRealPerson?: boolean | undefined;
            readonly pseudonymFirstName?: string | null | undefined;
            readonly pseudonymLastName?: string | null | undefined;
            readonly sensitiveMetaId?: number | null | undefined;
            readonly age?: number | null | undefined;
            readonly createdAt?: string | undefined;
            readonly updatedAt?: string | undefined;
        };
        readonly classifications?: readonly {
            readonly id: number;
            readonly finding: number;
            readonly classification: {
                readonly id: number;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
            };
            readonly classification_choice: {
                readonly id: number;
                readonly name: string;
            };
            readonly is_active: boolean;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[] | undefined;
    }[], readonly {
        readonly id: number;
        readonly examination: string;
        readonly createdAt: number;
        readonly updatedAt: string;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: {
            readonly id: number;
            readonly name: string;
            readonly nameDe?: string | undefined;
            readonly description: string;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
        };
        readonly patient: {
            readonly id?: number | undefined;
            readonly firstName: string;
            readonly lastName: string;
            readonly dob?: string | null | undefined;
            readonly gender?: string | null | undefined;
            readonly center?: string | null | undefined;
            readonly email?: string | undefined;
            readonly phone?: string | undefined;
            readonly patientHash?: string | null | undefined;
            readonly comments?: string | undefined;
            readonly isRealPerson?: boolean | undefined;
            readonly pseudonymFirstName?: string | null | undefined;
            readonly pseudonymLastName?: string | null | undefined;
            readonly sensitiveMetaId?: number | null | undefined;
            readonly age?: number | null | undefined;
            readonly createdAt?: string | undefined;
            readonly updatedAt?: string | undefined;
        };
        readonly classifications?: readonly {
            readonly id: number;
            readonly finding: number;
            readonly classification: {
                readonly id: number;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
            };
            readonly classification_choice: {
                readonly id: number;
                readonly name: string;
            };
            readonly is_active: boolean;
            readonly subcategories?: {
                readonly [x: string]: any;
            } | undefined;
            readonly numerical_descriptors?: {
                readonly [x: string]: any;
            } | undefined;
        }[] | undefined;
    }[]>>;
    patientFindingsByCurrentPatient: import("vue").ComputedRef<{
        id: number;
        examination: string;
        createdAt: number;
        updatedAt: string;
        createdBy?: string | undefined;
        updatedBy?: string | undefined;
        finding: {
            id: number;
            name: string;
            nameDe?: string | undefined;
            description: string;
            examinations: string[];
            PatientExaminationId?: number | undefined;
            FindingClassifications: {
                id: number;
                name?: string | undefined;
                description?: string | undefined;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            findingTypes: string[];
            findingInterventions: string[];
        };
        patient: {
            id?: number | undefined;
            firstName: string;
            lastName: string;
            dob?: string | null | undefined;
            gender?: string | null | undefined;
            center?: string | null | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            patientHash?: string | null | undefined;
            comments?: string | undefined;
            isRealPerson?: boolean | undefined;
            pseudonymFirstName?: string | null | undefined;
            pseudonymLastName?: string | null | undefined;
            sensitiveMetaId?: number | null | undefined;
            age?: number | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
        };
        classifications?: {
            id: number;
            finding: number;
            classification: {
                id: number;
                name?: string | undefined;
                description?: string | undefined;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
            };
            classification_choice: {
                id: number;
                name: string;
            };
            is_active: boolean;
            subcategories?: Record<string, any> | undefined;
            numerical_descriptors?: Record<string, any> | undefined;
        }[] | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    currentPatientExaminationId: Readonly<import("vue").Ref<number | null, number | null>>;
    setCurrentPatientExaminationId: (id: number | null) => void;
    fetchPatientFindings: (patientExaminationId: number) => Promise<void>;
    createPatientFinding: (patientFindingData: {
        patientExamination: number;
        finding: number;
        classifications?: Array<{
            classification: number;
            choice: number;
        }>;
    }) => Promise<PatientFinding>;
    updatePatientFinding: (id: number, updateData: Partial<PatientFinding>) => Promise<PatientFinding>;
    deletePatientFinding: (id: number) => Promise<void>;
}, "setCurrentPatientExaminationId" | "fetchPatientFindings" | "createPatientFinding" | "updatePatientFinding" | "deletePatientFinding">>;
export { usePatientFindingStore };
