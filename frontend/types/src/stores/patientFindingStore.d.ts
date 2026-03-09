import type { Finding } from '@/stores/findingStore';
import type { Patient } from '@/stores/patientStore';
import { type ClassificationSelection, type PatientFindingRow } from '@/api/findingsApi';
interface PatientFinding extends Partial<PatientFindingRow> {
    id: number;
    examination?: string;
    createdAt?: number | string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
    finding: Finding | PatientFindingRow['finding'];
    patient?: Patient;
    classifications?: PatientFindingRow['classifications'];
    patientExamination?: number;
    patient_examination?: number;
    isActive?: boolean;
    is_active?: boolean;
}
declare const usePatientFindingStore: import("pinia").StoreDefinition<"patientFinding", Pick<{
    patientFindings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly examination?: string | undefined;
        readonly createdAt?: string | number | undefined;
        readonly updatedAt?: string | undefined;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: number | {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        } | {
            readonly id: number;
        };
        readonly patient?: {
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
        } | undefined;
        readonly classifications?: readonly (number | {
            readonly id?: number | undefined;
            readonly classification?: number | undefined;
            readonly classificationChoice?: number | undefined;
            readonly classificationId?: number | undefined;
            readonly classificationChoiceId?: number | undefined;
        })[] | undefined;
        readonly patientExamination?: number | undefined;
        readonly patient_examination?: number | undefined;
        readonly isActive?: boolean | undefined;
        readonly is_active?: boolean | undefined;
    }[], readonly {
        readonly id: number;
        readonly examination?: string | undefined;
        readonly createdAt?: string | number | undefined;
        readonly updatedAt?: string | undefined;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: number | {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        } | {
            readonly id: number;
        };
        readonly patient?: {
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
        } | undefined;
        readonly classifications?: readonly (number | {
            readonly id?: number | undefined;
            readonly classification?: number | undefined;
            readonly classificationChoice?: number | undefined;
            readonly classificationId?: number | undefined;
            readonly classificationChoiceId?: number | undefined;
        })[] | undefined;
        readonly patientExamination?: number | undefined;
        readonly patient_examination?: number | undefined;
        readonly isActive?: boolean | undefined;
        readonly is_active?: boolean | undefined;
    }[]>>;
    patientFindingsByCurrentPatient: import("vue").ComputedRef<{
        id: number;
        examination?: string | undefined;
        createdAt?: string | number | undefined;
        updatedAt?: string | undefined;
        createdBy?: string | undefined;
        updatedBy?: string | undefined;
        finding: number | {
            id: number;
            description: string;
            nameDe?: string | undefined;
            examinations: string[];
            PatientExaminationId?: number | undefined;
            FindingClassifications: {
                id: number;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
                name?: string | undefined;
                description?: string | undefined;
            }[];
            findingTypes: string[];
            findingInterventions: string[];
            name: string;
        } | {
            id: number;
        };
        patient?: {
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
        } | undefined;
        classifications?: (number | {
            id?: number | undefined;
            classification?: number | undefined;
            classificationChoice?: number | undefined;
            classificationId?: number | undefined;
            classificationChoiceId?: number | undefined;
        })[] | undefined;
        patientExamination?: number | undefined;
        patient_examination?: number | undefined;
        isActive?: boolean | undefined;
        is_active?: boolean | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    fetchPatientFindings: (patientExaminationId: number) => Promise<void>;
    createPatientFinding: (patientFindingData: {
        patient_examination?: number;
        patientExamination?: number;
        finding: number;
        classifications?: ClassificationSelection[];
    }) => Promise<PatientFinding>;
    updatePatientFinding: (id: number, updateData: Partial<PatientFinding>) => Promise<PatientFinding>;
    deletePatientFinding: (id: number) => Promise<void>;
}, "loading" | "error" | "patientFindings">, Pick<{
    patientFindings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly examination?: string | undefined;
        readonly createdAt?: string | number | undefined;
        readonly updatedAt?: string | undefined;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: number | {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        } | {
            readonly id: number;
        };
        readonly patient?: {
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
        } | undefined;
        readonly classifications?: readonly (number | {
            readonly id?: number | undefined;
            readonly classification?: number | undefined;
            readonly classificationChoice?: number | undefined;
            readonly classificationId?: number | undefined;
            readonly classificationChoiceId?: number | undefined;
        })[] | undefined;
        readonly patientExamination?: number | undefined;
        readonly patient_examination?: number | undefined;
        readonly isActive?: boolean | undefined;
        readonly is_active?: boolean | undefined;
    }[], readonly {
        readonly id: number;
        readonly examination?: string | undefined;
        readonly createdAt?: string | number | undefined;
        readonly updatedAt?: string | undefined;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: number | {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        } | {
            readonly id: number;
        };
        readonly patient?: {
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
        } | undefined;
        readonly classifications?: readonly (number | {
            readonly id?: number | undefined;
            readonly classification?: number | undefined;
            readonly classificationChoice?: number | undefined;
            readonly classificationId?: number | undefined;
            readonly classificationChoiceId?: number | undefined;
        })[] | undefined;
        readonly patientExamination?: number | undefined;
        readonly patient_examination?: number | undefined;
        readonly isActive?: boolean | undefined;
        readonly is_active?: boolean | undefined;
    }[]>>;
    patientFindingsByCurrentPatient: import("vue").ComputedRef<{
        id: number;
        examination?: string | undefined;
        createdAt?: string | number | undefined;
        updatedAt?: string | undefined;
        createdBy?: string | undefined;
        updatedBy?: string | undefined;
        finding: number | {
            id: number;
            description: string;
            nameDe?: string | undefined;
            examinations: string[];
            PatientExaminationId?: number | undefined;
            FindingClassifications: {
                id: number;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
                name?: string | undefined;
                description?: string | undefined;
            }[];
            findingTypes: string[];
            findingInterventions: string[];
            name: string;
        } | {
            id: number;
        };
        patient?: {
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
        } | undefined;
        classifications?: (number | {
            id?: number | undefined;
            classification?: number | undefined;
            classificationChoice?: number | undefined;
            classificationId?: number | undefined;
            classificationChoiceId?: number | undefined;
        })[] | undefined;
        patientExamination?: number | undefined;
        patient_examination?: number | undefined;
        isActive?: boolean | undefined;
        is_active?: boolean | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    fetchPatientFindings: (patientExaminationId: number) => Promise<void>;
    createPatientFinding: (patientFindingData: {
        patient_examination?: number;
        patientExamination?: number;
        finding: number;
        classifications?: ClassificationSelection[];
    }) => Promise<PatientFinding>;
    updatePatientFinding: (id: number, updateData: Partial<PatientFinding>) => Promise<PatientFinding>;
    deletePatientFinding: (id: number) => Promise<void>;
}, "patientFindingsByCurrentPatient">, Pick<{
    patientFindings: Readonly<import("vue").Ref<readonly {
        readonly id: number;
        readonly examination?: string | undefined;
        readonly createdAt?: string | number | undefined;
        readonly updatedAt?: string | undefined;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: number | {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        } | {
            readonly id: number;
        };
        readonly patient?: {
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
        } | undefined;
        readonly classifications?: readonly (number | {
            readonly id?: number | undefined;
            readonly classification?: number | undefined;
            readonly classificationChoice?: number | undefined;
            readonly classificationId?: number | undefined;
            readonly classificationChoiceId?: number | undefined;
        })[] | undefined;
        readonly patientExamination?: number | undefined;
        readonly patient_examination?: number | undefined;
        readonly isActive?: boolean | undefined;
        readonly is_active?: boolean | undefined;
    }[], readonly {
        readonly id: number;
        readonly examination?: string | undefined;
        readonly createdAt?: string | number | undefined;
        readonly updatedAt?: string | undefined;
        readonly createdBy?: string | undefined;
        readonly updatedBy?: string | undefined;
        readonly finding: number | {
            readonly id: number;
            readonly description: string;
            readonly nameDe?: string | undefined;
            readonly examinations: readonly string[];
            readonly PatientExaminationId?: number | undefined;
            readonly FindingClassifications: readonly {
                readonly id: number;
                readonly classificationType?: readonly string[] | undefined;
                readonly choices?: readonly {
                    readonly id: number;
                    readonly name: string;
                }[] | undefined;
                readonly required?: boolean | undefined;
                readonly name?: string | undefined;
                readonly description?: string | undefined;
            }[];
            readonly findingTypes: readonly string[];
            readonly findingInterventions: readonly string[];
            readonly name: string;
        } | {
            readonly id: number;
        };
        readonly patient?: {
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
        } | undefined;
        readonly classifications?: readonly (number | {
            readonly id?: number | undefined;
            readonly classification?: number | undefined;
            readonly classificationChoice?: number | undefined;
            readonly classificationId?: number | undefined;
            readonly classificationChoiceId?: number | undefined;
        })[] | undefined;
        readonly patientExamination?: number | undefined;
        readonly patient_examination?: number | undefined;
        readonly isActive?: boolean | undefined;
        readonly is_active?: boolean | undefined;
    }[]>>;
    patientFindingsByCurrentPatient: import("vue").ComputedRef<{
        id: number;
        examination?: string | undefined;
        createdAt?: string | number | undefined;
        updatedAt?: string | undefined;
        createdBy?: string | undefined;
        updatedBy?: string | undefined;
        finding: number | {
            id: number;
            description: string;
            nameDe?: string | undefined;
            examinations: string[];
            PatientExaminationId?: number | undefined;
            FindingClassifications: {
                id: number;
                classificationType?: string[] | undefined;
                choices?: {
                    id: number;
                    name: string;
                }[] | undefined;
                required?: boolean | undefined;
                name?: string | undefined;
                description?: string | undefined;
            }[];
            findingTypes: string[];
            findingInterventions: string[];
            name: string;
        } | {
            id: number;
        };
        patient?: {
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
        } | undefined;
        classifications?: (number | {
            id?: number | undefined;
            classification?: number | undefined;
            classificationChoice?: number | undefined;
            classificationId?: number | undefined;
            classificationChoiceId?: number | undefined;
        })[] | undefined;
        patientExamination?: number | undefined;
        patient_examination?: number | undefined;
        isActive?: boolean | undefined;
        is_active?: boolean | undefined;
    }[]>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    fetchPatientFindings: (patientExaminationId: number) => Promise<void>;
    createPatientFinding: (patientFindingData: {
        patient_examination?: number;
        patientExamination?: number;
        finding: number;
        classifications?: ClassificationSelection[];
    }) => Promise<PatientFinding>;
    updatePatientFinding: (id: number, updateData: Partial<PatientFinding>) => Promise<PatientFinding>;
    deletePatientFinding: (id: number) => Promise<void>;
}, "fetchPatientFindings" | "createPatientFinding" | "updatePatientFinding" | "deletePatientFinding">>;
export { usePatientFindingStore };
